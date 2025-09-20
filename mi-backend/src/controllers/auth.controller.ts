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
    const { email, password } = req.body;
    try {
      const user = await UserModel.findByEmailFull(email);
      if (!user) return res.status(401).json({ message: 'Credenciales inválidas' });
  
      const valid = await bcrypt.compare(password, user.password);
      if (!valid) return res.status(401).json({ message: 'Credenciales inválidas' });
  
      if (user.two_factor_enabled) {
        const otp = generateOTP(6);
  
        // Generar token temporal y guardar **exactamente el mismo valor en DB**
        const tempToken = generateTempToken({ id: user.id, type: '2fa' });
  
        await PasswordResetModel.create(user.id, tempToken, '2fa', otp, 1); // 1 min de expiración
  
        // Notificar al usuario
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
  
        return res.status(200).json({ message: '2FA requerido', requires2fa: true, tempToken });
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
      console.log('Tokens en DB:', await pool.query('SELECT token, expires_at FROM password_resets'));

      // Buscar **el token exacto** en la DB
      const reset = await PasswordResetModel.findValidByToken(tempToken, '2fa');
if (!reset) return res.status(400).json({ message: 'Token 2FA inválido o expirado' });

if (reset.otp_code !== otp) return res.status(400).json({ message: 'Código OTP inválido' });

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
  

  

  static async requestPasswordReset(req: Request, res: Response) {
    const { email, via = 'email' } = req.body;
    try {
      const user = await UserModel.findByEmailFull(email);
      if (!user) return res.status(200).json({ message: 'Si existe cuenta, se enviará un correo' });
  
      // Generar token seguro (plano)
      const tokenPlain = crypto.randomBytes(32).toString('hex');
  
      const otp = via === 'sms' ? generateOTP(6) : undefined;
  
      // Guardar **el token plano tal cual** en la DB
      await PasswordResetModel.create(user.id, tokenPlain, 'reset', otp, 30);
  
      if (via === 'email') {
        const resetLink = `${process.env.APP_URL}/auth/password-reset/confirm?token=${tokenPlain}`;
        await sendEmail(user.email, 'Restablecer contraseña', `<p>Haz clic: <a href="${resetLink}">${resetLink}</a></p>`);
      } else if (via === 'sms' && user.phone) {
        await sendSMS(user.phone, `Código para restablecer: ${otp}`);
      } else {
        const resetLink = `${process.env.APP_URL}/auth/password-reset/confirm?token=${tokenPlain}`;
        await sendEmail(user.email, 'Restablecer contraseña', `<p>Haz clic: <a href="${resetLink}">${resetLink}</a></p>`);
      }
  
      return res.json({ message: 'Si existe la cuenta, recibirás instrucciones para restablecer la contraseña' });
    } catch (err: any) {
      console.error(err);
      res.status(500).json({ message: 'Error solicitando restablecimiento', error: err.message });
    }
  }
  

  static async confirmPasswordReset(req: Request, res: Response) {
    const { token, otp, newPassword, email } = req.body;
    try {
      let reset = null;
      if (token) {
        reset = await PasswordResetModel.findValidByToken(token, 'reset');
      } else if (otp && email) {
        const user = await UserModel.findByEmailFull(email);
        if (!user) return res.status(400).json({ message: 'Datos inválidos' });
        reset = await PasswordResetModel.findValidByUserAndOtp(user.id, otp, 'reset');
      } else {
        return res.status(400).json({ message: 'Parámetros inválidos' });
      }

      if (!reset) return res.status(400).json({ message: 'Token/OTP inválido o expirado' });

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
