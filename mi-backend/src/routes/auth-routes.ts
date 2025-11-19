// src/routes/auth-routes.ts
import { Router } from 'express';
import { AuthController } from '../controllers/auth-controller';

const router = Router();

router.post('/login', AuthController.login);
router.post('/2fa/verify', AuthController.verify2FA); // si existe
router.post('/verify-offline', AuthController.verifyOffline); // si existe

// simple test
router.get('/test-login-simple', (_req, res) => {
  res.json({ ok: true, message: 'auth route OK' });
});

export default router;
