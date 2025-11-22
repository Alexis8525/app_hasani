// src/middleware/globalValidation.middleware.ts
import { Request, Response, NextFunction } from 'express';

export class GlobalValidationMiddleware {
  /**
   * Middleware para validar JSON correctamente formateado
   * (middleware normal: req, res, next)
   */
  static validateJSONSyntax(req: Request, res: Response, next: NextFunction) {
    try {
      // Si guardaste rawBody (en index.ts), intentar parsearlo para detectar JSON malformado.
      const raw = (req as any).rawBody;
      if (raw && typeof raw === 'string' && raw.trim().length > 0) {
        JSON.parse(raw);
      }
      // Si no hay rawBody, no hacemos nada especial (express.json ya hace parse)
      next();
    } catch (err: any) {
      console.log('❌ JSON malformado detectado en:', req.method, req.url);
      return res.status(400).json({
        code: 1,
        message: 'JSON malformado. Verifica la sintaxis del cuerpo de la solicitud.',
        details:
          process.env.NODE_ENV === 'development'
            ? { error: err?.message || String(err) }
            : undefined,
      });
    }
  }

  /**
   * Sanitización global: recorre body, query y params y limpia strings.
   */
  static sanitizeInput(req: Request, res: Response, next: NextFunction) {
    const sanitizeString = (s: unknown): string => {
      if (typeof s !== 'string') return String(s ?? '');
      // elimina <> y trim
      return s.trim().replace(/[<>]/g, '');
    };

    const walkAndSanitize = (obj: any) => {
      if (!obj || typeof obj !== 'object') return;
      Object.keys(obj).forEach((key) => {
        const val = obj[key];
        if (typeof val === 'string') {
          obj[key] = sanitizeString(val);
        } else if (Array.isArray(val)) {
          obj[key] = val.map((v) => (typeof v === 'string' ? sanitizeString(v) : v));
        } else if (val && typeof val === 'object') {
          walkAndSanitize(val);
        }
      });
    };

    // Sanitizar body, params y query si existen
    if (req.body && typeof req.body === 'object') walkAndSanitize(req.body);
    if (req.params && typeof req.params === 'object') walkAndSanitize(req.params);
    if (req.query && typeof req.query === 'object') walkAndSanitize(req.query);

    next();
  }

  /**
   * Validar Content-Type en requests con body
   */
  static validateContentType(req: Request, res: Response, next: NextFunction) {
    const methodsWithBody = ['POST', 'PUT', 'PATCH'];
    if (methodsWithBody.includes(req.method)) {
      const ct = req.headers['content-type'];
      if (ct && typeof ct === 'string' && !ct.includes('application/json')) {
        return res.status(400).json({
          code: 1,
          message: 'Content-Type debe ser application/json',
        });
      }
    }
    next();
  }
}
