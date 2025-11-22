// controllers/auth.controller.ts
import { Request, Response } from 'express';
import { pool } from '../config/db';
import bcrypt from 'bcrypt';
import crypto from 'crypto';
import { UserModel } from '../models/user-models';
import { SessionModel } from '../models/session-model';
import { PasswordResetModel } from '../models/passwordReset-model';
import {
  generateOTP,
  generateTempToken,
  generateToken,
  extractJwtSignature,
} from '../helpers/security';
import { sendEmail, sendSMS } from '../helpers/notify';
import { AuthenticatedRequest } from '../middleware/auth.middleware';

export class AuthController {

  // ======================================================
  //                  LOGIN NORMAL / 2FA
  // ======================================================
  static async login(req: Request, res: Response) {
    const { email, password, lat, lng, device_info, ip_address } = req.body;

    try {
      const user = await UserModel.findByEmailFull(email);
      if (!user) return res.status(401).json({ message: 'Credenciales inválidas' });

      const valid = await bcrypt.compare(password, user.password);
      if (!valid) return res.status(401).json({ message: 'Credenciales inválidas' });

      // Revisar si ya tiene una sesión activa
      const activeSessions = await SessionModel.findActiveByUserId(user.id);
      if (activeSessions.length > 0) {
        return res.status(409).json({
          message: 'Ya hay una sesión activa. Cierra la sesión actual antes de iniciar otra.',
          code: 'ACTIVE_SESSION_EXISTS',
          existing_session: activeSessions[0],
        });
      }

      // Si tiene 2FA activado → enviar códigos
      if (user.two_factor_enabled) {
        const otp = generateOTP(6);
        const offlinePin = generateOTP(6);
        const tempToken = generateTempToken({ id: user.id, type: '2fa' });

        await PasswordResetModel.create(user.id, tempToken, '2fa', otp, 5, lat, lng, offlinePin);

        try {
          if (user.email) {
            await sendEmail(
              user.email,
              'Tu código 2FA',
              `<p>Tu código 2FA es <b>${otp}</b></p>`
            );
          }

          if (user.phone) {
            await sendSMS(user.phone, `Código 2FA: ${otp}`);
          }

        } catch (err) {
          console.warn('⚠ No se pudo enviar el 2FA vía email o SMS');
        }

        return res.json({
          message: '2FA requerido',
          requires2fa: true,
          tempToken,
          offlinePin,
        });
      }

      // Login SIN 2FA
      const token = generateToken({
        id: user.id,
        role: user.role,
        session_type: 'online',
      });

      const tokenIdentifier = extractJwtSignature(token);

      const session = await SessionModel.create({
        user_id: user.id,
        token,
        token_identifier: tokenIdentifier,
        device_info: device_info || req.headers['user-agent'],
        ip_address: ip_address || req.ip,
        latitude: lat,
        longitude: lng,
        expires_at: new Date(Date.now() + 60 * 60 * 1000),
        last_activity: new Date(),
      });

      return res.json({
        message: 'Login exitoso',
        token,
        user: { id: user.id, email: user.email, role: user.role },
        session,
      });

    } catch (err: any) {
      console.error(err);
      res.status(500).json({ message: 'Error en login', error: err.message });
    }
  }


  // ======================================================
  //                      VERIFICAR 2FA
  // ======================================================
  static async verify2FA(req: Request, res: Response) {
    const { tempToken, otp, device_info, ip_address, lat, lng } = req.body;

    try {
      const reset = await PasswordResetModel.findValidByTokenAndOtp(
        tempToken,
        '2fa',
        String(otp).trim()
      );

      if (!reset)
        return res.status(400).json({ message: 'Código 2FA inválido o expirado' });

      await PasswordResetModel.markUsed(reset.id);

      const userData = await UserModel.findById(reset.user_id);
      if (!userData) return res.status(400).json({ message: 'Usuario no encontrado' });

      const finalToken = generateToken({
        id: userData.id,
        role: userData.role,
        session_type: 'online',
      });

      const tokenIdentifier = extractJwtSignature(finalToken);

      const now = new Date();
      const expiresAt = new Date(now.getTime() + 60 * 60 * 1000);

      const session = await SessionModel.create({
        user_id: userData.id,
        token: finalToken,
        token_identifier: tokenIdentifier,
        device_info: device_info || req.headers['user-agent'],
        ip_address: ip_address || req.ip,
        latitude: lat,
        longitude: lng,
        expires_at: expiresAt,
        last_activity: now,
      });

      res.json({
        message: '2FA verificado',
        token: finalToken,
        user: userData,
        session,
      });

    } catch (err: any) {
      console.error(err);
      res.status(500).json({ message: 'Error verificando 2FA', error: err.message });
    }
  }


