// src/routes/cliente-routes.ts
import { Router } from 'express';
import { ClienteController } from '../controllers/clientes-controller';
import { GlobalValidationMiddleware } from '../middleware/globalValidation.middleware';

class ClienteRoutes {
  public router: Router = Router();

  constructor() {
    this.config();
  }

  config() {
    this.router.use(GlobalValidationMiddleware.sanitizeInput);
    this.router.use(GlobalValidationMiddleware.validateJSONSyntax);

    this.router.get('/', ClienteController.getAll)
    this.router.post('/buscar', ClienteController.getByNombre)
    this.router.post('/', ClienteController.create)
    this.router.put('/', ClienteController.update) // Sin parámetro en la ruta
    this.router.delete('/', ClienteController.delete) // Sin parámetro en la ruta
    this.router.post('/user', ClienteController.getByUser) // Cambiar a POST
  }
}

const clienteRoutes = new ClienteRoutes();
export default clienteRoutes.router;
