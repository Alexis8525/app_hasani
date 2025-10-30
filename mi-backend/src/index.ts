// src/index.ts
import express, { Application } from 'express';
import morgan from 'morgan';
import cors from 'cors';
import { connectDB } from './config/db';
import userRoutes from './routes/user-routes';
import authRoutes from './routes/auth-routes';
import clienteRoutes from './routes/clientes-routes';
import proveedorRoutes from './routes/proveedores-routes';
import productoRoutes from './routes/productos-routes';
import movimientoRoutes from './routes/movimientos-routes';
import bitacoraRoutes from './routes/bitacora-routes';
// Swagger
import swaggerUi from 'swagger-ui-express';
import YAML from 'yamljs';
import path from 'path';
import { GlobalValidationMiddleware } from './middleware/globalValidation.middleware';
import './jobs/stock-alert-job';

class Server {
  public app: Application;

  constructor() {
    this.app = express();
    this.config();
    this.routes();
    this.swaggerDocs();
  }

  config(): void {
    this.app.set('port', process.env.PORT || 3000);

    this.app.use(
      express.json({
        limit: '50mb',
        verify: (req: any, res, buf) => {
          req.rawBody = buf.toString(); // 🔑 útil si manejas firmas digitales o webhooks
        },
      })
    );
    this.app.use(express.urlencoded({ limit: '50mb', extended: true }));
    this.app.use(morgan('dev'));

    this.app.use(
      cors({
        origin: process.env.CLIENT_URL || 'http://localhost:4200',
        methods: ['GET', 'POST', 'PUT', 'DELETE'],
        credentials: true,
      })
    );

    // Middlewares globales de validación
    this.app.use(GlobalValidationMiddleware.validateContentType);
    this.app.use(GlobalValidationMiddleware.sanitizeInput);
    this.app.use(GlobalValidationMiddleware.validateJSONSyntax);
  }

  routes(): void {
    this.app.get('/', (req, res) => res.send('¡Hola, mundo!'));
    this.app.use('/api/users', userRoutes);
    this.app.use('/api/auth', authRoutes);
    this.app.use('/api/clientes', clienteRoutes);
    this.app.use('/api/proveedores', proveedorRoutes);
    this.app.use('/api/productos', productoRoutes);
    this.app.use('/api/movimientos', movimientoRoutes);
    this.app.use('/api/bitacora', bitacoraRoutes);
  }

  handleErrors(): void {
    this.app.use('*', (req, res) => {
      res.status(404).json({
        code: 1,
        message: `Ruta no encontrada: ${req.method} ${req.originalUrl}`,
      });
    });

    this.app.use(
      (err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
        console.error('Error global no manejado:', err);

        res.status(err.status || 500).json({
          code: 1,
          message: err.message || 'Error interno del servidor',
          stack: process.env.NODE_ENV === 'development' ? err.stack : undefined,
        });
      }
    );
  }

  swaggerDocs(): void {
    const swaggerPath = path.join(__dirname, './docs/swagger.yaml');
    const swaggerDocument = YAML.load(swaggerPath);

    this.app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerDocument));

    console.log(`📖 Swagger docs en http://localhost:${this.app.get('port')}/api-docs`);
  }

  async start(): Promise<void> {
    try {
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

const server = new Server();
server.start();
