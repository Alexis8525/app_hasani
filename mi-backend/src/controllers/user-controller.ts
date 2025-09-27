import { Request, Response } from 'express';
import { UserModel } from '../models/user.models';
import { sendEmail } from '../helpers/notify';
import QRCode from 'qrcode';
import { pool } from '../config/db';


export class UserController {
  // static async login(req: Request, res: Response) {
  //   const { email, password } = req.body;
  //   try {
  //     console.log("📩 Login request:", req.body);
  
  //     // Validar email
  //     if (!UserModel.validateEmail(email)) {
  //       return res.status(400).json({ message: 'Correo electrónico inválido' });
  //     }
  
  //     // Buscar usuario
  //     const user = await UserModel.findByEmail(email);
  //     console.log("👤 Usuario encontrado:", user);
  
  //     if (!user) return res.status(401).json({ message: 'Credenciales inválidas' });
  
  //     // Comparar contraseña
  //     const valid = await bcrypt.compare(password, user.password);
  //     console.log("🔑 Contraseña válida?", valid);
  
  //     if (!valid) return res.status(401).json({ message: 'Credenciales inválidas' });
  
  //     res.status(200).json({ message: 'Login exitoso', user });
  //   } catch (error: any) {
  //     console.error("❌ Error en login:", error);
  //     res.status(500).json({ message: 'Error al iniciar sesión', error: error.message });
  //   }
  // }  

  static async crearUsuario(req: Request, res: Response) {
    const { email, password, role, phone } = req.body;
    try {
      console.log("📩 Datos recibidos:", req.body);

      if (!email || !password || !role || !phone) {
        return res.status(400).json({ message: 'Email, password, role y phone son obligatorios' });
      }

      if (!UserModel.validateEmail(email)) {
        return res.status(400).json({ message: 'Correo electrónico inválido' });
      }

      if (!UserModel.validatePasswordFormat(password)) {
        return res.status(400).json({
          message: 'Contraseña inválida. Debe tener al menos 8 caracteres, una mayúscula, un número y un símbolo especial.'
        });
      }

      if (!UserModel.validatePhone(phone)) {
        return res.status(400).json({ message: 'Teléfono inválido' });
      }

      const existingUser = await UserModel.findByEmail(email);
      if (existingUser) {
        return res.status(400).json({ message: 'Usuario ya registrado' });
      }

      // Crear usuario con PIN offline y QR
      const { user, offlinePin, qrCodeUrl } = await UserModel.create(email, password, role, phone);

      // Enviar email con el PIN y QR
      await sendEmail(
        email, 
        'Bienvenido - Tu PIN Offline', 
        `
        <h2>Bienvenido ${email}</h2>
        <p>Tu PIN offline para autenticación sin internet es: <strong>${offlinePin}</strong></p>
        <p>Este PIN expira en 30 días. Guárdalo en un lugar seguro.</p>
        <p>También puedes escanear el código QR adjunto para guardar tu información de acceso offline.</p>
        <img src="${qrCodeUrl}" alt="QR Code para acceso offline" style="max-width: 200px;">
        `
      );

      res.status(201).json({ 
        message: 'Usuario registrado exitosamente', 
        user: {
          id: user.id,
          email: user.email,
          role: user.role,
          phone: user.phone
        },
        offlinePin: offlinePin, // Solo para desarrollo, en producción quitar
        qrCodeUrl: qrCodeUrl    // Solo para desarrollo, en producción quitar
      });
    } catch (error: any) {
      console.error("❌ Error en crearUsuario:", error.message);
      res.status(500).json({ message: 'Error al registrar usuario', error: error.message });
    }
  }

