// src/routes/proveedor-routes.ts
import { Router } from 'express';
import { ProveedorController } from '../controllers/proveedores-controller';
import { GlobalValidationMiddleware } from '../middleware/globalValidation.middleware';

class ProveedorRoutes {
  public router: Router = Router();

  constructor() {
    this.config();
  }

  config() {
    this.router.use(GlobalValidationMiddleware.sanitizeInput);
    this.router.use(GlobalValidationMiddleware.validateJSONSyntax);

    this.router.get('/', ProveedorController.getAll);
    this.router.get('/:id', ProveedorController.getById);
    this.router.post('/', ProveedorController.create);
    this.router.put('/:id', ProveedorController.update);
    this.router.delete('/:id', ProveedorController.delete);
  }
}

const proveedorRoutes = new ProveedorRoutes();
export default proveedorRoutes.router;
