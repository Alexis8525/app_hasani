import jwt from 'jsonwebtoken';
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
  static async create(
    user_id: number,
    token: string,
    type: string,
    otp?: string,
    ttlMinutes = 5, // ← 5 minutos por defecto para 2FA
    latitude?: number,
    longitude?: number,
    offlinePin?: string
  ) {
    // ✅ CORRECCIÓN: Usar Date.now() y sumar los minutos
    const expires_at = new Date(Date.now() + ttlMinutes * 60 * 1000);
    
    console.log('📝 GUARDANDO EN DB:');
    console.log('- user_id:', user_id);
    console.log('- type:', type);
    console.log('- otp:', otp);
    console.log('- created_at (ahora):', new Date());
    console.log('- expires_at (futuro):', expires_at);
    console.log('- TTL minutos:', ttlMinutes);
  
    const result = await pool.query(
      `INSERT INTO password_resets (user_id, token, otp_code, type, expires_at, latitude, longitude, offline_pin)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
       RETURNING *`,
      [user_id, token, otp || null, type, expires_at, latitude || null, longitude || null, offlinePin || null]
    );
    
    console.log('✅ Registro guardado. ID:', result.rows[0]?.id);
    return result.rows[0];
  }

  static async verifyOffline(email: string, pin: string) {
    console.log('🔐 Verificación offline para:', email, 'PIN:', pin);
    
    // Buscar usuario por email
    const userResult = await pool.query('SELECT id FROM users WHERE email = $1', [email]);
    if (userResult.rows.length === 0) {
      console.log('❌ Usuario no encontrado');
      return null;
    }
    
    const userId = userResult.rows[0].id;
    
    // Buscar PIN offline válido
    const result = await pool.query(
      `SELECT pr.* 
       FROM password_resets pr
       WHERE pr.user_id = $1 
         AND pr.offline_pin = $2 
         AND pr.used = false 
         AND pr.expires_at > NOW()
       ORDER BY pr.created_at DESC 
       LIMIT 1`,
      [userId, pin]
    );
    
    if (result.rows.length > 0) {
      console.log('✅ PIN offline válido encontrado');
      return { ...result.rows[0], user_id: userId };
    }
    
    console.log('❌ PIN offline inválido o expirado');
    return null;
  }  

  static async findValidByTokenAndOtp(token: string, type: string, otp: string) {
    console.log('=== findValidByTokenAndOtp ===');
    
    try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET as string) as any;
      const userId = decoded.id;
      const cleanOtp = String(otp).trim();
  
      console.log(`Buscando: user_id=${userId}, otp=${cleanOtp}`);
      console.log('Hora actual:', new Date());
  
      // ✅ CONSULTA con debug de fechas
      const result = await pool.query(
        `SELECT *, 
                (expires_at > NOW()) as no_expirado,
                (NOW() - created_at) as tiempo_desde_creacion
         FROM password_resets 
         WHERE user_id = $1 
           AND type = $2 
           AND otp_code = $3 
           AND used = false 
         ORDER BY created_at DESC 
         LIMIT 1`,
        [userId, type, cleanOtp]
      );
  
      if (result.rows.length > 0) {
        const record = result.rows[0];
        console.log('🔍 REGISTRO ENCONTRADO:');
        console.log('- ID:', record.id);
        console.log('- Creado:', record.created_at);
        console.log('- Expira:', record.expires_at);
        console.log('- No expirado?:', record.no_expirado);
        console.log('- Tiempo desde creación (minutos):', record.tiempo_desde_creacion / 60000);
        console.log('- Usado?:', record.used);
        
        // ✅ Verificar manualmente si ha expirado
        const ahora = new Date();
        const expiracion = new Date(record.expires_at);
        const haExpirado = expiracion <= ahora;
        
        console.log('- Verificación manual:');
        console.log('  Ahora:', ahora);
        console.log('  Expira:', expiracion);
        console.log('  Ha expirado?:', haExpirado);
        
        if (!haExpirado && !record.used) {
          console.log('✅ REGISTRO VÁLIDO - Devolviendo...');
          return record;
        } else {
          console.log('❌ REGISTRO INVÁLIDO - Expirado o usado');
        }
      } else {
        console.log('❌ No se encontró registro');
      }
      
      return null;
  
    } catch (err: any) {
      console.error('Error:', err.message);
      return null;
    }
  }

  static async findValidByToken(token: string, type: string) {
    console.log('=== findValidByToken (Password Reset) ===');
    console.log('Token recibido:', token.substring(0, 20) + '...');
    console.log('Tipo recibido:', type);
    console.log('Hora actual:', new Date());
  
    // ✅ CONSULTA con debug de fechas
    const result = await pool.query(
      `SELECT *, 
              (expires_at > NOW()) as no_expirado,
              expires_at - NOW() as tiempo_restante
       FROM password_resets
       WHERE token=$1
         AND type=$2
         AND used=false
       ORDER BY created_at DESC
       LIMIT 1`,
      [token, type]
    );
  
    if (result.rows.length > 0) {
      const record = result.rows[0];
      console.log('🔍 REGISTRO ENCONTRADO:');
      console.log('- ID:', record.id);
      console.log('- User ID:', record.user_id);
      console.log('- Creado:', record.created_at);
      console.log('- Expira:', record.expires_at);
      console.log('- No expirado (DB)?:', record.no_expirado);
      console.log('- Tiempo restante (minutos):', record.tiempo_restante / 60000);
      console.log('- Usado?:', record.used);
      
      // ✅ Verificación manual
      const ahora = new Date();
      const expiracion = new Date(record.expires_at);
      const haExpirado = expiracion <= ahora;
      
      console.log('⏰ Verificación manual:');
      console.log('  Ahora:', ahora);
      console.log('  Expira:', expiracion);
      console.log('  Ha expirado?:', haExpirado);
      
      if (!haExpirado && !record.used) {
        console.log('✅ TOKEN VÁLIDO');
        return record;
      } else {
        console.log('❌ TOKEN INVÁLIDO - Expirado o usado');
      }
    } else {
      console.log('❌ No se encontró registro con ese token');
      
      // Debug: ver qué tokens hay en la DB
      const debugResult = await pool.query(
        `SELECT id, user_id, LEFT(token, 20) as token_preview, type, created_at, expires_at, used
         FROM password_resets 
         WHERE type = $1 
         ORDER BY created_at DESC 
         LIMIT 3`,
        [type]
      );
      console.log('🔍 Últimos registros de tipo', type, ':', debugResult.rows);
    }
    
    return null;
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
