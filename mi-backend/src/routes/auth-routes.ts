// routes/auth.routes.ts
import { Router, Request, Response } from 'express';
import { AuthController } from '../controllers/auth-controller';
import { EndpointValidators, ValidationMiddleware } from '../middleware/endpointValidators';
import { GlobalValidationMiddleware } from '../middleware/globalValidation.middleware';
import { authenticateToken } from '../middleware/auth.middleware';

class AuthRoutes {
  public router: Router = Router();

  constructor() {
    this.config();
  }

  config() {
    // Aplicar middleware global a todas las rutas de auth
    this.router.use(ValidationMiddleware.sanitizeInput);
    this.router.use(GlobalValidationMiddleware.validateJSONSyntax);

    // 🔥🔥🔥 RUTAS DE PRUEBA TEMPORALES - SIN VALIDACIÓN
    this.router.post('/test-login-simple', (req: Request, res: Response) => {
      console.log('✅ Ruta simple de login accedida - Body:', req.body);
      
      // Simular validación de credenciales
      const { email, password } = req.body;
      
      if (email === 'gearssgt@gmail.com' && password === 'admin123') {
        return res.json({
          code: 0,
          message: '✅ Login exitoso (ruta simple)',
          token: 'test-jwt-token-' + Date.now(),
          user: {
            id: 1,
            email: email,
            name: 'Usuario Admin',
            role: 'admin'
          },
          session: {
            id: 1,
            created_at: new Date().toISOString(),
            expires_at: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString()
          }
        });
      } else {
        return res.status(401).json({
          code: 1,
          message: 'Credenciales incorrectas'
        });
      }
    });

    this.router.post('/test-login-force', (req: Request, res: Response) => {
      console.log('✅ Ruta force login accedida - Body:', req.body);
      
      const { email, password } = req.body;
      
      if (email === 'gearssgt@gmail.com' && password === 'admin123') {
        return res.json({
          code: 0,
          message: '✅ Force login exitoso',
          token: 'force-jwt-token-' + Date.now(),
          user: {
            id: 1,
            email: email,
            name: 'Usuario Admin',
            role: 'admin'
          },
          session: {
            id: 1,
            created_at: new Date().toISOString(),
            expires_at: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString()
          }
        });
      } else {
        return res.status(401).json({
          code: 1,
          message: 'Credenciales incorrectas'
        });
      }
    });

    this.router.post('/test-2fa', (req: Request, res: Response) => {
      console.log('✅ Ruta 2FA accedida - Body:', req.body);
      
      return res.json({
        code: 0,
        message: '✅ 2FA verificado exitosamente',
        token: '2fa-jwt-token-' + Date.now(),
        user: {
          id: 1,
          email: 'gearssgt@gmail.com',
          name: 'Usuario Admin',
          role: 'admin'
        },
        session: {
          id: 1,
          created_at: new Date().toISOString(),
          expires_at: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString()
        }
      });
    });

    this.router.post('/test-verify-offline', (req: Request, res: Response) => {
      console.log('✅ Ruta offline accedida - Body:', req.body);
      
      return res.json({
        code: 0,
        message: '✅ Verificación offline exitosa',
        token: 'offline-jwt-token-' + Date.now(),
        user: {
          id: 1,
          email: 'gearssgt@gmail.com',
          name: 'Usuario Admin',
          role: 'admin'
        },
        session: {
          id: 1,
          created_at: new Date().toISOString(),
          expires_at: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString()
        }
      });
    });

    // Ruta para probar sesiones activas
    this.router.get('/test-sessions', (req: Request, res: Response) => {
      console.log('✅ Ruta sessions accedida');
      
      return res.json({
        sessions: [
          {
            id: 1,
            device_info: 'Chrome on Windows',
            ip_address: '192.168.1.1',
            created_at: new Date().toISOString(),
            last_activity: new Date().toISOString(),
            expires_at: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
            location: { lat: 40.7128, lng: -74.0060 }
          }
        ],
        total: 1
      });
    });

    // Ruta para debug general
    this.router.post('/debug', (req: Request, res: Response) => {
      console.log('🔍 DEBUG Request:', {
        headers: req.headers,
        body: req.body,
        method: req.method,
        url: req.url,
        timestamp: new Date().toISOString()
      });
      
      return res.json({
        code: 0,
        message: 'Debug endpoint funcionando',
        received: {
          headers: req.headers,
          body: req.body,
          timestamp: new Date().toISOString()
        }
      });
    });

    // 🔥 RUTAS ORIGINALES (mantener para después)
    this.router.post('/login', EndpointValidators.validateLogin, AuthController.login);
    this.router.post('/2fa/verify', EndpointValidators.validate2FA, AuthController.verify2FA);
    this.router.post(
      '/verify-offline',
      EndpointValidators.validateOfflineLogin,
      AuthController.verifyOffline
    );

    this.router.post(
      '/password-reset/request',
      EndpointValidators.validatePasswordResetRequest,
      AuthController.requestPasswordReset
    );

    this.router.get('/password-reset/confirm', (req: Request, res: Response) => {
      const { token } = req.query;
      return res.send(`
        <html>
          <head><title>Restablecer contraseña</title></head>
          <body style="font-family: Arial, sans-serif; text-align: center; padding: 50px;">
            <h2>Restablecer contraseña</h2>
            <form method="POST" action="/api/auth/password-reset/confirm">
              <input type="hidden" name="token" value="${token}" />
              <div>
                <input type="password" name="newPassword" placeholder="Nueva contraseña" required style="padding: 8px; margin: 10px;"/>
              </div>
              <div>
                <button type="submit" style="padding: 10px 20px;">Restablecer</button>
              </div>
            </form>
          </body>
        </html>
      `);
    });

    this.router.post(
      '/password-reset/confirm',
      EndpointValidators.validatePasswordResetConfirm,
      AuthController.confirmPasswordReset
    );

    this.router.post(
      '/recover-username',
      EndpointValidators.validateRecoverUsername,
      AuthController.recoverUsername
    );

    this.router.post('/logout', authenticateToken, AuthController.logout);
    this.router.get('/sessions', authenticateToken, AuthController.getActiveSessions);
    this.router.post(
      '/sessions/logout-others',
      authenticateToken,
      AuthController.logoutOtherSessions
    );
    this.router.delete('/sessions/:sessionId', authenticateToken, AuthController.logoutSession);
    this.router.post('/refresh-token', authenticateToken, AuthController.refreshToken);
  }
}

const authRoutes = new AuthRoutes();
export default authRoutes.router;