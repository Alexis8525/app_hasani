import bcrypt from 'bcrypt';
import jwt, { SignOptions } from 'jsonwebtoken';
import dotenv from 'dotenv';
dotenv.config();

export function generateOTP(length = 6) {
  const digits = '0123456789';
  let otp = '';
  for (let i = 0; i < length; i++) {
    otp += digits[Math.floor(Math.random() * digits.length)];
  }
  return otp;
}

/**
 * Genera un token temporal (JWT) válido por 1 minuto.
 * Este mismo token se puede guardar en la DB tal cual.
 */
export function generateTempToken(payload: object = {}): string {
  return jwt.sign(payload, process.env.JWT_SECRET as string, { expiresIn: '4m' });
}

/**
 * Hashea una contraseña.
 */
export async function hashPassword(password: string) {
  return bcrypt.hash(password, 10);
}

/**
 * Genera un JWT para sesión normal.
 */
export const generateToken = (
  payload: object,
  expiresIn: SignOptions['expiresIn'] = '1h'
) => {
  return jwt.sign(payload, process.env.JWT_SECRET as string, { expiresIn });
};

/**
 * Verifica y decodifica un JWT.
 */
export function verifyJWT(token: string) {
  try {
    return jwt.verify(token, process.env.JWT_SECRET as string);
  } catch (err) {
    return null; // token inválido o expirado
  }
}
