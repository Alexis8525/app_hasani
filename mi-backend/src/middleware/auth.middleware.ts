// middleware/auth.middleware.ts
import { Request, Response, NextFunction } from 'express';
import { SessionModel } from '../models/session-model';
import { verifyJWT, extractJwtSignature } from '../helpers/security';

export interface AuthenticatedRequest extends Request {
  user?: any;
  session?: any;
}

export const authenticateToken = async (
    req: AuthenticatedRequest,
    res: Response,
    next: NextFunction
  ) => {
    try {
      const authHeader = req.headers['authorization'];
      const token = authHeader && authHeader.split(' ')[1];
  
      if (!token) {
        console.log('❌ No se proporcionó token');
        return res.status(401).json({ message: 'Token de acceso requerido' });
      }
  
      console.log('🔍 Verificando token:', token.substring(0, 20) + '...');
  
      // Verificar JWT
      const decoded = verifyJWT(token);
      if (!decoded) {
        console.log('❌ Token JWT inválido o expirado');
        return res.status(403).json({ message: 'Token inválido o expirado' });
      }
  
      console.log('✅ JWT válido. Buscando sesión en BD...');
  
      // Buscar sesión activa en la base de datos
      const session = await SessionModel.findByToken(token);
      if (!session) {
        console.log('❌ Sesión no encontrada en BD o expirada');
        return res.status(403).json({ message: 'Sesión no encontrada o inactiva' });
      }
  
      console.log('✅ Sesión activa encontrada. User ID:', session.user_id);
  
      // Actualizar última actividad
      await SessionModel.updateLastActivity(token);
  
      req.user = decoded;
      req.session = session;
  
      next();
    } catch (error) {
      console.error('❌ Error en autenticación:', error);
      return res.status(500).json({ message: 'Error de autenticación' });
    }
  };

// Middleware para roles específicos
export const requireRole = (roles: string | string[]) => {
  return (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    if (!req.user) {
      return res.status(401).json({ message: 'No autenticado' });
    }

    const userRole = req.user.role;
    const allowedRoles = Array.isArray(roles) ? roles : [roles];

    if (!allowedRoles.includes(userRole)) {
      return res.status(403).json({ message: 'Permisos insuficientes' });
    }

    next();
  };
};

// Middleware para obtener información del dispositivo
export const captureDeviceInfo = (req: Request, res: Response, next: NextFunction) => {
  req.body.device_info = {
    userAgent: req.headers['user-agent'],
    ip: req.ip || req.connection.remoteAddress,
    language: req.headers['accept-language']
  };
  next();
};