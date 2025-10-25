// routes/auth.routes.ts
import { Router } from 'express';
import { AuthController } from '../controllers/auth-controller';
import { EndpointValidators, ValidationMiddleware} from '../middleware/endpointValidators';
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

        // POST /auth/login - Login de usuario
        this.router.post('/login', 
          EndpointValidators.validateLogin,
          AuthController.login
      );

      this.router.post('/2fa/verify',
          EndpointValidators.validate2FA,
          AuthController.verify2FA
      );

      this.router.post('/verify-offline',
          EndpointValidators.validateOfflineLogin,
          AuthController.verifyOffline
      );

      this.router.post('/password-reset/request',
          EndpointValidators.validatePasswordResetRequest,
          AuthController.requestPasswordReset
      );

      this.router.get("/password-reset/confirm", (req, res) => {
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

      this.router.post('/password-reset/confirm',
          EndpointValidators.validatePasswordResetConfirm,
          AuthController.confirmPasswordReset
      );

      this.router.post('/recover-username',
          EndpointValidators.validateRecoverUsername,
          AuthController.recoverUsername
      );

      this.router.post('/logout', authenticateToken, AuthController.logout);
      this.router.get('/sessions', authenticateToken, AuthController.getActiveSessions);
      this.router.post('/sessions/logout-others', authenticateToken, AuthController.logoutOtherSessions);
      this.router.delete('/sessions/:sessionId', authenticateToken, AuthController.logoutSession);
      this.router.post('/refresh-token', authenticateToken, AuthController.refreshToken);
  }


}

const authRoutes = new AuthRoutes();
export default authRoutes.router;