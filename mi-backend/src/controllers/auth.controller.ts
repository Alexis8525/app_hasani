// src/controllers/auth.controller.ts
import { Request, Response } from 'express';
import { pool } from '../config/db';
import crypto from 'crypto';
import { UserModel } from '../models/user.models';
import { PasswordResetModel } from '../models/passwordReset.model';
import { generateOTP, generateToken, hashToken } from '../helpers/security';
import { sendEmail, sendSMS } from '../helpers/notify';

export class AuthController {
  // Login inicial: si user.two_factor_enabled => generar OTP y pedir verificación
  static async login(req: Request, res: Response) {
    const { email, password } = req.body;
    try {
      const user = await UserModel.findByEmailFull(email);
      if (!user) return res.status(401).json({ message: 'Credenciales inválidas' });

      const valid = await (await import('bcrypt')).compare(password, user.password);
      if (!valid) return res.status(401).json({ message: 'Credenciales inválidas' });

      // Si usuario tiene 2FA habilitado -> generar OTP y guardar registro temporal
      if (user.two_factor_enabled) {
        const otp = generateOTP(6);
        const tempToken = crypto.randomBytes(32).toString('hex');
        await PasswordResetModel.create(user.id, tempToken, '2fa', otp, 5); // 5 min TTL

        // enviar OTP por email y/o SMS
        await sendEmail(user.email, 'Tu código 2FA', `<p>Tu código: <b>${otp}</b></p>`);
        if (user.phone) await sendSMS(user.phone, `Tu código 2FA: ${otp}`);

        return res.status(200).json({ message: '2FA requerido', requires2fa: true, tempToken }); // tempToken se usa para identificar sesión en /2fa/verify
      }

      // si no hay 2FA -> emitir JWT acceso
      const token = generateToken({ id: user.id, role: user.role });
      res.json({ message: 'Login exitoso', token, user: { id: user.id, email: user.email, role: user.role } });
    } catch (err: any) {
      console.error(err);
      res.status(500).json({ message: 'Error en login', error: err.message });
    }
  }

  // Verificar 2FA: tempToken + otp
  static async verify2FA(req: Request, res: Response) {
    const { tempToken, otp } = req.body;
    try {
      const reset = await PasswordResetModel.findValidByToken(tempToken, '2fa');
      if (!reset) return res.status(400).json({ message: 'Token 2FA inválido o expirado' });

      const byOtp = await PasswordResetModel.findValidByUserAndOtp(reset.user_id, otp, '2fa');
      if (!byOtp) return res.status(400).json({ message: 'Código OTP inválido' });

      // marcar usado
      await PasswordResetModel.markUsed(reset.id);

      const user = await UserModel.findById(reset.user_id);
      const token = generateToken({ id: user!.id, role: user!.role });
      res.json({ message: '2FA verificado', token, user: { id: user!.id, email: user!.email, role: user!.role } });
    } catch (err: any) {
      console.error(err);
      res.status(500).json({ message: 'Error verificando 2FA', error: err.message });
    }
  }

  // Request password reset (envía link con token o OTP)
  static async requestPasswordReset(req: Request, res: Response) {
    const { email, via = 'email' } = req.body; // via: 'email' | 'sms'
    try {
      const user = await UserModel.findByEmailFull(email);
      if (!user) return res.status(200).json({ message: 'Si existe cuenta, se enviará un correo' }); // no revelar existencia

      // token plano para link
      const tokenPlain = crypto.randomBytes(32).toString('hex');
      const otp = via === 'sms' ? generateOTP(6) : undefined;
      await PasswordResetModel.create(user.id, tokenPlain, 'reset', otp, 30);

      if (via === 'email') {
        const resetLink = `${process.env.APP_URL}/auth/password-reset/confirm?token=${tokenPlain}`;
        await sendEmail(user.email, 'Restablecer contraseña', `<p>Haz clic: <a href="${resetLink}">${resetLink}</a></p>`);
      } else if (via === 'sms' && user.phone) {
        await sendSMS(user.phone, `Código para restablecer: ${otp}`);
      } else {
        // fallback a email
        const resetLink = `${process.env.APP_URL}/auth/password-reset/confirm?token=${tokenPlain}`;
        await sendEmail(user.email, 'Restablecer contraseña', `<p>Haz clic: <a href="${resetLink}">${resetLink}</a></p>`);
      }

      return res.json({ message: 'Si existe la cuenta, recibirás instrucciones para restablecer la contraseña' });
    } catch (err: any) {
      console.error(err);
      res.status(500).json({ message: 'Error solicitando restablecimiento', error: err.message });
    }
  }

  // Confirm reset: token + nueva password OR user + otp + new password
  static async confirmPasswordReset(req: Request, res: Response) {
    const { token, otp, newPassword } = req.body;
    try {
      let reset = null;
      if (token) {
        reset = await PasswordResetModel.findValidByToken(token, 'reset');
      } else if (otp && req.body.email) {
        // si usas OTP vía SMS: buscar user y validar OTP
        const user = await UserModel.findByEmailFull(req.body.email);
        if (!user) return res.status(400).json({ message: 'Datos inválidos' });
        reset = await PasswordResetModel.findValidByUserAndOtp(user.id, otp, 'reset');
      } else {
        return res.status(400).json({ message: 'Parámetros inválidos' });
      }

      if (!reset) return res.status(400).json({ message: 'Token/OTP inválido o expirado' });

      // validar formato de contraseña con tu util actual
      if (!UserModel.validatePasswordFormat(newPassword)) {
        return res.status(400).json({ message: 'Formato de contraseña inválido' });
      }

      // actualizar contraseña
      const hashed = await (await import('bcrypt')).hash(newPassword, 10);
      await pool.query('UPDATE users SET password=$1 WHERE id=$2', [hashed, reset.user_id]);
      await PasswordResetModel.markUsed(reset.id);

      res.json({ message: 'Contraseña restablecida correctamente' });
    } catch (err: any) {
      console.error(err);
      res.status(500).json({ message: 'Error confirmando restablecimiento', error: err.message });
    }
  }

  // Recuperación de username (por email o SMS)
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

      // enviar username por email o sms
      if (user.email) {
        await sendEmail(user.email, 'Recuperación de usuario', `<p>Tu usuario: <b>${user.email}</b></p>`);
      }
      if (user.phone) {
        await sendSMS(user.phone, `Tu usuario: ${user.email}`);
      }
      res.json({ message: 'Si existe, recibirás la información' });
    } catch (err: any) {
      console.error(err);
      res.status(500).json({ message: 'Error recuperando usuario', error: err.message });
    }
  }
}
