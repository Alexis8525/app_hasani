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
        //this.router.post('/login', UserController.login);
    }
}

const usuarioRoutes = new UsuarioRoutes();
export default usuarioRoutes.router;
