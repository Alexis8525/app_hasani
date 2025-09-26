// controllers/auth.controller.ts
import { Request, Response } from 'express';
import { pool } from '../config/db';
import bcrypt from 'bcrypt';
import crypto from 'crypto';
import { UserModel } from '../models/user.models';
import { SessionModel } from '../models/session.model';
import { PasswordResetModel } from '../models/passwordReset.model';
import { generateOTP, generateTempToken, generateToken, extractJwtSignature } from '../helpers/security';
import { sendEmail, sendSMS } from '../helpers/notify';
import { AuthenticatedRequest } from '../middleware/auth.middleware';

export class AuthController {
  // Login 2FA
  static async login(req: Request, res: Response) {
    const { email, password, lat, lng, device_info, ip_address } = req.body;
    try {
      const user = await UserModel.findByEmailFull(email);
      if (!user) return res.status(401).json({ message: 'Credenciales inválidas' });

      const valid = await bcrypt.compare(password, user.password);
      if (!valid) return res.status(401).json({ message: 'Credenciales inválidas' });

      const previousSessions = await SessionModel.findActiveByUserId(user.id);
      if (previousSessions.length > 0) {
        console.log(`🔒 Invalidando ${previousSessions.length} sesiones anteriores`);
        await SessionModel.invalidateAll(user.id);
      }

      if (user.two_factor_enabled) {
        const otp = generateOTP(6);
        const offlinePin = generateOTP(6);
        const tempToken = generateTempToken({ id: user.id, type: '2fa' });
        
        await PasswordResetModel.create(user.id, tempToken, '2fa', otp, 5, lat, lng, offlinePin);

        // Notificaciones online
        try {
          if (user.email) {
            await sendEmail(user.email, 'Tu código 2FA', `
              <p>Tu código 2FA: <b>${otp}</b></p>
              <p>Token temporal: <b>${tempToken}</b></p>
              <p>Este código expira en 1 minuto</p>
            `);
          }
          if (user.phone) {
            await sendSMS(user.phone, `Tu código 2FA: ${otp}\nToken temporal: ${tempToken}`);
          }
        } catch (err) {
          console.warn('No se pudo enviar notificación online, el usuario usará el PIN offline');
        }
      
        return res.status(200).json({
          message: '2FA requerido',
          requires2fa: true,
          tempToken,
          offlinePin
        });
      }

      // Usuario sin 2FA - Crear sesión directamente
      const token = generateToken({ 
        id: user.id, 
        role: user.role,
        session_type: 'online'
      });

      const tokenIdentifier = extractJwtSignature(token);
      const now = new Date(); // UTC implícito
      const expiresAt = new Date(now.getTime() + 60 * 60 * 1000); // +1 hora

      const session = await SessionModel.create({
        user_id: user.id,
        token: token,
        token_identifier: tokenIdentifier,
        device_info: device_info || req.headers['user-agent'],
        ip_address: ip_address || req.ip,
        latitude: lat,
        longitude: lng,
        expires_at: expiresAt, // siempre después de created_at
        last_activity: now
      });

      return res.json({
        message: 'Login exitoso - Sesiones anteriores invalidadas',
        token,
        user: { id: user.id, email: user.email, role: user.role },
        session: {
          id: session.id,
          created_at: session.created_at,
          expires_at: session.expires_at
        },
        previous_sessions_invalidated: previousSessions.length
      });

    } catch (err: any) {
      console.error(err);
      res.status(500).json({ message: 'Error en login', error: err.message });
    }
  }

  // Verificar 2FA - CORREGIDO
  static async verify2FA(req: Request, res: Response) {
    const { tempToken, otp, device_info, ip_address, lat, lng } = req.body;
    try {
      console.log('TempToken recibido:', tempToken);
      console.log('OTP recibido:', otp);
  
      const reset = await PasswordResetModel.findValidByTokenAndOtp(tempToken, '2fa', String(otp).trim());
      if (!reset) return res.status(400).json({ message: 'Token o código 2FA inválido o expirado' });
  
      await PasswordResetModel.markUsed(reset.id);
  
      const userData = await UserModel.findById(reset.user_id);
      if (!userData || !userData.id) {
        return res.status(400).json({ message: 'Usuario no encontrado o ID inválido' });
      }

      // Generar token final y crear sesión
      const finalToken = generateToken({ 
        id: userData.id, 
        role: userData.role,
        session_type: 'online'
      });

      const tokenIdentifier = extractJwtSignature(finalToken);

      const now = new Date(); // UTC implícito
      const expiresAt = new Date(now.getTime() + 60 * 60 * 1000); // +1 hora

      const session = await SessionModel.create({
        user_id: userData.id, // Ahora userData.id está verificado
        token: finalToken,
        token_identifier: tokenIdentifier,
        device_info: device_info || req.headers['user-agent'],
        ip_address: ip_address || req.ip,
        latitude: lat,
        longitude: lng,
        expires_at: expiresAt, // siempre después de created_at
        last_activity: now
      });
      
      res.json({
        message: '2FA verificado',
        token: finalToken,
        user: { id: userData.id, email: userData.email, role: userData.role },
        session: {
          id: session.id,
          created_at: session.created_at,
          expires_at: session.expires_at
        }
      });
  
    } catch (err: any) {
      console.error(err);
      res.status(500).json({ message: 'Error verificando 2FA', error: err.message });
    }
  }

