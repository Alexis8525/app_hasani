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
    try {
      // runtime path to the built swagger file (works when running node dist/index.js)
      const swaggerPath = path.join(process.cwd(), 'dist', 'docs', 'swagger.yaml');

      if (fs.existsSync(swaggerPath)) {
        const swaggerSpec = YAML.load(swaggerPath);
        this.app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec));
      } else {
        console.warn(`Swagger YAML not found at ${swaggerPath}. Skipping swagger UI.`);
      }
    } catch (err) {
      console.warn('Failed to load swagger YAML, continuing without API docs:', err);
    }
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

// --- New startup helpers ---
function applyDatabaseUrlEnv() {
	// If DATABASE_URL is provided, parse and export PG* env vars for libraries that use them
	const dbUrl = process.env.DATABASE_URL;
	if (!dbUrl) return;
	try {
		const u = new URL(dbUrl);
		if (u.username) process.env.PGUSER = decodeURIComponent(u.username);
		if (u.password) process.env.PGPASSWORD = decodeURIComponent(u.password);
		if (u.hostname) process.env.PGHOST = u.hostname;
		if (u.port) process.env.PGPORT = u.port;
		const dbName = u.pathname ? u.pathname.replace(/^\//, '') : '';
		if (dbName) process.env.PGDATABASE = dbName;
	} catch (err) {
		console.warn('Unable to parse DATABASE_URL, continuing with existing env vars.', err);
	}
}

function ensureSmtpFlag() {
	// If no SMTP config is present, set SKIP_SMTP so mailer modules can avoid connecting to localhost
	const hasSmtpHost = !!(process.env.SMTP_HOST || process.env.SMTP_URL || process.env.MAIL_HOST);
	if (!hasSmtpHost) {
		process.env.SKIP_SMTP = 'true';
		console.warn('No SMTP configuration detected. Emails will be skipped (SKIP_SMTP=true).');
	}
}

// Apply helpers before constructing Server (so dependent modules see env changes)
applyDatabaseUrlEnv();
ensureSmtpFlag();

// Safe startup: captura errores de inicialización para que el proceso no termine si hay fallos no críticos
try {
	const server = new Server();
	server.start();
} catch (err) {
	console.error('Startup error (degraded mode):', err);
	// Levantar un servidor mínimo para que la instancia esté viva y pueda inspeccionarse
	try {
		const express = require('express');
		const app = express();
		app.get('/', (_req: any, res: any) => res.send('Service running in degraded mode'));
		const p = process.env.PORT || 3000;
		app.listen(p, () => console.log(`Degraded server listening on ${p}`));
	} catch (e) {
		console.error('Failed to start degraded server:', e);
		// última defensa: crear un servidor HTTP básico
		const p = Number(process.env.PORT || 3000);
		http.createServer((req, res) => {
			res.writeHead(200, { 'Content-Type': 'text/plain' });
			res.end('Service running in degraded mode\n');
		}).listen(p, () => console.log(`Basic degraded server listening on ${p}`));
	}
}
