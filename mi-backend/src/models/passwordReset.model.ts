import { pool } from '../config/db';

export interface IPasswordReset {
  id?: number;
  user_id: number;
  token: string; // renombrado desde token_hash
  otp_code?: string | null;
  type: string;
  expires_at: Date;
  used?: boolean;
  created_at?: Date;
}

export class PasswordResetModel {
  static async create(user_id: number, token: string, type: string, otp?: string, ttlMinutes = 15) {
    const expires_at = new Date(Date.now() + ttlMinutes * 60 * 1000);
    const result = await pool.query(
      `INSERT INTO password_resets (user_id, token, otp_code, type, expires_at) 
       VALUES ($1,$2,$3,$4,$5) RETURNING *`,
      [user_id, token, otp || null, type, expires_at]
    );
    return result.rows[0];
  }

  static async findValidByToken(token: string, type: string) {
    const result = await pool.query(
      `SELECT * FROM password_resets WHERE token=$1 AND type=$2 AND used=false AND expires_at>NOW() LIMIT 1`,
      [token, type]
    );
    return result.rows[0] ?? null;
  }

  static async markUsed(id: number) {
    await pool.query(`UPDATE password_resets SET used=true WHERE id=$1`, [id]);
  }

  static async findValidByUserAndOtp(user_id: number, otp: string, type: string) {
    const result = await pool.query(
      `SELECT * FROM password_resets WHERE user_id=$1 AND otp_code=$2 AND type=$3 AND used=false AND expires_at > now() LIMIT 1`,
      [user_id, otp, type]
    );
    return result.rows[0] || null;
  }

  
}
