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
    this.handleErrors(); // 🔥 IMPORTANTE: Mover esto al final
  }

  config(): void {
    this.app.set('port', process.env.PORT || 3000);

    // ✅ CORS CORREGIDO - Configuración mejorada
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
          // Permitir requests sin origin (como mobile apps, Postman, curl)
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

    // Middlewares de parsing
    this.app.use(express.json({
      limit: '50mb',
      verify: (req: any, res, buf) => {
        req.rawBody = buf.toString();
      },
    }));
    this.app.use(express.urlencoded({ limit: '50mb', extended: true }));
    
    // Logging
    this.app.use(morgan('combined'));

    // Middlewares globales de validación
    this.app.use(GlobalValidationMiddleware.validateContentType);
    this.app.use(GlobalValidationMiddleware.sanitizeInput);
    this.app.use(GlobalValidationMiddleware.validateJSONSyntax);
  }

  routes(): void {
    // Health check mejorado
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

    // API routes
    this.app.use('/api/users', userRoutes);
    this.app.use('/api/auth', authRoutes);
    this.app.use('/api/clientes', clienteRoutes);
    this.app.use('/api/proveedores', proveedorRoutes);
    this.app.use('/api/productos', productoRoutes);
    this.app.use('/api/movimientos', movimientoRoutes);
    this.app.use('/api/bitacora', bitacoraRoutes);

    // Test endpoint para auth
    this.app.get('/api/auth/test', (req: Request, res: Response) => {
      res.json({
        message: '✅ Endpoint de auth funcionando correctamente',
        timestamp: new Date().toISOString()
      });
    });
  }

  handleErrors(): void {
    // Manejo de rutas no encontradas
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
    this.app.use(
      (err: any, req: Request, res: Response, next: NextFunction) => {
        console.error('❌ Error global no manejado:', err);

        // Si es error de CORS
        if (err.message.includes('CORS')) {
          return res.status(403).json({
            code: 1,
            message: 'Acceso CORS denegado',
            details: err.message
          });
        }

        res.status(err.status || 500).json({
          code: 1,
          message: err.message || 'Error interno del servidor',
          stack: process.env.NODE_ENV === 'development' ? err.stack : undefined,
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

      // Manejo graceful de shutdown
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
  // 1) If a connection string exists, parse it first
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

  // 2) Override/complete from explicit DB_* variables
  if (process.env.DB_HOST) process.env.PGHOST = process.env.DB_HOST;
  if (process.env.DB_PORT) process.env.PGPORT = process.env.DB_PORT;
  if (process.env.DB_USER) process.env.PGUSER = process.env.DB_USER;
  if (process.env.DB_PASSWORD) process.env.PGPASSWORD = process.env.DB_PASSWORD;
  if (process.env.DB_NAME) process.env.PGDATABASE = process.env.DB_NAME;

  // 3) Log database config (without password)
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
    const express = require('express');
    const app = express();
    
    // Configuración básica de CORS para el servidor de diagnóstico
    app.use(cors({
      origin: true,
      credentials: true
    }));
    
    app.get('/', (req: Request, res: Response) => {
      res.json({ 
        status: 'degraded',
        message: 'Service running in degraded mode - Check server logs',
        timestamp: new Date().toISOString()
      });
    });
    
    app.get('/health', (req: Request, res: Response) => {
      res.json({ 
        status: 'degraded',
        message: 'Database connection failed - Running in degraded mode',
        timestamp: new Date().toISOString()
      });
    });
    
    const port = process.env.PORT || 3000;
    app.listen(port, () => {
      console.log(`🟡 Degraded server listening on port ${port}`);
      console.log(`🔍 Please check the database connection and environment variables`);
    });
  } catch (e) {
    console.error('❌ Failed to start degraded server:', e);
    
    // Última defensa: servidor HTTP básico
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