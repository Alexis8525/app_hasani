import { pool } from '../config/db';
import bcrypt from 'bcrypt';

export interface IUser {
  id?: number;
  email: string;
  password: string;
  created_at?: Date;
  role?: string;
  phone?: string | null;
  two_factor_enabled?: boolean;
}

export class UserModel {
  static allowedDomains = ['gmail.com', 'outlook.com', 'yahoo.com', 'example.com'];

  static validateEmail(email: string): boolean {
    const regex = /^[\w-\.]+@([\w-]+\.)+[\w-]{2,4}$/;
    if (!regex.test(email)) return false;

    const domain = email.split('@')[1];
    return this.allowedDomains.includes(domain);
  }

  static validatePhone(phone: string): boolean {
    const re = /^[0-9]{10,15}$/; // solo números, entre 10 y 15 dígitos
    return re.test(phone);
  }
  
  // Crear usuario
  static async create(email: string, password: string, role: string, phone: string): Promise<IUser> {
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
  
    const hashedPassword = await bcrypt.hash(password, 10);
  
    const result = await pool.query(
      'INSERT INTO users (email, password, role, phone) VALUES ($1, $2, $3, $4) RETURNING id, email, role, phone, created_at',
      [email, hashedPassword, role, phone]
    );
  
    return result.rows[0];
  }  

  // Validar contraseña
  static validatePasswordFormat(password: string): boolean {
    const re = /^(?=.*[A-Z])(?=.*\d)(?=.*[!@#$%^&*()_+[\]{};':"\\|,.<>/?]).{8,}$/;
    return re.test(password);
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
    return (result.rowCount ?? 0) > 0; // <-- corregido
  }
  
  static async validatePassword(email: string, password: string): Promise<IUser | null> {
    const user = await this.findByEmail(email);
    if (!user) return null;

    const valid = await bcrypt.compare(password, user.password);
    return valid ? user : null;
  }

  static async findById(id: number): Promise<IUser | null> {
    const result = await pool.query('SELECT id, email, role, phone, created_at, two_factor_enabled FROM users WHERE id=$1', [id]);
    return result.rows[0] || null;
  }
  
  static async findByEmailFull(email: string): Promise<any | null> {
    const result = await pool.query('SELECT * FROM users WHERE email = $1', [email]);
    return result.rows[0] || null;
  }
}
