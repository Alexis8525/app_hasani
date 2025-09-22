import { Request, Response } from 'express';
import { pool } from '../config/db';
import bcrypt from 'bcrypt';
import crypto from 'crypto';
import { UserModel } from '../models/user.models';
import { PasswordResetModel } from '../models/passwordReset.model';
import { generateOTP, generateTempToken, generateToken } from '../helpers/security';
import { sendEmail, sendSMS } from '../helpers/notify';

export class AuthController {
  // Login 2FA
static async login(req: Request, res: Response) {
  const { email, password, lat, lng } = req.body; // lat/lng enviados por cliente
  try {
      const user = await UserModel.findByEmailFull(email);
      if (!user) return res.status(401).json({ message: 'Credenciales inválidas' });

      const valid = await bcrypt.compare(password, user.password);
      if (!valid) return res.status(401).json({ message: 'Credenciales inválidas' });

      if (user.two_factor_enabled) {
        const otp = generateOTP(6); // OTP online
        const offlinePin = generateOTP(6); // PIN offline
        const tempToken = generateTempToken({ id: user.id, type: '2fa' });
        const { lat, lng } = req.body;
      
        // Guardar en DB
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
      
      

      // Usuario sin 2FA
      const token = generateToken({ id: user.id, role: user.role });
      return res.json({
          message: 'Login exitoso',
          token,
          user: { id: user.id, email: user.email, role: user.role }
      });

  } catch (err: any) {
      console.error(err);
      res.status(500).json({ message: 'Error en login', error: err.message });
  }
}

  // Verificar 2FA
  static async verify2FA(req: Request, res: Response) {
    const { tempToken, otp } = req.body;
    try {
      console.log('TempToken recibido:', tempToken);
      console.log('OTP recibido:', otp);
  
      const reset = await PasswordResetModel.findValidByTokenAndOtp(tempToken, '2fa', String(otp).trim());
      if (!reset) return res.status(400).json({ message: 'Token o código 2FA inválido o expirado' });
  
      await PasswordResetModel.markUsed(reset.id);
  
      const user = await UserModel.findById(reset.user_id);
      const token = generateToken({ id: user!.id, role: user!.role });
  
      res.json({
        message: '2FA verificado',
        token,
        user: { id: user!.id, email: user!.email, role: user!.role }
      });
  
    } catch (err: any) {
      console.error(err);
      res.status(500).json({ message: 'Error verificando 2FA', error: err.message });
    }
  }

  static async verifyOffline(req: Request, res: Response) {
    const { userId, offlinePin, lat, lng } = req.body;
  
    try {
      const result = await pool.query(
        `SELECT * FROM password_resets
         WHERE user_id=$1 AND offline_pin=$2 AND used=false AND expires_at > NOW()
         LIMIT 1`,
        [userId, offlinePin]
      );
  
      const reset = result.rows[0];
      if (!reset) return res.status(400).json({ message: 'PIN offline inválido o expirado' });
  
      // Opcional: validar lat/lng
      if (lat && lng && reset.latitude && reset.longitude) {
        const distance = Math.sqrt(
          Math.pow(reset.latitude - lat, 2) + Math.pow(reset.longitude - lng, 2)
        );
        if (distance > 0.01) { // ejemplo de tolerancia
          return res.status(400).json({ message: 'Ubicación no coincide' });
        }
      }
  
      // Marcar usado
      await PasswordResetModel.markUsed(reset.id);
  
      const user = await UserModel.findById(reset.user_id);
      const token = generateToken({ id: user!.id, role: user!.role });
  
      res.json({
        message: 'Login offline exitoso',
        token,
        user: { id: user!.id, email: user!.email, role: user!.role }
      });
  
    } catch (err: any) {
      console.error(err);
      res.status(500).json({ message: 'Error verificando PIN offline', error: err.message });
    }
  }
  
  

  static async requestPasswordReset(req: Request, res: Response) {
    const { email, via = 'email' } = req.body;
    try {
      const user = await UserModel.findByEmailFull(email);
      if (!user) return res.status(200).json({ message: 'Si existe la cuenta, se enviará un correo' });
  
      // Generar token plano seguro
      const tokenPlain = crypto.randomBytes(32).toString('hex'); // 64 caracteres hex
      const otp = via === 'sms' ? generateOTP(6) : undefined;
  
      // Guardar en DB
      await PasswordResetModel.create(user.id, tokenPlain, 'reset', otp, 30);
  
      // Enviar correo o SMS
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
  
      // Busca token plano en la DB
      const reset = await PasswordResetModel.findValidByToken(token, 'reset');
      if (!reset) return res.status(400).json({ message: 'Token inválido o expirado' });
  
      // Validar formato de contraseña
      if (!UserModel.validatePasswordFormat(newPassword)) {
        return res.status(400).json({ message: 'Formato de contraseña inválido' });
      }
  
      // Hash y actualizar
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
      let user = null;
      if (emailOrPhone.includes('@')) {
        user = await UserModel.findByEmail(emailOrPhone);
      } else {
        const result = await pool.query('SELECT id, email, phone FROM users WHERE phone=$1 LIMIT 1', [emailOrPhone]);
        user = result.rows[0];
      }

      if (!user) return res.status(200).json({ message: 'Si existe, recibirás la información' });

      if (user.email) {
        await sendEmail(user.email, 'Recuperación de usuario', `<p>Tu usuario: <b>${user.email}</b></p>`);
      }
      if (user.phone) {
        await sendSMS(user.phone, `Tu usuario: ${user.email}`);
      }

      return res.json({ message: 'Si existe, recibirás la información' });
    } catch (err: any) {
      console.error(err);
      res.status(500).json({ message: 'Error recuperando usuario', error: err.message });
    }
  }
}
