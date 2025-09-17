// src/index.ts
import express, { Application } from 'express';
import morgan from 'morgan';
import cors from 'cors';
import { connectDB } from './config/db';
import userRoutes from './routes/user-routes';

class Server {
  public app: Application;

  constructor() {
    this.app = express();
    this.config();
    this.routes();
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

  routes(): void {
    this.app.get('/', (req, res) => res.send('¡Hola, mundo!'));
    this.app.use('/api/users', userRoutes);
  }

  async start(): Promise<void> {
    try {
      // Espera a que la DB esté conectada antes de iniciar el servidor
      await connectDB();
      console.log('✅ Conexión a la base de datos establecida con éxito');

      this.app.listen(this.app.get('port'), () => {
        console.log(`🚀 Servidor corriendo en el puerto ${this.app.get('port')}`);
      });
    } catch (error: any) {
      console.error('❌ Error al iniciar el servidor:', error.message);
      process.exit(1);
    }
  }
}

// Inicializar servidor
const server = new Server();
server.start();
