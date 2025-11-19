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
    this.handleErrors(); // debe ir al final
  }

  config(): void {
    this.app.set('port', process.env.PORT || 3000);

    // Orígenes permitidos (usa process.env.CLIENT_URL si lo tienes)
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
          // Permitir requests sin origin (curl, Postman, mobile)
          if (!origin) return callback(null, true);

          if (allowedOrigins.indexOf(origin) === -1) {
            const msg = `The CORS policy for this site does not allow access from the specified Origin: ${origin}`;
            console.warn('🚫 CORS bloqueado para:', origin);
            return callback(new Error(msg), false);
          }
          console.log('✅ CORS permitido para:', origin);
          return callback(null, true);
        },
        methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
        credentials: true,
        allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'Accept', 'Origin']
      })
    );

    // Parsers de body
    this.app.use(express.json({
      limit: '50mb',
      verify: (req: any, res, buf) => {
        req.rawBody = buf.toString();
      },
    }));
    this.app.use(express.urlencoded({ limit: '50mb', extended: true }));

    // Logging
    this.app.use(morgan('combined'));

    // Debug logger (útil en logs de Render)
    this.app.use((req: Request, res: Response, next: NextFunction) => {
      const bodyPreview = (() => {
        try {
          const b = (req as any).rawBody || req.body;
          if (!b) return null;
          const s = typeof b === 'string' ? b : JSON.stringify(b);
          return s.length > 300 ? s.slice(0, 300) + '... (truncated)' : s;
        } catch {
          return null;
        }
      })();

      console.log(`➡️ REQUEST ${req.method} ${req.originalUrl} | Content-Type: ${req.headers['content-type'] || 'none'} | bodyPreview: ${bodyPreview}`);
      next();
    });

    // Nota: no aplicamos aquí los validadores globales directamente porque
    // algunas implementaciones están tipadas como error-handlers (4 args).
    // Los aplicaremos **después** de montar rutas para evitar bloquear requests
    // como curl/postman antes de que lleguen a los routers.
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

    // Root endpoint
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

    // Montar routers (ANTES de aplicar el handler 404)
    this.app.use('/api/users', userRoutes);
    this.app.use('/api/auth', authRoutes);
    this.app.use('/api/clientes', clienteRoutes);
    this.app.use('/api/proveedores', proveedorRoutes);
    this.app.use('/api/productos', productoRoutes);
    this.app.use('/api/movimientos', movimientoRoutes);
    this.app.use('/api/bitacora', bitacoraRoutes);

    // Test endpoints útiles
    this.app.get('/api/auth/test', (req: Request, res: Response) => {
      res.json({
        message: '✅ Endpoint de auth funcionando correctamente',
        timestamp: new Date().toISOString()
      });
    });

    this.app.post('/api/test-post', (req: Request, res: Response) => {
      res.json({ ok: true, received: req.body || null });
    });

    // --- Ahora aplicamos las validaciones globales opcionalmente ---
    // Permite desactivar con SKIP_GLOBAL_VALIDATION=true cuando hagas pruebas
    const skipValidation = String(process.env.SKIP_GLOBAL_VALIDATION || '').toLowerCase() === 'true';
    if (skipValidation) {
      console.warn('⚠️ SKIP_GLOBAL_VALIDATION=true → Omitiendo validaciones globales (temporal)');
    } else {
      // IMPORTANTE: validar con llamada que satisface la firma de 4 args si el
      // validador está tipado como error-handler (err, req, res, next)
      this.app.use((req: Request, res: Response, next: NextFunction) => {
        try {
          // Llamamos con `undefined` como primer argumento para cumplir la firma
          (GlobalValidationMiddleware.validateContentType as any)(undefined, req, res, next);
        } catch (err) {
          console.error('❌ Error en validateContentType (capturado):', err);
          return res.status(400).json({ message: 'Invalid Content-Type or validation error' });
        }
      });

      this.app.use((req: Request, res: Response, next: NextFunction) => {
        try {
          (GlobalValidationMiddleware.sanitizeInput as any)(undefined, req, res, next);
        } catch (err) {
          console.error('❌ Error en sanitizeInput (capturado):', err);
          return res.status(400).json({ message: 'Input sanitization error' });
        }
      });

      this.app.use((req: Request, res: Response, next: NextFunction) => {
        try {
          (GlobalValidationMiddleware.validateJSONSyntax as any)(undefined, req, res, next);
        } catch (err) {
          console.error('❌ Error en validateJSONSyntax (capturado):', err);
          return res.status(400).json({ message: 'Invalid JSON syntax' });
        }
      });
    }
  }

  handleErrors(): void {
    // Reemplazo de this.app.use('*', ...) que rompe en Node 22 / Express 5
    this.app.use((req: Request, res: Response) => {
      res.status(404).json({
        code: 1,
        message: `Ruta no encontrada: ${req.method} ${req.originalUrl}`,
        suggested: {
          docs: '/api-docs',
          health: '/health'
        }
      });
    });

    // Error handler con 4 argumentos (necesario para TS/Express)
    this.app.use(function (err: any, req: Request, res: Response, next: NextFunction) {
      console.error('❌ Error global no manejado:', err && (err.stack || err));

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
        stack: process.env.NODE_ENV === 'development' ? (err && err.stack) : undefined,
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

// --- Helper functions for environment setup ---
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

// --- Startup sequence ---
console.log('🚀 Iniciando servidor de Sistema de Inventarios Hasani...');

// Apply environment configuration
applyDatabaseEnvFromRender();
ensureSmtpFlag();

// Safe startup with error handling
try {
  const server = new Server();
  server.start().catch((error) => {
    console.error('❌ Error durante el inicio del servidor:', error);
    process.exit(1);
  });
} catch (err) {
  console.error('❌ Startup error (degraded mode):', err);

  // Levantar un servidor mínimo para diagnóstico
  try {
    const expressFallback = require('express');
    const appFallback = expressFallback();

    appFallback.use(cors({
      origin: true,
      credentials: true
    }));

    appFallback.get('/', (req: Request, res: Response) => {
      res.json({
        status: 'degraded',
        message: 'Service running in degraded mode - Check server logs',
        timestamp: new Date().toISOString()
      });
    });

    appFallback.get('/health', (req: Request, res: Response) => {
      res.json({
        status: 'degraded',
        message: 'Database connection failed - Running in degraded mode',
        timestamp: new Date().toISOString()
      });
    });

    const port = process.env.PORT || 3000;
    appFallback.listen(port, () => {
      console.log(`🟡 Degraded server listening on port ${port}`);
      console.log(`🔍 Please check the database connection and environment variables`);
    });
  } catch (e) {
    console.error('❌ Failed to start degraded server:', e);

    const port = Number(process.env.PORT || 3000);
    http.createServer((req, res) => {
      res.writeHead(200, {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization'
      });

      const response = {
        status: 'critical',
        message: 'Service in critical state - Check server initialization',
        timestamp: new Date().toISOString()
      };

      res.end(JSON.stringify(response));
    }).listen(port, () => {
      console.log(`🔴 Basic critical server listening on port ${port}`);
    });
  }
}
