// routes/auth.routes.ts
import { Router } from 'express';
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
    // Middleware global de validación
    this.router.use(ValidationMiddleware.sanitizeInput);
    this.router.use(GlobalValidationMiddleware.validateJSONSyntax);

    // ============================================
    //               LOGIN NORMAL
    // ============================================
    this.router.post(
      '/login',
      EndpointValidators.validateLogin,
      AuthController.login
    );

    // ============================================
    //                   2FA
    // ============================================
    this.router.post(
      '/2fa/verify',
      EndpointValidators.validate2FA,
      AuthController.verify2FA
    );

    // ============================================
    //             LOGIN OFFLINE (PIN)
    // ============================================
    this.router.post(
      '/verify-offline',
      EndpointValidators.validateOfflineLogin,
      AuthController.verifyOffline
    );

    // ============================================
    //          PASSWORD RESET (REQUEST)
    // ============================================
    this.router.post(
      '/password-reset/request',
      EndpointValidators.validatePasswordResetRequest,
      AuthController.requestPasswordReset
    );

    // ============================================
    //       FORM HTML RESET (GET – se queda)
    // ============================================
    this.router.get('/password-reset/confirm', (req, res) => {
      const { token } = req.query;

      return res.send(`
        <html>
          <head><title>Restablecer contraseña</title></head>
          <body style="font-family: Arial; text-align: center; padding: 40px;">
            <h2>Restablecer contraseña</h2>
            <form method="POST" action="/api/auth/password-reset/confirm">
              <input type="hidden" name="token" value="${token}" />
              <input type="password" name="newPassword" placeholder="Nueva contraseña" required style="padding: 8px; margin: 12px;" />
              <br>
              <button type="submit" style="padding: 10px 20px;">Restablecer</button>
            </form>
          </body>
        </html>
      `);
    });

    // ============================================
    //        PASSWORD RESET (CONFIRM)
    // ============================================
    this.router.post(
      '/password-reset/confirm',
      EndpointValidators.validatePasswordResetConfirm,
      AuthController.confirmPasswordReset
    );

    // ============================================
    //           RECUPERAR NOMBRE USUARIO
    // ============================================
    this.router.post(
      '/recover-username',
      EndpointValidators.validateRecoverUsername,
      AuthController.recoverUsername
    );

    // ============================================
    //                   LOGOUT
    // ============================================
    this.router.post(
      '/logout',
      authenticateToken,
      AuthController.logout
    );

    // ============================================
    //           VER SESIONES ACTIVAS
    // ============================================
    this.router.get(
      '/sessions',
      authenticateToken,
      AuthController.getActiveSessions
    );

    // ============================================
    //       CERRAR TODAS LAS DEMÁS SESIONES
    // ============================================
    this.router.post(
      '/sessions/logout-others',
      authenticateToken,
      AuthController.logoutOtherSessions
    );

    // ============================================
    //             CERRAR 1 SESIÓN POR ID
    // ============================================
    this.router.delete(
      '/sessions/:sessionId',
      authenticateToken,
      AuthController.logoutSession
    );

    // ============================================
    //                REFRESH TOKEN
    // ============================================
    this.router.post(
      '/refresh-token',
      authenticateToken,
      AuthController.refreshToken
    );
  }
}

const authRoutes = new AuthRoutes();
export default authRoutes.router;
