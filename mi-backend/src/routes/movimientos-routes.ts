// src/routes/movimiento-routes.ts
import { Router } from 'express';
import { MovimientoController, StockController } from '../controllers/movimientos-controller';
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
    this.router.post('/buscar', MovimientoController.getById);
    this.router.post('/', MovimientoController.create);
    this.router.post('/producto', MovimientoController.getByProducto);
    this.router.post('/report/date-range', MovimientoController.getByDateRange);
    this.router.post('/stock/verificar-alertas', StockController.verificarStockBajoManual);
    this.router.get('/stock/bajo', StockController.obtenerProductosStockBajo);
  }
}

const movimientoRoutes = new MovimientoRoutes();
export default movimientoRoutes.router;
