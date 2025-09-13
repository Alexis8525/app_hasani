import express, { Application } from 'express';
import morgan from 'morgan';
import cors from 'cors';
import { connectDB } from './config/db';

class Server {
    public app: Application;

    constructor() {
        this.app = express();
        this.config();
        this.routes();
        this.connectToDatabase();
    }

    config(): void {
        // Puerto
        this.app.set('port', process.env.PORT || 3000);

        // Middlewares
        this.app.use(express.json({ limit: '50mb' }));
        this.app.use(express.urlencoded({ limit: '50mb', extended: true }));
        this.app.use(morgan('dev'));
        this.app.use(cors());
    }

    async connectToDatabase(): Promise<void> {
        try {
            await connectDB();
            console.log('✅ Conexión a la base de datos establecida con éxito');
        } catch (error: any) {
            console.error('❌ Error al conectar a la base de datos:', error.message);
            process.exit(1);
        }
    }

    routes(): void {
        this.app.get('/', (req: any, res: { send: (arg0: string) => any; }) => res.send('¡Hola, mundo!'));
    }

    start(): void {
        this.app.listen(this.app.get('port'), () => {
            console.log(`🚀 Servidor corriendo en el puerto ${this.app.get('port')}`);
        });
    }
}

// Inicializar servidor
const server = new Server();
server.start();