  // Verify Offline - CORREGIDO
  static async verifyOffline(req: Request, res: Response) {
    const { email, offlinePin, device_info, ip_address, lat, lng } = req.body;
  
    try {
      console.log('=== VERIFICACIÓN OFFLINE ===');
      console.log('Email:', email);
      console.log('PIN recibido:', offlinePin);
  
      if (!email || !offlinePin) {
        return res.status(400).json({ message: 'Email y PIN son requeridos' });
      }
  
      // Verificar PIN offline
      const reset = await PasswordResetModel.verifyOffline(email, offlinePin);
      if (!reset) {
        return res.status(400).json({ message: 'PIN offline inválido o expirado' });
      }
  
      // Marcar como usado
      await PasswordResetModel.markUsed(reset.id);
  
      // Obtener información del usuario
      const userData = await UserModel.findByEmail(email);
      if (!userData || !userData.id) {
        return res.status(400).json({ message: 'Usuario no encontrado o ID inválido' });
      }
  
      // Generar token de sesión offline
      const token = generateToken({ 
        id: userData.id, 
        role: userData.role,
        session_type: 'offline'
      });

      const tokenIdentifier = extractJwtSignature(token);

      const now = new Date(); // UTC implícito
      const expiresAt = new Date(now.getTime() + 60 * 60 * 1000); // +1 hora

      const session = await SessionModel.create({
        user_id: userData.id, // Ahora userData.id está verificado
        token: token,
        token_identifier: tokenIdentifier,
        device_info: device_info || req.headers['user-agent'],
        ip_address: ip_address || req.ip,
        latitude: lat,
        longitude: lng,
        expires_at: expiresAt, // siempre después de created_at
        last_activity: now
      });
  
      res.json({
        message: 'Login offline exitoso',
        token,
        user: { id: userData.id, email: userData.email, role: userData.role },
        session: {
          id: session.id,
          created_at: session.created_at,
          expires_at: session.expires_at,
          session_type: 'offline'
        }
      });
  
    } catch (err: any) {
      console.error('Error en verifyOffline:', err);
      res.status(500).json({ message: 'Error verificando PIN offline', error: err.message });
    }
  }

  // Resto de métodos sin cambios...
  static async requestPasswordReset(req: Request, res: Response) {
    const { email, via = 'email' } = req.body;
    try {
      const user = await UserModel.findByEmailFull(email);
      if (!user) return res.status(200).json({ message: 'Si existe la cuenta, se enviará un correo' });
  
      const tokenPlain = crypto.randomBytes(32).toString('hex');
      const otp = via === 'sms' ? generateOTP(6) : undefined;
  
      await PasswordResetModel.create(user.id, tokenPlain, 'reset', otp, 30);
      
      const resetLink = `${process.env.APP_URL}/auth/password-reset/confirm?token=${tokenPlain}`;
      if (via === 'email') {
        await sendEmail(user.email, 'Restablecer contraseña', `<p>Haz clic: <a href="${resetLink}">${resetLink}</a></p>`);
      } else if (via === 'sms' && user.phone) {
        await sendSMS(user.phone, `Código para restablecer: ${otp}`);
      }
  
      return res.json({ message: 'Si existe la cuenta, recibirás instrucciones para restablecer la contraseña' });
    } catch (err: any) {
      console.error(err);
      res.status(500).json({ message: 'Error solicitando restablecimiento', error: err.message });
    }
  }

  static async confirmPasswordReset(req: Request, res: Response) {
    const { token, newPassword } = req.body;
    try {
      if (!token) return res.status(400).json({ message: 'Falta el token' });
  
      const reset = await PasswordResetModel.findValidByToken(token, 'reset');
      if (!reset) return res.status(400).json({ message: 'Token inválido o expirado' });
  
      if (!UserModel.validatePasswordFormat(newPassword)) {
        return res.status(400).json({ message: 'Formato de contraseña inválido' });
      }
  
      const hashed = await bcrypt.hash(newPassword, 10);
      await pool.query('UPDATE users SET password=$1 WHERE id=$2', [hashed, reset.user_id]);
      await PasswordResetModel.markUsed(reset.id);
  
      return res.json({ message: 'Contraseña restablecida correctamente' });
    } catch (err: any) {
      console.error(err);
      res.status(500).json({ message: 'Error confirmando restablecimiento', error: err.message });
    }
  }

