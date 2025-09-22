import { Router } from 'express';
import { UserController } from '../controllers/user-controller';

class UsuarioRoutes {
    public router: Router = Router();

    constructor() {
        this.config();
    }

    config() {
        this.router.get('/', UserController.getUsuarios);         
        this.router.post('/', UserController.crearUsuario);      
        this.router.put('/:email', UserController.updateUsuario);
        this.router.delete('/:email', UserController.deleteUsuario);
        this.router.post('/regenerate-offline-pin', UserController.regenerateOfflinePin);
        this.router.post('/generate-offline-pin', UserController.generateOfflinePinForExistingUser);
        this.router.get('/:email/active-offline-pins', UserController.getActiveOfflinePins);
        this.router.post('/revoke-offline-pin', UserController.revokeOfflinePin);
        this.router.get('/qr-code', UserController.getQrCodeForPin);
        //this.router.post('/login', UserController.login);
    }
}

const usuarioRoutes = new UsuarioRoutes();
export default usuarioRoutes.router;
