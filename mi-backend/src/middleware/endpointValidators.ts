// middleware/validation.middleware.ts
import { Request, Response, NextFunction } from 'express';
import { UserModel } from '../models/user-models';

export class ValidationMiddleware {
  static validateEmailFormat(req: Request, res: Response, next: NextFunction) {
    const { email } = req.body;
    if (email) {
      const result = UserModel.validateEmail(email);
      if (!result.valid) return res.status(400).json({ code: 1, message: result.message });
    }
    next();
  }

  

  static validatePasswordFormat(req: Request, res: Response, next: NextFunction) {
    const { password } = req.body;
    if (password) {
      const result = UserModel.validatePasswordFormat(password);
      if (!result.valid) return res.status(400).json({ code: 1, message: result.message });
    }
    next();
  }

  static validatePhoneFormat(req: Request, res: Response, next: NextFunction) {
    const { phone } = req.body;
    if (phone) {
      const result = UserModel.validatePhone(phone);
      if (!result.valid) return res.status(400).json({ code: 1, message: result.message });
    }
    next();
  }

  static validateIdParam(req: Request, res: Response, next: NextFunction) {
    const { id } = req.params;

    if (id && isNaN(Number(id))) {
      return res.status(400).json({
        code: 1,
        message: 'ID debe ser un número válido',
      });
    }
    next();
  }

  static validateEmailParam(req: Request, res: Response, next: NextFunction) {
    const { email } = req.params;

    if (email && !UserModel.validateEmail(email)) {
      return res.status(400).json({
        code: 1,
        message: 'Formato de correo electrónico inválido en parámetro',
      });
    }
    next();
  }

  static validateRoleFormat(req: Request, res: Response, next: NextFunction) {
    const { role } = req.body;
    if (role) {
      const result = UserModel.validateRole(role);
      if (!result.valid) return res.status(400).json({ code: 1, message: result.message });
    }
    next();
  }

  static validatePinFormatMiddleware(req: Request, res: Response, next: NextFunction) {
    const { offlinePin } = req.body;
    if (offlinePin) {
      const result = UserModel.validatePinFormat(offlinePin);
      if (!result.valid) return res.status(400).json({ code: 1, message: result.message });
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
      Object.keys(req.body).forEach((key) => {
        if (typeof req.body[key] === 'string') {
          req.body[key] = sanitizeString(req.body[key]);
        }
      });
    }

    // Sanitizar params
    if (req.params) {
      Object.keys(req.params).forEach((key) => {
        if (typeof req.params[key] === 'string') {
          req.params[key] = sanitizeString(req.params[key]);
        }
      });
    }

    // Sanitizar query
    if (req.query) {
      Object.keys(req.query).forEach((key) => {
        if (typeof req.query[key] === 'string') {
          req.query[key] = sanitizeString(req.query[key] as string);
        }
      });
    }

    next();
  }
  static validateRequiredFields(fields: string[]) {
    return (req: Request, res: Response, next: NextFunction) => {
      const missingFields = fields.filter((field) => !req.body[field]);

      if (missingFields.length > 0) {
        return res.status(400).json({
          code: 1,
          message: `Campos obligatorios faltantes: ${missingFields.join(', ')}`,
        });
      }
      next();
    };
  }
}

export const EndpointValidators = {
  validateLogin: [
    ValidationMiddleware.validateRequiredFields(['email', 'password']),
    ValidationMiddleware.validateEmailFormat,
    ValidationMiddleware.validatePasswordFormat,
  ],

  validateRegister: [
    ValidationMiddleware.validateRequiredFields(['email', 'password', 'role', 'phone']),
    ValidationMiddleware.validateEmailFormat,
    ValidationMiddleware.validatePasswordFormat,
    ValidationMiddleware.validatePhoneFormat,
    ValidationMiddleware.validateRoleFormat,
    ValidationMiddleware.sanitizeInput,
  ],

  validate2FA: [
    ValidationMiddleware.validateRequiredFields(['tempToken', 'otp']),
    (req: Request, res: Response, next: NextFunction) => {
      const { otp } = req.body;
      if (!UserModel.validateOTP(otp)) {
        return res.status(400).json({
          code: 1,
          message: 'El código OTP debe tener 6 dígitos numéricos',
        });
      }
      next();
    },
  ],

  validateCreateUser: [
    ValidationMiddleware.validateRequiredFields(['email', 'password', 'role', 'phone']),
    ValidationMiddleware.validateEmailFormat,
    ValidationMiddleware.validatePasswordFormat,
    ValidationMiddleware.validatePhoneFormat,
    ValidationMiddleware.validateRoleFormat,
  ],
  validateUpdateUser: [
    (req: Request, res: Response, next: NextFunction) => {
      const { newEmail, role, password, phone } = req.body;

      if (newEmail) {
        const result = UserModel.validateEmail(newEmail);
        if (!result.valid) return res.status(400).json({ code: 1, message: result.message });
      }

      if (role) {
        const result = UserModel.validateRole(role);
        if (!result.valid) return res.status(400).json({ code: 1, message: result.message });
      }

      if (password) {
        const result = UserModel.validatePasswordFormat(password);
        if (!result.valid) return res.status(400).json({ code: 1, message: result.message });
      }

      if (phone) {
        const result = UserModel.validatePhone(phone);
        if (!result.valid) return res.status(400).json({ code: 1, message: result.message });
      }

      next();
    },
  ],

  validateOfflineLogin: [
    ValidationMiddleware.validateRequiredFields(['email', 'offlinePin']),
    ValidationMiddleware.validateEmailFormat,
    ValidationMiddleware.validatePinFormatMiddleware,
  ],

  validatePasswordResetRequest: [
    ValidationMiddleware.validateRequiredFields(['email']),
    ValidationMiddleware.validateEmailFormat,
    (req: Request, res: Response, next: NextFunction) => {
      const { via } = req.body;
      if (via && !['email', 'sms'].includes(via)) {
        return res.status(400).json({ code: 1, message: 'El método debe ser "email" o "sms"' });
      }
      next();
    },
  ],
  validateEmailRequired: [ValidationMiddleware.validateRequiredFields(['email'])],

  validateRevokePin: [ValidationMiddleware.validateRequiredFields(['email', 'pin'])],

  validatePasswordResetConfirm: [
    ValidationMiddleware.validateRequiredFields(['token', 'newPassword']),
  ],

  validateRecoverUsername: [ValidationMiddleware.validateRequiredFields(['emailOrPhone'])],
};
