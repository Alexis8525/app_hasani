// src/routes/bitacora-routes.ts
import { Router } from 'express';
import { BitacoraController } from '../controllers/bitacora-controller';
import { GlobalValidationMiddleware } from '../middleware/globalValidation.middleware';

class BitacoraRoutes {
  public router: Router = Router();

  constructor() {
    this.config();
  }

  config() {
    this.router.use(GlobalValidationMiddleware.sanitizeInput);
    this.router.use(GlobalValidationMiddleware.validateJSONSyntax);

    this.router.get('/', BitacoraController.getAll);
    this.router.post('/', BitacoraController.create);
    this.router.post('/movimiento', BitacoraController.getByMovimiento);
    this.router.post('/proveedor', BitacoraController.getByProveedor);
  }
}

const bitacoraRoutes = new BitacoraRoutes();
export default bitacoraRoutes.router;
