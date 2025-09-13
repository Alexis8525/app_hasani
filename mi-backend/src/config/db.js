"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.connectDB = void 0;
const pg_1 = require("pg");
const dotenv_1 = __importDefault(require("dotenv"));
dotenv_1.default.config();
const host = process.env.DB_HOST || 'localhost';
const database = process.env.DB_DATABASE || 'app_hasani';
const port = Number(process.env.DB_PORT) || 5432;
const user = process.env.DB_USER || 'sa';
const password = process.env.DB_PASSWORD || 'sa';
if (!host || !database || !user || !password) {
    throw new Error('DB_HOST, DB_DATABASE, DB_USER y DB_PASSWORD deben estar definidos en el archivo .env');
}
const pool = new pg_1.Pool({
    host,
    database,
    port,
    user,
    password,
    ssl: false,
});
const connectDB = async () => {
    try {
        const client = await pool.connect();
        console.log(`✅ Conectado a la base de datos PostgreSQL: ${database}`);
        client.release(); // liberamos la conexión al pool
        return pool;
    }
    catch (err) {
        console.error('❌ Error al conectar a la base de datos:', err);
        process.exit(1);
    }
};
exports.connectDB = connectDB;
