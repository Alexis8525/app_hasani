// src/routes/producto-routes.ts
import { Router } from 'express';
import { ProductoController } from '../controllers/productos-controller';
import { GlobalValidationMiddleware } from '../middleware/globalValidation.middleware';

class ProductoRoutes {
  public router: Router = Router();

  constructor() {
    this.config();
  }

  config() {
    this.router.use(GlobalValidationMiddleware.sanitizeInput);
    this.router.use(GlobalValidationMiddleware.validateJSONSyntax);

    this.router.get('/', ProductoController.getAll);
    this.router.post('/buscar', ProductoController.getByNombre);
    this.router.post('/', ProductoController.create);
    this.router.put('/', ProductoController.update); // Sin parámetro en la ruta
    this.router.delete('/', ProductoController.delete); // Sin parámetro en la ruta
    this.router.get('/inventory/low-stock', ProductoController.getLowStock);
  }
}

const productoRoutes = new ProductoRoutes();
export default productoRoutes.router;
