// src/routes/auth-routes.ts
import { Router } from 'express';
import { AuthController } from '../controllers/auth.controller';

const router = Router();

router.post('/login', AuthController.login);
router.post('/2fa/verify', AuthController.verify2FA);

router.post('/password-reset/request', AuthController.requestPasswordReset);
router.post('/password-reset/confirm', AuthController.confirmPasswordReset);

router.post('/recover-username', AuthController.recoverUsername);

export default router;
