import { Pool } from 'pg';
import dotenv from 'dotenv';

dotenv.config();

const pool = new Pool({
    host: process.env.DB_HOST,
    database: process.env.DB_DATABASE,
    port: Number(process.env.DB_PORT),
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    ssl: false
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
