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
    this.handleErrors(); // se ejecuta al final
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

    console.log('🌐 Origins permitidos en CORS:', allowedOrigins);

    this.app.use(
      cors({
        origin: function (origin, callback) {
          // Permitir requests sin origin (Postman, curl, etc.)
          if (!origin) return callback(null, true);

          if (allowedOrigins.indexOf(origin) === -1) {
            const msg = `The CORS policy for this site does not allow access from the specified Origin: ${origin}`;
            console.warn('🚫 CORS bloqueado para:', origin);
            return callback(new Error(msg), false);
          }
          return callback(null, true);
        },
        methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
        credentials: true,
        allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'Accept', 'Origin']
      })
    );

    // body parsers
    this.app.use(express.json({
      limit: '50mb',
      verify: (req: any, res, buf) => { req.rawBody = buf.toString(); }
    }));
    this.app.use(express.urlencoded({ limit: '50mb', extended: true }));

    // Logging
    this.app.use(morgan('combined'));

    // --- Debug logger para requests (útil en Render logs) ---
    this.app.use((req: Request, res: Response, next: NextFunction) => {
      // limitar tamaño de body mostrado
      const bodyPreview = (() => {
        try {
          const b = (req as any).rawBody || req.body;
          if (!b) return null;
          const s = typeof b === 'string' ? b : JSON.stringify(b);
          return s.length > 400 ? s.slice(0, 400) + '... (truncated)' : s;
        } catch {
          return null;
        }
      })();

      console.log(`➡️ REQUEST ${req.method} ${req.originalUrl} | Content-Type: ${req.headers['content-type'] || 'none'} | bodyPreview: ${bodyPreview}`);
      next();
    });

    // Middleware globales de validación (pueden causar que una petición sea detenida)
    // Para DEBUG/DEPLOY rápido: permite desactivarlos con SKIP_GLOBAL_VALIDATION=true
    const skipValidation = String(process.env.SKIP_GLOBAL_VALIDATION || '').toLowerCase() === 'true';
    if (skipValidation) {
      console.warn('⚠️ SKIP_GLOBAL_VALIDATION=true → se omiten middlewares de validación global (temporal).');
    } else {
      // envolver cada middleware en try/catch para asegurar que responda correctamente si lanza error
      this.app.use((req: Request, res: Response, next: NextFunction) => {
        try {
          return GlobalValidationMiddleware.validateContentType(req as any, res as any, next as any);
        } catch (err) {
          console.error('❌ Error en validateContentType (capturado):', err);
          return res.status(400).json({ message: 'Invalid Content-Type or validation error' });
        }
      });

      this.app.use((req: Request, res: Response, next: NextFunction) => {
        try {
          return GlobalValidationMiddleware.sanitizeInput(req as any, res as any, next as any);
        } catch (err) {
          console.error('❌ Error en sanitizeInput (capturado):', err);
          return res.status(400).json({ message: 'Input sanitization error' });
        }
      });

      this.app.use((req: Request, res: Response, next: NextFunction) => {
        try {
          return GlobalValidationMiddleware.validateJSONSyntax(req as any, res as any, next as any);
        } catch (err) {
          console.error('❌ Error en validateJSONSyntax (capturado):', err);
          return res.status(400).json({ message: 'Invalid JSON syntax' });
        }
      });
    }
  }

  routes(): void {
    // Health check
    this.app.get('/health', (req: Request, res: Response) => {
      res.status(200).json({
        status: 'OK',
        message: 'Backend de Sistema de Inventarios funcionando correctamente',
        timestamp: new Date().toISOString(),
        uptime: process.uptime(),
        environment: process.env.NODE_ENV || 'development',
        version: '1.0.0'
      });
    });

    // Root
    this.app.get('/', (req: Request, res: Response) => {
      res.json({
        message: '¡Backend de Sistema de Inventarios Hasani funcionando! 🚀',
        version: '1.0.0',
        timestamp: new Date().toISOString(),
        endpoints: {
          docs: '/api-docs',
          health: '/health',
          auth: '/api/auth',
          users: '/api/users',
          clientes: '/api/clientes',
          productos: '/api/productos',
          movimientos: '/api/movimientos'
        }
      });
    });

    // Montar rutas API (las tuyas)
    this.app.use('/api/users', userRoutes);
    this.app.use('/api/auth', authRoutes);
    this.app.use('/api/clientes', clienteRoutes);
    this.app.use('/api/proveedores', proveedorRoutes);
    this.app.use('/api/productos', productoRoutes);
    this.app.use('/api/movimientos', movimientoRoutes);
    this.app.use('/api/bitacora', bitacoraRoutes);

    // Si quieres una ruta de prueba dentro del router, puedes definir aquí una GET simple:
    // Esto ayuda a verificar si /api/auth/test responde sin depender del router
    this.app.get('/api/auth/test', (req: Request, res: Response) => {
      res.json({
        message: '✅ Endpoint de auth funcionando correctamente (desde index.ts)',
        timestamp: new Date().toISOString()
      });
    });
  }

  handleErrors(): void {
    // Manejo de rutas no encontradas (catch-all)
    this.app.use('*', (req: Request, res: Response) => {
      res.status(404).json({
        code: 1,
        message: `Ruta no encontrada: ${req.method} ${req.originalUrl}`,
        suggested: {
          docs: '/api-docs',
          health: '/health'
        }
      });
    });

    // Manejo global de errores
    this.app.use((err: any, req: Request, res: Response, next: NextFunction) => {
      console.error('❌ Error global no manejado:', err && err.stack ? err.stack : err);

      if (err && String(err.message || '').toLowerCase().includes('cors')) {
        return res.status(403).json({
          code: 1,
          message: 'Acceso CORS denegado',
          details: err.message
        });
      }

      res.status(err && err.status ? err.status : 500).json({
        code: 1,
        message: err && err.message ? err.message : 'Error interno del servidor',
        stack: process.env.NODE_ENV === 'development' ? (err && err.stack) : undefined
      });
    });
  }

  swaggerDocs(): void {
    try {
      const swaggerPath = path.join(process.cwd(), 'dist', 'docs', 'swagger.yaml');

      if (fs.existsSync(swaggerPath)) {
        const swaggerSpec = YAML.load(swaggerPath);
        this.app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec));
        console.log('📚 Swagger UI disponible en /api-docs');
      } else {
        console.warn(`⚠️ Swagger YAML no encontrado en ${swaggerPath}. Saltando Swagger UI.`);
      }
    } catch (err) {
      console.warn('⚠️ Error al cargar Swagger YAML, continuando sin docs:', err);
    }
  }

  async start(): Promise<void> {
    try {
      await connectDB();
      console.log('✅ Conexión a la base de datos establecida con éxito');

      const server = this.app.listen(this.app.get('port'), () => {
        console.log(`🚀 Servidor corriendo en el puerto ${this.app.get('port')}`);
        console.log(`🌐 Environment: ${process.env.NODE_ENV || 'development'}`);
        console.log(`📊 Health check: http://localhost:${this.app.get('port')}/health`);
        console.log(`📚 API Docs: http://localhost:${this.app.get('port')}/api-docs`);
      });

      process.on('SIGTERM', () => {
        console.log('🛑 SIGTERM recibido, cerrando servidor gracefully...');
        server.close(() => {
          console.log('✅ Servidor cerrado');
          process.exit(0);
        });
      });

    } catch (error: any) {
      console.error('❌ Error crítico al iniciar el servidor:', error.message);
      process.exit(1);
    }
  }
}

