// models/session.model.ts - CORREGIDO
import { pool } from '../config/db';

export interface ISession {
  id?: number;
  user_id: number;
  token: string;
  token_identifier: string;
  device_info?: string;
  ip_address?: string;
  latitude?: number;
  longitude?: number;
  expires_at: Date | string;
  created_at?: Date | string;
  last_activity?: Date | string;
  is_active?: boolean;
}

export class SessionModel {
  static async create(sessionData: Omit<ISession, 'id' | 'created_at'>): Promise<ISession> {
    // OPCIÓN A: Invalidar sesiones anteriores del mismo usuario
    await this.invalidateAll(sessionData.user_id);

    // OPCIÓN B: Verificar si ya existe una sesión activa y rechazar
    const activeSessions = await this.findActiveByUserId(sessionData.user_id);
    if (activeSessions.length > 0) {
      throw new Error('Ya existe una sesión activa para este usuario');
    }

    const now = new Date();
    const expiresAt = new Date(now.getTime() + 60 * 60 * 1000);

    console.log('📝 CREANDO NUEVA SESIÓN:');
    console.log('- User ID:', sessionData.user_id);
    console.log('- Sesiones activas anteriores:', activeSessions.length);

    const result = await pool.query(
      `INSERT INTO sessions (user_id, token, token_identifier, device_info, ip_address, latitude, longitude, expires_at, last_activity, is_active) 
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10) 
       RETURNING *`,
      [
        sessionData.user_id,
        sessionData.token,
        sessionData.token_identifier,
        sessionData.device_info,
        sessionData.ip_address,
        sessionData.latitude,
        sessionData.longitude,
        expiresAt,
        now,
        true
      ]
    );
    
    const session = result.rows[0];
    console.log('✅ Nueva sesión creada con ID:', session.id);
    
    return session;
  }

  static async getActiveSessionCount(userId: number): Promise<number> {
    const result = await pool.query(
      'SELECT COUNT(*) as count FROM sessions WHERE user_id = $1 AND is_active = true AND expires_at > NOW()',
      [userId]
    );
    return parseInt(result.rows[0].count);
  }

  static async findByToken(token: string): Promise<ISession | null> {
    const result = await pool.query(
      `SELECT s.id, s.user_id, s.token, s.token_identifier, s.device_info, s.ip_address, 
              s.latitude, s.longitude, 
              s.expires_at AT TIME ZONE 'UTC' as expires_at,
              s.created_at AT TIME ZONE 'UTC' as created_at,
              s.last_activity AT TIME ZONE 'UTC' as last_activity,
              s.is_active, u.email, u.role 
       FROM sessions s 
       JOIN users u ON s.user_id = u.id 
       WHERE s.token = $1 AND s.is_active = true 
       AND s.expires_at AT TIME ZONE 'UTC' > NOW() AT TIME ZONE 'UTC'`,
      [token]
    );
    
    if (result.rows.length > 0) {
      const session = result.rows[0];
      console.log('🔍 Sesión encontrada (UTC):');
      console.log('- Creada:', session.created_at);
      console.log('- Expira:', session.expires_at);
      
      // Verificar validez
      const now = new Date();
      const expiresAt = new Date(session.expires_at);
      const isValid = now < expiresAt;
      console.log('- Válida?:', isValid);
      console.log('- Tiempo restante (min):', (expiresAt.getTime() - now.getTime()) / 60000);
      
      return session;
    }
    
    console.log('❌ Sesión no encontrada o expirada');
    return null;
  }

  // Buscar sesiones activas de un usuario - CORREGIDO
  static async findActiveByUserId(userId: number): Promise<ISession[]> {
    const result = await pool.query(
      `SELECT id, user_id, token, token_identifier, device_info, ip_address,
              latitude, longitude, expires_at, created_at, last_activity, is_active
       FROM sessions 
       WHERE user_id = $1 AND is_active = true AND expires_at > NOW() 
       ORDER BY last_activity DESC`,
      [userId]
    );
    
    console.log(`🔍 Encontradas ${result.rows.length} sesiones activas para usuario ${userId}`);
    return result.rows;
  }

  // Los demás métodos permanecen igual...
  static async invalidate(token: string): Promise<boolean> {
    const result = await pool.query(
      'UPDATE sessions SET is_active = false WHERE token = $1',
      [token]
    );
    const affected = (result.rowCount ?? 0) > 0;
    console.log(affected ? '✅ Sesión invalidada' : '❌ Sesión no encontrada para invalidar');
    return affected;
  }

  static async invalidateAll(userId: number): Promise<boolean> {
    const result = await pool.query(
      'UPDATE sessions SET is_active = false WHERE user_id = $1 AND is_active = true',
      [userId]
    );
    const affected = result.rowCount ?? 0;
    console.log(`✅ ${affected} sesiones invalidadas para usuario ${userId}`);
    return affected > 0;
  }

  static async updateLastActivity(token: string): Promise<boolean> {
    const result = await pool.query(
      'UPDATE sessions SET last_activity = NOW() WHERE token = $1 AND is_active = true',
      [token]
    );
    return (result.rowCount ?? 0) > 0;
  }

  static async cleanupExpired(): Promise<number> {
    const result = await pool.query(
      'UPDATE sessions SET is_active = false WHERE expires_at <= NOW() AND is_active = true'
    );
    const cleaned = result.rowCount ?? 0;
    console.log(`🧹 ${cleaned} sesiones expiradas limpiadas`);
    return cleaned;
  }

  static async findByIdentifier(tokenIdentifier: string): Promise<ISession | null> {
    const result = await pool.query(
      'SELECT * FROM sessions WHERE token_identifier = $1 AND is_active = true',
      [tokenIdentifier]
    );
    return result.rows[0] || null;
  }
}