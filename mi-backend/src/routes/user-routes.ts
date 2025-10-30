import { Router } from 'express';
import { UserController } from '../controllers/user-controller';
import { EndpointValidators, ValidationMiddleware } from '../middleware/endpointValidators';
import { GlobalValidationMiddleware } from '../middleware/globalValidation.middleware';

class UserRoutes {
  public router: Router = Router();

  constructor() {
    this.config();
  }

  config() {
    // Aplicar middleware global a todas las rutas
    this.router.use(ValidationMiddleware.sanitizeInput);
    this.router.use(GlobalValidationMiddleware.validateJSONSyntax);

    // GET /users - Listar todos los usuarios
    this.router.get('/', UserController.getUsuarios);

    this.router.post('/', EndpointValidators.validateCreateUser, UserController.crearUsuario);

    this.router.put('/:email', EndpointValidators.validateUpdateUser, UserController.updateUsuario);

    this.router.delete('/:email', UserController.deleteUsuario);

    this.router.post(
      '/regenerate-offline-pin',
      EndpointValidators.validateEmailRequired,
      UserController.regenerateOfflinePin
    );

    this.router.post(
      '/generate-offline-pin',
      EndpointValidators.validateEmailRequired,
      UserController.generateOfflinePinForExistingUser
    );

    this.router.get('/:email/active-offline-pins', UserController.getActiveOfflinePins);

    this.router.post(
      '/revoke-offline-pin',
      EndpointValidators.validateRevokePin,
      UserController.revokeOfflinePin
    );

    this.router.get('/qr-code', UserController.getQrCodeForPin);
  }
}

const userRoutes = new UserRoutes();
export default userRoutes.router;