  // ======================================================
  //                 LOGIN OFFLINE (PIN)
  // ======================================================
  static async verifyOffline(req: Request, res: Response) {
    const { email, offlinePin, device_info, ip_address, lat, lng } = req.body;

    try {
      const reset = await PasswordResetModel.verifyOffline(email, offlinePin);
      if (!reset) {
        return res.status(400).json({ message: 'PIN inválido o expirado' });
      }

      await PasswordResetModel.markUsed(reset.id);

      const userData = await UserModel.findByEmail(email);
      if (!userData) return res.status(400).json({ message: 'Usuario no encontrado' });

      const token = generateToken({
        id: userData.id,
        role: userData.role,
        session_type: 'offline',
      });

      const tokenIdentifier = extractJwtSignature(token);

      const now = new Date();
      const expiresAt = new Date(now.getTime() + 60 * 60 * 1000);

      const session = await SessionModel.create({
        user_id: userData.id,
        token,
        token_identifier: tokenIdentifier,
        device_info: device_info || req.headers['user-agent'],
        ip_address: ip_address || req.ip,
        latitude: lat,
        longitude: lng,
        expires_at: expiresAt,
        last_activity: now,
      });

      res.json({
        message: 'Login offline exitoso',
        token,
        user: userData,
        session,
      });

    } catch (err: any) {
      console.error(err);
      res.status(500).json({ message: 'Error en login offline', error: err.message });
    }
  }


  // ======================================================
  //               PASSWORD RESET - REQUEST
  // ======================================================
  static async requestPasswordReset(req: Request, res: Response) {
    const { email, via = 'email' } = req.body;

    try {
      const user = await UserModel.findByEmailFull(email);

      if (!user)
        return res.status(200).json({ message: 'Si existe, se enviará un correo' });

      const tokenPlain = crypto.randomBytes(32).toString('hex');
      const otp = via === 'sms' ? generateOTP(6) : undefined;

      await PasswordResetModel.create(user.id, tokenPlain, 'reset', otp, 30);

      const resetLink = `${process.env.APP_URL}/auth/password-reset/confirm?token=${tokenPlain}`;

      if (via === 'email') {
        await sendEmail(
          user.email,
          'Restablecer contraseña',
          `<p>Token: <b>${tokenPlain}</b></p>`
        );
      } else if (via === 'sms' && user.phone) {
        await sendSMS(user.phone, `Código para restablecer: ${otp}`);
      }

      res.json({ message: 'Revisa tu bandeja para continuar' });

    } catch (err: any) {
      console.error(err);
      res.status(500).json({ message: 'Error en reset request', error: err.message });
    }
  }


  // ======================================================
  //                 PASSWORD RESET - CONFIRM
  // ======================================================
  static async confirmPasswordReset(req: Request, res: Response) {
    const { token, newPassword } = req.body;

    try {
      const reset = await PasswordResetModel.findValidByToken(token, 'reset');
      if (!reset) return res.status(400).json({ message: 'Token inválido' });

      const hashed = await bcrypt.hash(newPassword, 10);

      await pool.query('UPDATE users SET password=$1 WHERE id=$2', [hashed, reset.user_id]);

      await PasswordResetModel.markUsed(reset.id);

      res.json({ message: 'Contraseña restablecida correctamente' });

    } catch (err: any) {
      console.error(err);
      res.status(500).json({ message: 'Error confirmando contraseña', error: err.message });
    }
  }


  // ======================================================
  //                RECUPERAR USUARIO
  // ======================================================
  static async recoverUsername(req: Request, res: Response) {
    const { emailOrPhone } = req.body;

    try {
      let userData = null;

      if (emailOrPhone.includes('@')) {
        userData = await UserModel.findByEmail(emailOrPhone);
      } else {
        const result = await pool.query(
          'SELECT id, email, phone FROM users WHERE phone=$1 LIMIT 1',
          [emailOrPhone]
        );
        userData = result.rows[0];
      }

      if (!userData)
        return res.status(200).json({ message: 'Si existe, recibirás la información' });

      if (userData.email) {
        await sendEmail(
          userData.email,
          'Recuperación de usuario',
          `<p>Tu usuario es <b>${userData.email}</b></p>`
        );
      }

      if (userData.phone) {
        await sendSMS(userData.phone, `Tu usuario es: ${userData.email}`);
      }

      res.json({ message: 'Información enviada si la cuenta existe' });

    } catch (err: any) {
      console.error(err);
      res.status(500).json({ message: 'Error recuperando usuario', error: err.message });
    }
  }


