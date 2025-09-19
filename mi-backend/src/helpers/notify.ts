// src/helpers/notify.ts
import nodemailer from 'nodemailer';
import dotenv from 'dotenv';
dotenv.config();

// Configuración de correo (Gmail)
const transporter = nodemailer.createTransport({
  host: process.env.EMAIL_HOST || 'smtp.gmail.com',
  port: Number(process.env.EMAIL_PORT || 465),
  secure: process.env.EMAIL_SECURE === 'true', // true para 465, false para 587
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS, // contraseña de aplicación
  },
});

export async function sendEmail(to: string, subject: string, html: string) {
  const info = await transporter.sendMail({
    from: `"Mi App" <${process.env.EMAIL_USER}>`,
    to,
    subject,
    html,
  });
  console.log('✉️ Email enviado:', info.messageId);
  return info;
}

// Twilio SMS (opcional)
import Twilio from 'twilio';
const twilioClient = process.env.TWILIO_ACCOUNT_SID
  ? Twilio(process.env.TWILIO_ACCOUNT_SID as string, process.env.TWILIO_AUTH_TOKEN as string)
  : null;

export async function sendSMS(to: string, body: string) {
  if (!twilioClient) {
    console.warn('Twilio no configurado, SMS no enviado');
    return null;
  }
  const msg = await twilioClient.messages.create({
    from: process.env.TWILIO_FROM,
    to,
    body,
  });
  console.log('📲 SMS enviado:', msg.sid);
  return msg;
}
