// models/user.models.ts
import { pool } from '../config/db';
import bcrypt from 'bcrypt';
import QRCode from 'qrcode';
import speakeasy from 'speakeasy';

export interface IUser {
  id?: number;
  email: string;
  password: string;
  created_at?: Date;
  role?: string;
  phone?: string | null;
  two_factor_enabled?: boolean;
  offline_pin_secret?: string;
}

export class UserModel {
  static allowedDomains = ['gmail.com', 'outlook.com', 'yahoo.com'];

  static validateEmail(email: string): { valid: boolean; message?: string } {
    if (!email) return { valid: false, message: 'El correo electrónico es obligatorio' };
    
    const regex = /^[\w-\.]+@([\w-]+\.)+[\w-]{2,4}$/;
    if (!regex.test(email)) return { valid: false, message: 'Formato de correo inválido' };

    const domain = email.split('@')[1];
    if (!this.allowedDomains.includes(domain)) 
      return { valid: false, message: `Dominio no permitido. Solo se aceptan: ${this.allowedDomains.join(', ')}` };

    return { valid: true };
  }

  static validatePhone(phone: string): { valid: boolean; message?: string } {
    if (!phone) return { valid: false, message: 'El teléfono es obligatorio' };
    const re = /^[0-9]{10,15}$/;
    if (!re.test(phone)) return { valid: false, message: 'Teléfono inválido. Debe tener entre 10 y 15 dígitos' };
    return { valid: true };
  }

  // Crear usuario
  static async create(email: string, password: string, role: string, phone: string): Promise<{user: IUser, offlinePin: string, qrCodeUrl: string}> {
    if (!email || !password || !role || !phone) {
      throw new Error('Email, contraseña, rol y teléfono son obligatorios');
    }

    if (!this.validateEmail(email)) {
      throw new Error('Correo electrónico inválido o dominio no permitido');
    }

    const existing = await this.findByEmail(email);
    if (existing) throw new Error('El correo ya existe');

    if (!this.validatePasswordFormat(password)) {
      throw new Error('Contraseña inválida. Debe tener al menos 8 caracteres, una mayúscula, un número y un símbolo.');
    }

    if (!this.validatePhone(phone)) {
      throw new Error('Teléfono inválido');
    }

    // Generar PIN offline seguro (6 dígitos)
    const offlinePin = this.generateOfflinePin();
    
    // Generar secreto para TOTP
    const secret = speakeasy.generateSecret({
      name: `OfflineAuth (${email})`,
      length: 20
    });

    const hashedPassword = await bcrypt.hash(password, 10);

    // Insertar usuario
    const result = await pool.query(
      'INSERT INTO users (email, password, role, phone, offline_pin_secret) VALUES ($1, $2, $3, $4, $5) RETURNING id, email, role, phone, created_at',
      [email, hashedPassword, role, phone, secret.base32]
    );

    const user = result.rows[0];

    // Generar QR Code con el PIN offline
    const qrCodeData = {
      userId: user.id,
      email: user.email,
      offlinePin: offlinePin,
      type: 'offline_auth',
      generatedAt: new Date().toISOString()
    };

    const qrCodeUrl = await QRCode.toDataURL(JSON.stringify(qrCodeData));

    // Guardar el PIN offline en password_resets para acceso inmediato
    await pool.query(
      `INSERT INTO password_resets (user_id, token, type, offline_pin, expires_at) 
       VALUES ($1, $2, $3, $4, $5)`,
      [user.id, 'initial_setup', 'offline_setup', offlinePin, new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)]
    );

