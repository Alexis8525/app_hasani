// middleware/globalValidation.middleware.ts
import { Request, Response, NextFunction } from 'express';

export class GlobalValidationMiddleware {
    /**
     * Middleware GLOBAL para validar JSON en TODOS los endpoints
     * Se debe aplicar a nivel de aplicación, no de ruta
     */
    static validateJSONSyntax(err: any, req: Request, res: Response, next: NextFunction) {
        if (err instanceof SyntaxError && 'body' in err) {
            console.log('❌ JSON malformado detectado en:', req.method, req.url);
            
            return res.status(400).json({
                code: 1,
                message: 'JSON malformado. Verifica la sintaxis del cuerpo de la solicitud.',
                details: process.env.NODE_ENV === 'development' ? {
                    error: err.message,
                    position: err.message.match(/position (\d+)/)?.[1] || 'desconocida'
                } : undefined
            });
        }
        next(err);
    }

    /**
     * Middleware para sanitización global
     */
    static sanitizeInput(req: Request, res: Response, next: NextFunction) {
        const sanitizeString = (str: string): string => {
            if (typeof str !== 'string') return str;
            return str.trim().replace(/[<>]/g, '');
        };

        // Sanitizar body
        if (req.body && typeof req.body === 'object') {
            Object.keys(req.body).forEach(key => {
                if (typeof req.body[key] === 'string') {
                    req.body[key] = sanitizeString(req.body[key]);
                }
            });
        }

        // Sanitizar params
        if (req.params) {
            Object.keys(req.params).forEach(key => {
                if (typeof req.params[key] === 'string') {
                    req.params[key] = sanitizeString(req.params[key]);
                }
            });
        }

        // Sanitizar query
        if (req.query) {
            Object.keys(req.query).forEach(key => {
                if (typeof req.query[key] === 'string') {
                    req.query[key] = sanitizeString(req.query[key] as string);
                }
            });
        }

        next();
    }

    /**
     * Middleware para validar Content-Type en endpoints que esperan JSON
     */
    static validateContentType(req: Request, res: Response, next: NextFunction) {
        const methodsWithBody = ['POST', 'PUT', 'PATCH'];
        
        if (methodsWithBody.includes(req.method) && req.headers['content-type']) {
            if (!req.headers['content-type'].includes('application/json')) {
                return res.status(400).json({
                    code: 1,
                    message: 'Content-Type debe ser application/json'
                });
            }
        }
        next();
    }
}