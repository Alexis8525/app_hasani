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

    this.router.get('/', ClienteController.getAll);
    this.router.get('/:id', ClienteController.getById);
    this.router.post('/', ClienteController.create);
    this.router.put('/:id', ClienteController.update);
    this.router.delete('/:id', ClienteController.delete);
    this.router.get('/user/:userId', ClienteController.getByUser);
  }
}

const clienteRoutes = new ClienteRoutes();
export default clienteRoutes.router;
