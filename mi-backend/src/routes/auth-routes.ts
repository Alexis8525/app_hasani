// src/routes/auth-routes.ts
import { Router } from 'express';
import { AuthController } from '../controllers/auth.controller';

class AuthRoutes {
  public router: Router = Router();

  constructor() {
    this.config();
  }

  config() {
    this.router.post('/login', AuthController.login);
    this.router.post('/2fa/verify', AuthController.verify2FA);
    this.router.post('/verify-offline', AuthController.verifyOffline);

    this.router.post('/password-reset/request', AuthController.requestPasswordReset);
    this.router.get("/password-reset/confirm", (req, res) => {
      const { token } = req.query;
      return res.send(`
        <html>
          <head>
            <title>Restablecer contraseña</title>
          </head>
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
    this.router.post('/password-reset/confirm', AuthController.confirmPasswordReset);

    this.router.post('/recover-username', AuthController.recoverUsername);
  }
}

const authRoutes = new AuthRoutes();
export default authRoutes.router;
