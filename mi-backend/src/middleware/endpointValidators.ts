// middleware/validation.middleware.ts
import { Request, Response, NextFunction } from 'express';
import { UserModel } from '../models/user.models';

export class ValidationMiddleware {

    static validateEmailFormat(req: Request, res: Response, next: NextFunction) {
      const { email } = req.body;
      
      if (email && !UserModel.validateEmail(email)) {
        return res.status(400).json({
          code: 1,
          message: 'Formato de correo electrónico inválido o dominio no permitido'
        });
      }
      next();
    }
  
    static validatePasswordFormat(req: Request, res: Response, next: NextFunction) {
      const { password } = req.body;
      
      if (password && !UserModel.validatePasswordFormat(password)) {
        return res.status(400).json({
          code: 1,
          message: 'La contraseña debe tener al menos 8 caracteres, una mayúscula, un número y un símbolo especial'
        });
      }
      next();
    }
  
    static validatePhoneFormat(req: Request, res: Response, next: NextFunction) {
      const { phone } = req.body;
      
      if (phone && !UserModel.validatePhone(phone)) {
        return res.status(400).json({
          code: 1,
          message: 'Formato de teléfono inválido. Solo números, 10-15 dígitos'
        });
      }
      next();
    }
  
    static validateIdParam(req: Request, res: Response, next: NextFunction) {
      const { id } = req.params;
      
      if (id && isNaN(Number(id))) {
        return res.status(400).json({
          code: 1,
          message: 'ID debe ser un número válido'
        });
      }
      next();
    }
  
    static validateEmailParam(req: Request, res: Response, next: NextFunction) {
      const { email } = req.params;
      
      if (email && !UserModel.validateEmail(email)) {
        return res.status(400).json({
          code: 1,
          message: 'Formato de correo electrónico inválido en parámetro'
        });
      }
      next();
    }
  
    static sanitizeInput(req: Request, res: Response, next: NextFunction) {
      // Sanitizar strings para prevenir inyecciones
      const sanitizeString = (str: string): string => {
        if (typeof str !== 'string') return str;
        return str.trim().replace(/[<>]/g, '');
      };
  
      // Sanitizar body
      if (req.body) {
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
    static validateRequiredFields(fields: string[]) {
      return (req: Request, res: Response, next: NextFunction) => {
          const missingFields = fields.filter(field => !req.body[field]);
          
          if (missingFields.length > 0) {
              return res.status(400).json({
                  code: 1,
                  message: `Campos obligatorios faltantes: ${missingFields.join(', ')}`
              });
          }
          next();
      };
  }}

export const EndpointValidators = {
    validateLogin: [
        ValidationMiddleware.validateRequiredFields(['email', 'password']),
        ValidationMiddleware.validateEmailFormat,
        (req: Request, res: Response, next: NextFunction) => {
            const { password } = req.body;
            if (password && password.length < 1) {
                return res.status(400).json({
                    code: 1,
                    message: 'La contraseña es requerida'
                });
            }
            next();
        }
    ],

    validate2FA: [
        ValidationMiddleware.validateRequiredFields(['tempToken', 'otp']),
        (req: Request, res: Response, next: NextFunction) => {
            const { otp } = req.body;
            if (!UserModel.validateOTP(otp)) {
                return res.status(400).json({
                    code: 1,
                    message: 'El código OTP debe tener 6 dígitos numéricos'
                });
            }
            next();
        }
    ],

    validateCreateUser: [
        ValidationMiddleware.validateRequiredFields(['email', 'password', 'role', 'phone']),
        ValidationMiddleware.validateEmailFormat,
        ValidationMiddleware.validatePasswordFormat,
        ValidationMiddleware.validatePhoneFormat,
        (req: Request, res: Response, next: NextFunction) => {
            const { role } = req.body;
            if (!UserModel.validateRole(role)) {
                return res.status(400).json({
                    code: 1,
                    message: 'Rol inválido. Los roles válidos son: admin, user'
                });
            }
            next();
        }
    ],

    validateUpdateUser: [
        ValidationMiddleware.validateEmailFormat,
        (req: Request, res: Response, next: NextFunction) => {
            const { newEmail, role, password, phone } = req.body;
            
            if (newEmail && !UserModel.validateEmail(newEmail)) {
                return res.status(400).json({
                    code: 1,
                    message: 'Nuevo correo electrónico inválido'
                });
            }
            
            if (role && !UserModel.validateRole(role)) {
                return res.status(400).json({
                    code: 1,
                    message: 'Rol inválido'
                });
            }
            
            if (password && !UserModel.validatePasswordFormat(password)) {
                return res.status(400).json({
                    code: 1,
                    message: 'Formato de contraseña inválido'
                });
            }
            
            if (phone && !UserModel.validatePhone(phone)) {
                return res.status(400).json({
                    code: 1,
                    message: 'Formato de teléfono inválido'
                });
            }
            
            next();
        }
    ],

    validateOfflineLogin: [
        ValidationMiddleware.validateRequiredFields(['email', 'offlinePin']),
        ValidationMiddleware.validateEmailFormat,
        (req: Request, res: Response, next: NextFunction) => {
            const { offlinePin } = req.body;
            if (!UserModel.validatePinFormat(offlinePin)) {
                return res.status(400).json({
                    code: 1,
                    message: 'El PIN offline debe tener 6 dígitos numéricos'
                });
            }
            next();
        }
    ],

    validatePasswordResetRequest: [
        ValidationMiddleware.validateRequiredFields(['email']),
        ValidationMiddleware.validateEmailFormat,
        (req: Request, res: Response, next: NextFunction) => {
            const { via } = req.body;
            if (via && !['email', 'sms'].includes(via)) {
                return res.status(400).json({
                    code: 1,
                    message: 'El método debe ser "email" o "sms"'
                });
            }
            next();
        }
    ],

    validateEmailRequired: [
        ValidationMiddleware.validateRequiredFields(['email']),
    ],

    validateRevokePin: [
        ValidationMiddleware.validateRequiredFields(['email', 'pin']),
    ],

    validatePasswordResetConfirm: [
        ValidationMiddleware.validateRequiredFields(['token', 'newPassword']),
    ],

    validateRecoverUsername: [
        ValidationMiddleware.validateRequiredFields(['emailOrPhone']),
    ],
};
