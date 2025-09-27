import nodemailer from 'nodemailer';
import dotenv from 'dotenv';
dotenv.config();

const transporter = nodemailer.createTransport({
  host: process.env.EMAIL_HOST,
  port: Number(process.env.EMAIL_PORT),
  secure: process.env.EMAIL_SECURE === 'true',
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS
  }
});

transporter.verify((err, success) => {
  if (err) return console.error('❌ SMTP:', err);
  console.log('✅ SMTP conectado correctamente');
});

async function testEmail() {
  try {
    const info = await transporter.sendMail({
      from: `"Mi App" <${process.env.EMAIL_USER}>`,
      to: 'destino@gmail.com',
      subject: 'Test Nodemailer',
      html: '<p>Funciona!</p>'
    });
    console.log('✉️ Email enviado:', info.messageId);
  } catch (err: any) {
    console.error('❌ Error enviando email:', err.message);
  }
}

testEmail();