  static async recoverUsername(req: Request, res: Response) {
    const { emailOrPhone } = req.body;
    try {
      let userData = null;
      if (emailOrPhone.includes('@')) {
        userData = await UserModel.findByEmail(emailOrPhone);
      } else {
        const result = await pool.query('SELECT id, email, phone FROM users WHERE phone=$1 LIMIT 1', [emailOrPhone]);
        userData = result.rows[0];
      }

      if (!userData) return res.status(200).json({ message: 'Si existe, recibirás la información' });

      if (userData.email) {
        await sendEmail(userData.email, 'Recuperación de usuario', `<p>Tu usuario: <b>${userData.email}</b></p>`);
      }
      if (userData.phone) {
        await sendSMS(userData.phone, `Tu usuario: ${userData.email}`);
      }

      return res.json({ message: 'Si existe, recibirás la información' });
    } catch (err: any) {
      console.error(err);
      res.status(500).json({ message: 'Error recuperando usuario', error: err.message });
    }
  }

  // Métodos de gestión de sesiones
  static async logout(req: AuthenticatedRequest, res: Response) {
    try {
      const token = req.headers['authorization']?.split(' ')[1];
      
      if (token) {
        await SessionModel.invalidate(token);
      }

      res.json({ message: 'Sesión cerrada exitosamente' });
    } catch (err: any) {
      console.error(err);
      res.status(500).json({ message: 'Error cerrando sesión', error: err.message });
    }
  }

  static async getActiveSessions(req: AuthenticatedRequest, res: Response) {
    try {
      const sessions = await SessionModel.findActiveByUserId(req.user.id);
      
      const safeSessions = sessions.map(session => ({
        id: session.id,
        device_info: session.device_info,
        ip_address: session.ip_address,
        created_at: session.created_at,
        last_activity: session.last_activity,
        expires_at: session.expires_at,
        location: session.latitude && session.longitude ? {
          lat: session.latitude,
          lng: session.longitude
        } : null
      }));

      res.json({
        sessions: safeSessions,
        total: safeSessions.length
      });
    } catch (err: any) {
      console.error(err);
      res.status(500).json({ message: 'Error obteniendo sesiones', error: err.message });
    }
  }

  static async logoutOtherSessions(req: AuthenticatedRequest, res: Response) {
    try {
      const currentToken = req.headers['authorization']?.split(' ')[1];
      const sessions = await SessionModel.findActiveByUserId(req.user.id);

      for (const session of sessions) {
        if (session.token !== currentToken) {
          await SessionModel.invalidate(session.token);
        }
      }

      res.json({ message: 'Otras sesiones cerradas exitosamente' });
    } catch (err: any) {
      console.error(err);
      res.status(500).json({ message: 'Error cerrando otras sesiones', error: err.message });
    }
  }

  static async logoutSession(req: AuthenticatedRequest, res: Response) {
    try {
      const { sessionId } = req.params;
      const sessions = await SessionModel.findActiveByUserId(req.user.id);
      
      const sessionToLogout = sessions.find(s => s.id === parseInt(sessionId));
      
      if (!sessionToLogout) {
        return res.status(404).json({ message: 'Sesión no encontrada' });
      }

      await SessionModel.invalidate(sessionToLogout.token);
      res.json({ message: 'Sesión cerrada exitosamente' });
    } catch (err: any) {
      console.error(err);
      res.status(500).json({ message: 'Error cerrando sesión', error: err.message });
    }
  }

  static async refreshToken(req: AuthenticatedRequest, res: Response) {
    try {
      const oldToken = req.headers['authorization']?.split(' ')[1];
      
      if (!oldToken) {
        return res.status(400).json({ message: 'Token requerido' });
      }

      await SessionModel.invalidate(oldToken);

      const newToken = generateToken({ 
        id: req.user.id, 
        role: req.user.role,
        session_type: 'online'
      });

      const tokenIdentifier = extractJwtSignature(newToken);
      const now = new Date(); // UTC implícito
      const expiresAt = new Date(now.getTime() + 60 * 60 * 1000); // +1 hora

      const session = await SessionModel.create({
        user_id: req.user.id,
        token: newToken,
        token_identifier: tokenIdentifier,
        device_info: req.session?.device_info || req.headers['user-agent'],
        ip_address: req.session?.ip_address || req.ip,
        latitude: req.session?.latitude,
        longitude: req.session?.longitude,
        expires_at: expiresAt, // siempre después de created_at
        last_activity: now
      });

      res.json({
        message: 'Token renovado',
        token: newToken,
        expires_at: session.expires_at
      });
    } catch (err: any) {
      console.error(err);
      res.status(500).json({ message: 'Error renovando token', error: err.message });
    }
  }
}