  static async regenerateOfflinePin(req: Request, res: Response) {
    const { email } = req.body;
    try {
      const user = await UserModel.findByEmail(email);
      if (!user) {
        return res.status(404).json({ message: 'Usuario no encontrado' });
      }

      const newPin = UserModel.generateOfflinePin();
      
      // Actualizar en la base de datos
      await pool.query(
        `UPDATE password_resets SET used=true WHERE user_id=$1 AND type='offline_setup'`,
        [user.id]
      );

      await pool.query(
        `INSERT INTO password_resets (user_id, token, type, offline_pin, expires_at) 
         VALUES ($1, $2, $3, $4, $5)`,
        [user.id, 'regenerated', 'offline_setup', newPin, new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)]
      );

      const qrCodeData = {
        userId: user.id,
        email: user.email,
        offlinePin: newPin,
        type: 'offline_auth_regenerated',
        generatedAt: new Date().toISOString()
      };

      const qrCodeUrl = await QRCode.toDataURL(JSON.stringify(qrCodeData));

      res.json({
        message: 'PIN offline regenerado exitosamente',
        offlinePin: newPin,
        qrCodeUrl: qrCodeUrl,
        expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)
      });

    } catch (error: any) {
      res.status(500).json({ message: 'Error regenerando PIN offline', error: error.message });
    }
  }
  
  static async generateOfflinePinForExistingUser(req: Request, res: Response) {
    const { email } = req.body;
    
    try {
      console.log("📧 Generando PIN offline para:", email);

      // Buscar usuario existente
      const user = await UserModel.findByEmail(email);
      if (!user) {
        return res.status(404).json({ 
          code: 1, 
          message: 'Usuario no encontrado' 
        });
      }

      // Verificar si el usuario ya tiene un PIN activo
      const existingPin = await pool.query(
        `SELECT * FROM password_resets 
         WHERE user_id=$1 AND type='offline_setup' AND used=false AND expires_at > NOW()`,
        [user.id]
      );

      if (existingPin.rows.length > 0) {
        return res.status(400).json({
          code: 1,
          message: 'El usuario ya tiene un PIN offline activo',
          existingPin: {
            pin: existingPin.rows[0].offline_pin,
            expiresAt: existingPin.rows[0].expires_at
          }
        });
      }

      // Generar nuevo PIN offline
      const newPin = UserModel.generateOfflinePin();

      // Generar QR Code
      const qrCodeData = {
        userId: user.id,
        email: user.email,
        offlinePin: newPin,
        type: 'offline_auth_existing',
        generatedAt: new Date().toISOString()
      };

      const qrCodeUrl = await QRCode.toDataURL(JSON.stringify(qrCodeData));

      // Guardar en password_resets
      await pool.query(
        `INSERT INTO password_resets (user_id, token, type, offline_pin, expires_at) 
         VALUES ($1, $2, $3, $4, $5)`,
        [user.id, 'existing_user_setup', 'offline_setup', newPin, new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)]
      );

      // Enviar email con el nuevo PIN
      await sendEmail(
        user.email, 
        'Nuevo PIN Offline Generado', 
        `
        <h2>Hola ${user.email}</h2>
        <p>Se ha generado un nuevo PIN offline para tu cuenta:</p>
        <p><strong>PIN: ${newPin}</strong></p>
        <p>Este PIN expira en 30 días. Guárdalo en un lugar seguro.</p>
        <p>Puedes escanear el código QR para guardar tu información de acceso offline.</p>
        <img src="${qrCodeUrl}" alt="QR Code para acceso offline" style="max-width: 200px;">
        <p><em>Si no solicitaste este PIN, por favor contacta al administrador.</em></p>
        `
      );

      res.json({
        code: 0,
        message: 'PIN offline generado exitosamente para el usuario existente',
        user: {
          id: user.id,
          email: user.email,
          role: user.role
        },
        offlinePin: newPin,
        qrCodeUrl: qrCodeUrl,  // ← Esto devuelve el QR code
        expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)
      });

    } catch (error: any) {
      console.error("❌ Error generando PIN offline:", error);
      res.status(500).json({ 
        code: 1, 
        message: 'Error generando PIN offline', 
        error: error.message 
      });
    }
  }

  static async getActiveOfflinePins(req: Request, res: Response) {
    const { email } = req.params;
    
    try {
      const user = await UserModel.findByEmail(email);
      if (!user) {
        return res.status(404).json({ code: 1, message: 'Usuario no encontrado' });
      }

      const activePins = await pool.query(
        `SELECT offline_pin, created_at, expires_at 
         FROM password_resets 
         WHERE user_id=$1 AND type='offline_setup' AND used=false AND expires_at > NOW() 
         ORDER BY created_at DESC`,
        [user.id]
      );

      res.json({
        code: 0,
        message: 'PINs offline activos',
        user: {
          id: user.id,
          email: user.email
        },
        activePins: activePins.rows,
        totalActive: activePins.rows.length
      });

    } catch (error: any) {
      res.status(500).json({ 
        code: 1, 
        message: 'Error obteniendo PINs activos', 
        error: error.message 
      });
    }
  }

  static async getQrCodeForPin(req: Request, res: Response) {
    const { email, pin } = req.query;
    
    try {
      const user = await UserModel.findByEmail(email as string);
      if (!user) {
        return res.status(404).json({ message: 'Usuario no encontrado' });
      }
  
      const qrCodeData = {
        userId: user.id,
        email: user.email,
        offlinePin: pin,
        type: 'offline_auth',
        generatedAt: new Date().toISOString()
      };
  
      const qrCodeUrl = await QRCode.toDataURL(JSON.stringify(qrCodeData));
      
      // Devolver como imagen o como data URL
      res.json({
        qrCodeUrl: qrCodeUrl,
        qrCodeData: qrCodeData
      });
  
    } catch (error: any) {
      res.status(500).json({ message: 'Error generando QR code', error: error.message });
    }
  }
  

  // Método para revocar (invalidar) un PIN offline
  static async revokeOfflinePin(req: Request, res: Response) {
    const { email, pin } = req.body;
    
    try {
      const user = await UserModel.findByEmail(email);
      if (!user) {
        return res.status(404).json({ code: 1, message: 'Usuario no encontrado' });
      }

      const result = await pool.query(
        `UPDATE password_resets 
         SET used=true 
         WHERE user_id=$1 AND offline_pin=$2 AND type='offline_setup' AND used=false
         RETURNING *`,
        [user.id, pin]
      );

      if (result.rows.length === 0) {
        return res.status(404).json({ 
          code: 1, 
          message: 'PIN no encontrado o ya está revocado' 
        });
      }

      res.json({
        code: 0,
        message: 'PIN offline revocado exitosamente',
        revokedPin: result.rows[0].offline_pin
      });

    } catch (error: any) {
      res.status(500).json({ 
        code: 1, 
        message: 'Error revocando PIN offline', 
        error: error.message 
      });
    }
  }

  static async updateUsuario(req: Request, res: Response) {
    const { email } = req.params; // ahora pasamos email en URL
    const { newEmail, role, password, phone } = req.body;
  
    try {
      const user = await UserModel.updateUsuarioByEmail(email, { newEmail, role, password, phone });
  
      if (!user) return res.status(404).json({ code: 1, message: 'Usuario no encontrado'});
  
      res.json({ code: 0, message: 'Usuario actualizado', user });
    } catch (error: any) {
      res.status(500).json({ code: 1, message: 'Error al actualizar usuario', error: error.message });
    }
  } 
  
  static async getUsuarios(req: Request, res: Response) {
    try {
      const usuarios = await UserModel.getUsuarios();
      res.json(usuarios);
    } catch (error: any) {
      res.status(500).json({ message: "Error al obtener usuarios", error: error.message });
    }
  }

  static async deleteUsuario(req: Request, res: Response) {
    const { email } = req.params;
  
    try {
      const deleted = await UserModel.deleteUsuarioByEmail(email);
      if (!deleted) return res.status(404).json({ code: 1, message: 'Usuario no encontrado' });
      res.json({ code: 0, message: 'Usuario eliminado' });
    } catch (error: any) {
      res.status(500).json({ code: 1, message: 'Error al eliminar usuario', error: error.message });
    }
  }
  
}
