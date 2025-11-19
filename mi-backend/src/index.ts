// src/index.ts
import express, { Application, Request, Response, NextFunction } from 'express';
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
import fs from 'fs';
import path from 'path';
import YAML from 'yamljs';
import http from 'http';
import { GlobalValidationMiddleware } from './middleware/globalValidation.middleware';
import './jobs/stock-alert-job';

class Server {
  public app: Application;

  constructor() {
    this.app = express();
    this.config();
    this.routes();
    this.swaggerDocs();

    // ⬇ mover al final SIEMPRE
    this.handleErrors();
  }

  config(): void {
    this.app.set('port', process.env.PORT || 3000);

    // CORS
    const allowedOrigins = [
      'https://app-hasani-11ms.onrender.com',
      'http://localhost:4200',
      'http://localhost:3000',
      process.env.CLIENT_URL
    ].filter(Boolean);

    this.app.use(
      cors({
        origin: true,
        credentials: true,
      })
    );

    // Body parsing
    this.app.use(
      express.json({
        limit: '50mb',
        verify: (req: any, res, buf) => {
          req.rawBody = buf.toString();
        },
      })
    );
    this.app.use(express.urlencoded({ limit: '50mb', extended: true }));

    // Logging
    this.app.use(morgan('combined'));
  }

  routes(): void {

    // Health check
    this.app.get('/health', (req: Request, res: Response) => {
      res.status(200).json({
        status: 'OK',
        message: 'Backend corriendo correctamente',
        timestamp: new Date().toISOString(),
      });
    });

    // Endpoint raíz
    this.app.get('/', (req: Request, res: Response) => {
      res.json({
        message: 'Backend Sistema de Inventarios Hasani funcionando 🚀',
        version: '1.0.0'
      });
    });

    // ============================
    //  MONTAJE DE RUTAS
    // ============================
    this.app.use('/api/auth', authRoutes);
    this.app.use('/api/users', userRoutes);
    this.app.use('/api/clientes', clienteRoutes);
    this.app.use('/api/proveedores', proveedorRoutes);
    this.app.use('/api/productos', productoRoutes);
    this.app.use('/api/movimientos', movimientoRoutes);
    this.app.use('/api/bitacora', bitacoraRoutes);

    // Test obligado para probar POST fácil
    this.app.post('/api/test-post', (req, res) => {
      res.json({ status: 'OK', body: req.body });
    });

    // ⚠ IMPORTANTE:
    // Middlewares de validación van DESPUÉS de las rutas
    this.app.use(GlobalValidationMiddleware.validateContentType);
    this.app.use(GlobalValidationMiddleware.sanitizeInput);
    this.app.use(GlobalValidationMiddleware.validateJSONSyntax);
  }

  handleErrors(): void {
    // 404
    this.app.use('*', (req: Request, res: Response) => {
      res.status(404).json({
        code: 1,
        message: `Ruta no encontrada: ${req.method} ${req.originalUrl}`,
      });
    });

    // Error global
    this.app.use(
      (err: any, req: Request, res: Response, next: NextFunction) => {
        console.error('❌ Error global:', err);
        res.status(err.status || 500).json({
          code: 1,
          message: err.message || 'Error interno del servidor',
        });
      }
    );
  }

  swaggerDocs(): void {
    try {
      const swaggerPath = path.join(process.cwd(), 'dist', 'docs', 'swagger.yaml');

      if (fs.existsSync(swaggerPath)) {
        const swaggerSpec = YAML.load(swaggerPath);
        this.app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec));
      }
    } catch {}
  }

  async start(): Promise<void> {
    try {
      await connectDB();
      console.log('DB conectada correctamente');

      const port = this.app.get('port');

      this.app.listen(port, () => {
        console.log(`🚀 Servidor en puerto ${port}`);
      });

    } catch (error: any) {
      console.error('❌ Error crítico al iniciar:', error.message);
      process.exit(1);
    }
  }
}

new Server().start();