// --- Helpers (DB env, SMTP flag) ---
function applyDatabaseEnvFromRender() {
  const dbUrl = process.env.DATABASE_URL || process.env.DB_URL;
  if (dbUrl) {
    try {
      const u = new URL(dbUrl);
      if (u.username) process.env.PGUSER = decodeURIComponent(u.username);
      if (u.password) process.env.PGPASSWORD = decodeURIComponent(u.password);
      if (u.hostname) process.env.PGHOST = u.hostname;
      if (u.port) process.env.PGPORT = u.port;
      const dbName = u.pathname ? u.pathname.replace(/^\//, '') : '';
      if (dbName) process.env.PGDATABASE = dbName;
      console.log('✅ Database config loaded from connection string');
    } catch (err) {
      console.warn('⚠️ Unable to parse DATABASE_URL, continuing with other env vars.', err);
    }
  }

  if (process.env.DB_HOST) process.env.PGHOST = process.env.DB_HOST;
  if (process.env.DB_PORT) process.env.PGPORT = process.env.DB_PORT;
  if (process.env.DB_USER) process.env.PGUSER = process.env.DB_USER;
  if (process.env.DB_PASSWORD) process.env.PGPASSWORD = process.env.DB_PASSWORD;
  if (process.env.DB_NAME) process.env.PGDATABASE = process.env.DB_NAME;

  console.log('📊 Database configuration:', {
    host: process.env.PGHOST,
    port: process.env.PGPORT,
    user: process.env.PGUSER,
    database: process.env.PGDATABASE,
    hasPassword: !!process.env.PGPASSWORD
  });
}

function ensureSmtpFlag() {
  const hasSmtpHost = !!(process.env.SMTP_HOST || process.env.SMTP_URL || process.env.MAIL_HOST);
  if (!hasSmtpHost) {
    process.env.SKIP_SMTP = 'true';
    console.warn('📧 No SMTP configuration detected. Emails will be skipped (SKIP_SMTP=true).');
  }
}

// --- Startup ---
console.log('🚀 Iniciando servidor de Sistema de Inventarios Hasani...');

applyDatabaseEnvFromRender();
ensureSmtpFlag();

try {
  const server = new Server();
  server.start().catch((error) => {
    console.error('❌ Error durante el inicio del servidor:', error);
    process.exit(1);
  });
} catch (err) {
  console.error('❌ Startup error (degraded mode):', err);

  // degraded server fallback (unchanged)
  try {
    const expressFallback = require('express');
    const appFallback = expressFallback();
    appFallback.use(cors({ origin: true, credentials: true }));
    appFallback.get('/', (req: any, res: any) => res.json({ status: 'degraded', message: 'Service running in degraded mode - Check server logs', timestamp: new Date().toISOString() }));
    appFallback.get('/health', (req: any, res: any) => res.json({ status: 'degraded', message: 'Database connection failed - Running in degraded mode', timestamp: new Date().toISOString() }));
    const port = process.env.PORT || 3000;
    appFallback.listen(port, () => console.log(`🟡 Degraded server listening on port ${port}`));
  } catch (e) {
    console.error('❌ Failed to start degraded server:', e);
    const port = Number(process.env.PORT || 3000);
    http.createServer((req, res) => {
      res.writeHead(200, { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS', 'Access-Control-Allow-Headers': 'Content-Type, Authorization' });
      res.end(JSON.stringify({ status: 'critical', message: 'Service in critical state - Check server initialization', timestamp: new Date().toISOString() }));
    }).listen(port, () => { console.log(`🔴 Basic critical server listening on port ${port}`); });
  }
}
