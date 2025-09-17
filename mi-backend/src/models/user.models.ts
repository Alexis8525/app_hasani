import { pool } from '../config/db';
import bcrypt from 'bcrypt';

export interface IUser {
  id?: number;
  email: string;
  password: string;
  created_at?: Date;
}

export class UserModel {
  
  // Crear usuario
  static async create(email: string, password: string): Promise<IUser> {
    const hashedPassword = await bcrypt.hash(password, 10);
    const result = await pool.query(
      'INSERT INTO users (email, password) VALUES ($1, $2) RETURNING id, email, created_at',
      [email, hashedPassword]
    );
    return result.rows[0];
  }

  static async getUsuarios(): Promise<IUser[]> {
    const result = await pool.query('SELECT id, email, created_at FROM users ORDER BY id ASC');
    return result.rows;
  }

  static async findByEmail(email: string): Promise<IUser | null> {
    const result = await pool.query('SELECT * FROM users WHERE email = $1', [email]);
    return result.rows[0] || null;
  }

  static async updateUsuario(id: number, password: string): Promise<IUser | null> {
    const hashedPassword = await bcrypt.hash(password, 10);
    const result = await pool.query(
      'UPDATE users SET password = $1 WHERE id = $2 RETURNING id, email, created_at',
      [hashedPassword, id]
    );
    return result.rows[0] || null;
  }

  static async deleteUsuario(id: number): Promise<boolean> {
    const result = await pool.query('DELETE FROM users WHERE id = $1', [id]);
    if (!result.rowCount) return false;
    return result.rowCount > 0;
  }
  

  static async validatePassword(email: string, password: string): Promise<IUser | null> {
    const user = await this.findByEmail(email);
    if (!user) return null;

    const valid = await bcrypt.compare(password, user.password);
    return valid ? user : null;
  }
}
