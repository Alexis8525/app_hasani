// src/helpers/notify.ts
import { Resend } from "resend";
import dotenv from "dotenv";
dotenv.config();

// ==========================
//   CONFIGURACIÓN RESEND
// ==========================
const resend = new Resend(process.env.RESEND_API_KEY);

// ESTE debe ser un dominio verificado en Resend
const EMAIL_FROM = process.env.EMAIL_FROM || "noreply@tudominio.com";

export async function sendEmail(to: string, subject: string, html: string) {
  try {
    const response = await resend.emails.send({
      from: EMAIL_FROM,
      to,
      subject,
      html
    });

    // 🟢 Nuevo formateo correcto para Resend v3
    if (response.data) {
      console.log("✉️ Email enviado:", response.data.id);
    } else if (response.error) {
      console.error("❌ Error en Resend:", response.error.message);
    }

    return response;
  } catch (error: any) {
    console.error("❌ Error enviando correo:", error.message);
    throw new Error("No se pudo enviar el correo");
  }
}

// ==========================
//   SMS (Twilio)
// ==========================
import Twilio from "twilio";

const twilioClient = process.env.TWILIO_ACCOUNT_SID
  ? Twilio(
      process.env.TWILIO_ACCOUNT_SID as string,
      process.env.TWILIO_AUTH_TOKEN as string
    )
  : null;

export async function sendSMS(to: string, body: string) {
  if (!twilioClient) {
    console.warn("⚠ Twilio no configurado. SMS no enviado.");
    return null;
  }

  try {
    const msg = await twilioClient.messages.create({
      from: process.env.TWILIO_FROM,
      to,
      body
    });
    console.log("📲 SMS enviado:", msg.sid);
    return msg;
  } catch (err: any) {
    console.error("❌ Error enviando SMS:", err.message);
    throw err;
  }
}
