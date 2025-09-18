// src/helpers/notify.ts
import nodemailer from 'nodemailer';
import dotenv from 'dotenv';
dotenv.config();

const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST,
  port: Number(process.env.SMTP_PORT || 587),
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
});

export async function sendEmail(to: string, subject: string, html: string) {
  const info = await transporter.sendMail({
    from: process.env.SMTP_USER,
    to,
    subject,
    html,
  });
  console.log('✉️ Email enviado:', info.messageId);
  return info;
}

// opcional: Twilio SMS
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
