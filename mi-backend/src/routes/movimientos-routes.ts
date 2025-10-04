// src/routes/movimiento-routes.ts
import { Router } from 'express';
import { MovimientoController } from '../controllers/movimientos-controller';
import { GlobalValidationMiddleware } from '../middleware/globalValidation.middleware';

class MovimientoRoutes {
  public router: Router = Router();

  constructor() {
    this.config();
  }

  config() {
    this.router.use(GlobalValidationMiddleware.sanitizeInput);
    this.router.use(GlobalValidationMiddleware.validateJSONSyntax);

    this.router.get('/', MovimientoController.getAll);
    this.router.get('/:id', MovimientoController.getById);
    this.router.post('/', MovimientoController.create);
    this.router.get('/producto/:productoId', MovimientoController.getByProducto);
    this.router.get('/report/date-range', MovimientoController.getByDateRange);
  }
}

const movimientoRoutes = new MovimientoRoutes();
export default movimientoRoutes.router;
