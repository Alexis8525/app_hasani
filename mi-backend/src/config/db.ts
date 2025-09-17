import { Pool } from 'pg';
import dotenv from 'dotenv';

dotenv.config();

export const pool = new Pool({
  user: process.env.DB_USER,
  host: process.env.DB_HOST,
  database: process.env.DB_DATABASE,
  password: process.env.DB_PASSWORD,
  port: Number(process.env.DB_PORT),
});

export const connectDB = async () => {
  try {
    const client = await pool.connect();
    console.log(`✅ Conectado a PostgreSQL: ${process.env.DB_DATABASE}`);
    client.release();
    return pool;
  } catch (err: any) {
    console.error('❌ Error al conectar a PostgreSQL:', err.message);
    process.exit(1);
  }
};
