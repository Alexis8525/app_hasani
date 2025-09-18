// src/helpers/security.ts
import crypto from 'crypto';
import bcrypt from 'bcrypt';
import jwt, { SignOptions } from 'jsonwebtoken';
import dotenv from 'dotenv';
dotenv.config();

export function generateOTP(length = 6) {
  const digits = '0123456789';
  let otp = '';
  for (let i = 0; i < length; i++) otp += digits[Math.floor(Math.random() * digits.length)];
  return otp;
}

export function hashToken(token: string) {
  return crypto.createHash('sha256').update(token).digest('hex');
}

export async function hashPassword(password: string) {
  return bcrypt.hash(password, 10);
}

export const generateToken = (
    payload: object,
    expiresIn: SignOptions['expiresIn'] = '1h'
  ) => {
    return jwt.sign(payload, process.env.JWT_SECRET as string, { expiresIn });
  };
  

export function verifyJWT(token: string) {
  return jwt.verify(token, process.env.JWT_SECRET as string);
}