    return {
      user: user,
      offlinePin: offlinePin,
      qrCodeUrl: qrCodeUrl
    };
  }

  static generateOfflinePin(): string {
    return Math.floor(100000 + Math.random() * 900000).toString();
  }

  // ✅ MANTÉN SOLO UNA VERSIÓN de validateOfflinePin
  static async validateOfflinePin(userId: number, pin: string): Promise<boolean> {
    const result = await pool.query(
      `SELECT * FROM password_resets 
       WHERE user_id=$1 AND offline_pin=$2 AND type='offline_setup' 
       AND used=false AND expires_at > NOW()`,
      [userId, pin]
    );
    return result.rows.length > 0;
  }
  static validatePasswordFormat(password: string): { valid: boolean; message?: string } {
    if (!password) return { valid: false, message: 'La contraseña es obligatoria' };
    const re = /^(?=.*[A-Z])(?=.*\d)(?=.*[!@#$%^&*()_+[\]{};':"\\|,.<>/?]).{8,}$/;
    if (!re.test(password))
      return { 
        valid: false, 
        message: 'Contraseña inválida. Debe tener al menos 8 caracteres, una mayúscula, un número y un símbolo especial.' 
      };
    return { valid: true };
  }

  static async getUsuarios(): Promise<IUser[]> {
    const result = await pool.query('SELECT id, email, created_at FROM users ORDER BY id ASC');
    return result.rows;
  }

  static async findByEmail(email: string): Promise<IUser | null> {
    const result = await pool.query('SELECT * FROM users WHERE email = $1', [email]);
    return result.rows[0] || null;
  }

  static async updateUsuarioByEmail(
    email: string,
    data: { newEmail?: string; role?: string; password?: string; phone?: string }
  ): Promise<IUser | null> {
    const user = await this.findByEmail(email);
    if (!user) return null;
  
    if (data.newEmail) {
      if (!this.validateEmail(data.newEmail)) {
        throw new Error('Correo electrónico inválido o dominio no permitido');
      }
      const existing = await this.findByEmail(data.newEmail);
      if (existing && existing.id !== user.id) {
        throw new Error('El correo ya existe');
      }
    }
  
    if (data.phone && !this.validatePhone(data.phone)) {
      throw new Error('Teléfono inválido');
    }
  
    if (data.password && !this.validatePasswordFormat(data.password)) {
      throw new Error('Contraseña inválida. Debe tener al menos 8 caracteres, una mayúscula, un número y un símbolo.');
    }
  
    const hashedPassword = data.password ? await bcrypt.hash(data.password, 10) : undefined;
  
    const result = await pool.query(
      `UPDATE users
       SET 
         email = COALESCE($1, email),
         role = COALESCE($2, role),
         password = COALESCE($3, password),
         phone = COALESCE($4, phone)
       WHERE email = $5
       RETURNING id, email, role, phone, created_at`,
      [data.newEmail, data.role, hashedPassword, data.phone, email]
    );
  
    return result.rows[0] || null;
  }

  static async deleteUsuarioByEmail(email: string): Promise<boolean> {
    const result = await pool.query('DELETE FROM users WHERE email = $1', [email]);
    return (result.rowCount ?? 0) > 0;
  }

  static async validatePassword(email: string, password: string): Promise<IUser | null> {
    const user = await this.findByEmail(email);
    if (!user) return null;

    const valid = await bcrypt.compare(password, user.password);
    return valid ? user : null;
  }

  static async findById(id: number): Promise<IUser | null> {
    const result = await pool.query(
      'SELECT id, email, role, phone, created_at, two_factor_enabled FROM users WHERE id=$1', 
      [id]
    );
    return result.rows[0] || null;
  }

  static async findByEmailFull(email: string): Promise<any | null> {
    const result = await pool.query('SELECT * FROM users WHERE email = $1', [email]);
    return result.rows[0] || null;
  }

  // ✅ AÑADE estas nuevas validaciones (sin duplicar)
  static validateRole(role: string): { valid: boolean; message?: string } {
    const validRoles = ['admin', 'user', 'editor', 'lector'];
    if (!validRoles.includes(role)) return { valid: false, message: `Rol inválido. Debe ser uno de: ${validRoles.join(', ')}` };
    return { valid: true };
  }

  static validateOTP(otp: string): { valid: boolean; message?: string } {
    const re = /^\d{6}$/;
    if (!re.test(otp)) return { valid: false, message: 'OTP inválido. Debe tener 6 dígitos' };
    return { valid: true };
  }

  static validateToken(token: string): { valid: boolean; message?: string } {
    if (!token || token.length <= 10) return { valid: false, message: 'Token inválido o muy corto' };
    return { valid: true };
  }

  static validateCoordinates(lat: number, lng: number): { valid: boolean; message?: string } {
    if (typeof lat !== 'number' || typeof lng !== 'number') return { valid: false, message: 'Coordenadas deben ser números' };
    if (lat < -90 || lat > 90 || lng < -180 || lng > 180) return { valid: false, message: 'Coordenadas fuera de rango' };
    return { valid: true };
  }

  static validatePinFormat(pin: string): { valid: boolean; message?: string } {
    const re = /^\d{6}$/;
    if (!re.test(pin)) return { valid: false, message: 'PIN inválido. Debe tener 6 dígitos' };
    return { valid: true };
  }
}