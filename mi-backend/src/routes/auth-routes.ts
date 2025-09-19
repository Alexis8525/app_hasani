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

    this.router.post('/password-reset/request', AuthController.requestPasswordReset);
    this.router.post('/password-reset/confirm', AuthController.confirmPasswordReset);

    this.router.post('/recover-username', AuthController.recoverUsername);
  }
}

const authRoutes = new AuthRoutes();
export default authRoutes.router;