  // ======================================================
  //                       LOGOUT
  // ======================================================
  static async logout(req: AuthenticatedRequest, res: Response) {
    try {
      const token = req.headers['authorization']?.split(' ')[1];

      if (token) {
        await SessionModel.invalidate(token);
      }

      res.json({ message: 'Sesión cerrada' });

    } catch (err: any) {
      console.error(err);
      res.status(500).json({ message: 'Error cerrando sesión', error: err.message });
    }
  }


  // ======================================================
  //               LISTAR SESIONES ACTIVAS
  // ======================================================
  static async getActiveSessions(req: AuthenticatedRequest, res: Response) {
    try {
      const sessions = await SessionModel.findActiveByUserId(req.user.id);

      res.json({
        sessions,
        total: sessions.length,
      });

    } catch (err: any) {
      console.error(err);
      res.status(500).json({ message: 'Error obteniendo sesiones', error: err.message });
    }
  }


  // ======================================================
  //              CERRAR OTRAS SESIONES
  // ======================================================
  static async logoutOtherSessions(req: AuthenticatedRequest, res: Response) {
    try {
      const currentToken = req.headers['authorization']?.split(' ')[1];

      const sessions = await SessionModel.findActiveByUserId(req.user.id);

      for (const s of sessions) {
        if (s.token !== currentToken) {
          await SessionModel.invalidate(s.token);
        }
      }

      res.json({ message: 'Otras sesiones cerradas' });

    } catch (err: any) {
      console.error(err);
      res.status(500).json({ message: 'Error cerrando sesiones', error: err.message });
    }
  }


  // ======================================================
  //                   CERRAR 1 SESIÓN
  // ======================================================
  static async logoutSession(req: AuthenticatedRequest, res: Response) {
    const { sessionId } = req.params;

    try {
      const sessions = await SessionModel.findActiveByUserId(req.user.id);
      const target = sessions.find((s) => s.id === Number(sessionId));

      if (!target)
        return res.status(404).json({ message: 'Sesión no encontrada' });

      await SessionModel.invalidate(target.token);

      res.json({ message: 'Sesión cerrada' });

    } catch (err: any) {
      console.error(err);
      res.status(500).json({ message: 'Error cerrando sesión', error: err.message });
    }
  }


  // ======================================================
  //                   REFRESH TOKEN
  // ======================================================
  static async refreshToken(req: AuthenticatedRequest, res: Response) {
    try {
      const oldToken = req.headers['authorization']?.split(' ')[1];

      if (!oldToken) return res.status(400).json({ message: 'Token requerido' });

      // Invalida token viejo
      await SessionModel.invalidate(oldToken);

      // Genera uno nuevo
      const newToken = generateToken({
        id: req.user.id,
        role: req.user.role,
        session_type: 'online',
      });

      const tokenIdentifier = extractJwtSignature(newToken);

      const now = new Date();
      const expiresAt = new Date(now.getTime() + 60 * 60 * 1000);

      await SessionModel.create({
        user_id: req.user.id,
        token: newToken,
        token_identifier: tokenIdentifier,
        device_info: req.session?.device_info || req.headers['user-agent'],
        ip_address: req.session?.ip_address || req.ip,
        latitude: req.session?.latitude,
        longitude: req.session?.longitude,
        expires_at: expiresAt,
        last_activity: now,
      });

      res.json({
        message: 'Token renovado',
        token: newToken,
        expires_at: expiresAt,
      });

    } catch (err: any) {
      console.error(err);
      res.status(500).json({ message: 'Error renovando token', error: err.message });
    }
  }

  // Agregar en AuthController
// En controllers/auth.controller.ts - ya tienes el método, solo asegurar que esté bien
  static async register(req: Request, res: Response) {
    const { email, password, role, phone, nombre } = req.body;
    
    try {
      const result = await UserModel.create(email, password, role, phone, nombre);
      
      return res.status(201).json({
        message: 'Usuario registrado exitosamente',
        user: {
          id: result.user.id,
          email: result.user.email,
          role: result.user.role,
          phone: result.user.phone,
          created_at: result.user.created_at
        },
        offlinePin: result.offlinePin,
        qrCodeUrl: result.qrCodeUrl,
        // Información adicional si es cliente
        ...(role === 'cliente' && { 
          clienteRegistrado: true,
          mensaje: 'Perfil de cliente creado automáticamente'
        })
      });
    } catch (err: any) {
      console.error('Error en registro:', err);
      return res.status(400).json({ 
        message: err.message || 'Error en el registro',
        code: 'REGISTRATION_ERROR'
      });
    }
  }
}
