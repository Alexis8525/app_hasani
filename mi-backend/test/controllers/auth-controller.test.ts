// test/controllers/auth-controller.test.ts
import { Request, Response } from 'express';
import { AuthController } from '../../src/controllers/auth-controller';
import { AuthenticatedRequest } from '../../src/middleware/auth.middleware';

// Mock de las dependencias
jest.mock('../../src/models/user-models');
jest.mock('../../src/models/session-model');
jest.mock('../../src/models/passwordReset-model');
jest.mock('../../src/helpers/security');
jest.mock('bcrypt');
jest.mock('crypto');

// Mock más específico para notify para evitar logs post-test
jest.mock('../../src/helpers/notify', () => ({
  sendEmail: jest.fn().mockResolvedValue(undefined),
  sendSMS: jest.fn().mockResolvedValue(undefined),
}));

// Importar los mocks después de mockearlos
const { UserModel } = require('../../src/models/user-models');
const { SessionModel } = require('../../src/models/session-model');
const { PasswordResetModel } = require('../../src/models/passwordReset-model');
const securityHelpers = require('../../src/helpers/security');
const { sendEmail, sendSMS } = require('../../src/helpers/notify');
const bcrypt = require('bcrypt');
const crypto = require('crypto');

// Mock console methods
const originalConsoleLog = console.log;
const originalConsoleError = console.error;
const originalConsoleWarn = console.warn;

describe('AuthController', () => {
  let mockRequest: Partial<Request>;
  let mockResponse: Partial<Response>;
  let mockAuthenticatedRequest: Partial<AuthenticatedRequest>;

  beforeEach(() => {
    mockResponse = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn().mockReturnThis(),
    };

    mockRequest = {
      body: {},
      headers: {},
      ip: '127.0.0.1',
    };

    mockAuthenticatedRequest = {
      user: { id: 1, role: 'user' },
      headers: {},
      session: {
        device_info: 'Test Device',
        ip_address: '127.0.0.1',
        latitude: 40.7128,
        longitude: -74.0060
      }
    };

    // Mock console methods
    console.log = jest.fn();
    console.error = jest.fn();
    console.warn = jest.fn();

    jest.clearAllMocks();
  });

  afterEach(() => {
    // Restaurar console methods
    console.log = originalConsoleLog;
    console.error = originalConsoleError;
    console.warn = originalConsoleWarn;
  });

  // ... (tus tests existentes de login y verify2FA se mantienen igual) ...

  describe('verifyOffline', () => {
    it('debería retornar 400 cuando faltan email o PIN', async () => {
      mockRequest.body = { email: '' };

      await AuthController.verifyOffline(mockRequest as Request, mockResponse as Response);

      expect(mockResponse.status).toHaveBeenCalledWith(400);
      expect(mockResponse.json).toHaveBeenCalledWith({
        message: 'Email y PIN son requeridos'
      });
    });

    it('debería retornar 400 cuando el PIN es inválido', async () => {
      PasswordResetModel.verifyOffline.mockResolvedValue(null);

      mockRequest.body = {
        email: 'test@test.com',
        offlinePin: 'wrong-pin'
      };

      await AuthController.verifyOffline(mockRequest as Request, mockResponse as Response);

      expect(mockResponse.status).toHaveBeenCalledWith(400);
      expect(mockResponse.json).toHaveBeenCalledWith({
        message: 'PIN offline inválido o expirado'
      });
    });

    it('debería hacer login offline exitoso', async () => {
      const mockReset = { id: 1 };
      const mockUser = {
        id: 1,
        email: 'test@test.com',
        role: 'user'
      };
      const mockSession = {
        id: 1,
        created_at: new Date(),
        expires_at: new Date(Date.now() + 60 * 60 * 1000)
      };

      PasswordResetModel.verifyOffline.mockResolvedValue(mockReset);
      PasswordResetModel.markUsed.mockResolvedValue(undefined);
      UserModel.findByEmail.mockResolvedValue(mockUser);
      securityHelpers.generateToken.mockReturnValue('offline-token-123');
      securityHelpers.extractJwtSignature.mockReturnValue('signature');
      SessionModel.create.mockResolvedValue(mockSession);

      mockRequest.body = {
        email: 'test@test.com',
        offlinePin: 'valid-pin',
        device_info: 'Test Device',
        ip_address: '127.0.0.1'
      };

      await AuthController.verifyOffline(mockRequest as Request, mockResponse as Response);

      expect(mockResponse.json).toHaveBeenCalledWith({
        message: 'Login offline exitoso',
        token: 'offline-token-123',
        user: { id: 1, email: 'test@test.com', role: 'user' },
        session: {
          id: 1,
          created_at: mockSession.created_at,
          expires_at: mockSession.expires_at,
          session_type: 'offline'
        }
      });
    });
  });

  describe('requestPasswordReset', () => {
    it('debería manejar reset de password por email', async () => {
      const mockUser = {
        id: 1,
        email: 'test@test.com',
        phone: '+1234567890'
      };

      UserModel.findByEmailFull.mockResolvedValue(mockUser);
      crypto.randomBytes.mockReturnValue({ toString: () => 'random-token-123' });
      PasswordResetModel.create.mockResolvedValue(undefined);
      sendEmail.mockResolvedValue(undefined);

      mockRequest.body = {
        email: 'test@test.com',
        via: 'email'
      };

      await AuthController.requestPasswordReset(mockRequest as Request, mockResponse as Response);

      expect(mockResponse.json).toHaveBeenCalledWith({
        message: 'Recibirás instrucciones para restablecer la contraseña'
      });
    });

    it('debería manejar reset de password por SMS', async () => {
      const mockUser = {
        id: 1,
        email: 'test@test.com',
        phone: '+1234567890'
      };

      UserModel.findByEmailFull.mockResolvedValue(mockUser);
      securityHelpers.generateOTP.mockReturnValue('123456');
      crypto.randomBytes.mockReturnValue({ toString: () => 'random-token-123' });
      PasswordResetModel.create.mockResolvedValue(undefined);
      sendSMS.mockResolvedValue(undefined);

      mockRequest.body = {
        email: 'test@test.com',
        via: 'sms'
      };

      await AuthController.requestPasswordReset(mockRequest as Request, mockResponse as Response);

      expect(mockResponse.json).toHaveBeenCalledWith({
        message: 'Recibirás instrucciones para restablecer la contraseña'
      });
    });

    it('debería retornar éxito incluso si el usuario no existe', async () => {
      UserModel.findByEmailFull.mockResolvedValue(null);

      mockRequest.body = {
        email: 'nonexistent@test.com',
        via: 'email'
      };

      await AuthController.requestPasswordReset(mockRequest as Request, mockResponse as Response);

      expect(mockResponse.status).toHaveBeenCalledWith(200);
      expect(mockResponse.json).toHaveBeenCalledWith({
        message: 'Si existe la cuenta, se enviará un correo'
      });
    });
  });

  describe('confirmPasswordReset', () => {
    it('debería retornar 400 cuando falta el token', async () => {
      mockRequest.body = { newPassword: 'newPassword123' };

      await AuthController.confirmPasswordReset(mockRequest as Request, mockResponse as Response);

      expect(mockResponse.status).toHaveBeenCalledWith(400);
      expect(mockResponse.json).toHaveBeenCalledWith({
        message: 'Falta el token'
      });
    });

    it('debería retornar 400 cuando el token es inválido', async () => {
      PasswordResetModel.findValidByToken.mockResolvedValue(null);

      mockRequest.body = {
        token: 'invalid-token',
        newPassword: 'newPassword123'
      };

      await AuthController.confirmPasswordReset(mockRequest as Request, mockResponse as Response);

      expect(mockResponse.status).toHaveBeenCalledWith(400);
      expect(mockResponse.json).toHaveBeenCalledWith({
        message: 'Token inválido o expirado'
      });
    });

    it('debería retornar 400 cuando el formato de contraseña es inválido', async () => {
      const mockReset = { id: 1, user_id: 1 };
      PasswordResetModel.findValidByToken.mockResolvedValue(mockReset);
      UserModel.validatePasswordFormat.mockReturnValue(false);

      mockRequest.body = {
        token: 'valid-token',
        newPassword: 'weak'
      };

      await AuthController.confirmPasswordReset(mockRequest as Request, mockResponse as Response);

      expect(mockResponse.status).toHaveBeenCalledWith(400);
      expect(mockResponse.json).toHaveBeenCalledWith({
        message: 'Formato de contraseña inválido'
      });
    });

    it('debería confirmar el reset de contraseña exitosamente', async () => {
      const mockReset = { id: 1, user_id: 1 };
      PasswordResetModel.findValidByToken.mockResolvedValue(mockReset);
      UserModel.validatePasswordFormat.mockReturnValue(true);
      bcrypt.hash.mockResolvedValue('hashed-new-password');
      const mockPool = { query: jest.fn().mockResolvedValue(undefined) };
      jest.doMock('../../src/config/db', () => ({ pool: mockPool }));
      PasswordResetModel.markUsed.mockResolvedValue(undefined);

      mockRequest.body = {
        token: 'valid-token',
        newPassword: 'ValidPassword123!'
      };

      await AuthController.confirmPasswordReset(mockRequest as Request, mockResponse as Response);

      expect(mockResponse.json).toHaveBeenCalledWith({
        message: 'Contraseña restablecida correctamente'
      });
    });
  });

  describe('recoverUsername', () => {
    it('debería recuperar username por email', async () => {
      const mockUser = {
        id: 1,
        email: 'test@test.com',
        phone: '+1234567890'
      };

      UserModel.findByEmail.mockResolvedValue(mockUser);
      sendEmail.mockResolvedValue(undefined);

      mockRequest.body = {
        emailOrPhone: 'test@test.com'
      };

      await AuthController.recoverUsername(mockRequest as Request, mockResponse as Response);

      expect(mockResponse.json).toHaveBeenCalledWith({
        message: 'Si existe, recibirás la información'
      });
    });

    it('debería recuperar username por teléfono', async () => {
      const mockUser = {
        id: 1,
        email: 'test@test.com',
        phone: '+1234567890'
      };

      // Mock para la consulta directa a la base de datos
      const mockPool = { 
        query: jest.fn().mockResolvedValue({ rows: [mockUser] }) 
      };
      jest.doMock('../../src/config/db', () => ({ pool: mockPool }));
      sendSMS.mockResolvedValue(undefined);

      mockRequest.body = {
        emailOrPhone: '+1234567890'
      };

      await AuthController.recoverUsername(mockRequest as Request, mockResponse as Response);

      expect(mockResponse.json).toHaveBeenCalledWith({
        message: 'Si existe, recibirás la información'
      });
    });

    it('debería retornar éxito incluso si el usuario no existe', async () => {
      UserModel.findByEmail.mockResolvedValue(null);

      mockRequest.body = {
        emailOrPhone: 'nonexistent@test.com'
      };

      await AuthController.recoverUsername(mockRequest as Request, mockResponse as Response);

      expect(mockResponse.status).toHaveBeenCalledWith(200);
      expect(mockResponse.json).toHaveBeenCalledWith({
        message: 'Si existe, recibirás la información'
      });
    });
  });

  describe('logout', () => {
    it('debería cerrar sesión exitosamente', async () => {
      mockAuthenticatedRequest.headers = {
        authorization: 'Bearer valid-token'
      };

      SessionModel.invalidate.mockResolvedValue(undefined);

      await AuthController.logout(mockAuthenticatedRequest as AuthenticatedRequest, mockResponse as Response);

      expect(mockResponse.json).toHaveBeenCalledWith({
        message: 'Sesión cerrada exitosamente'
      });
    });

    it('debería manejar logout sin token', async () => {
      mockAuthenticatedRequest.headers = {};

      await AuthController.logout(mockAuthenticatedRequest as AuthenticatedRequest, mockResponse as Response);

      expect(mockResponse.json).toHaveBeenCalledWith({
        message: 'Sesión cerrada exitosamente'
      });
    });
  });

  describe('getActiveSessions', () => {
    it('debería obtener sesiones activas', async () => {
      const mockSessions = [{
        id: 1,
        device_info: 'Test Device',
        ip_address: '127.0.0.1',
        created_at: new Date(),
        last_activity: new Date(),
        expires_at: new Date(Date.now() + 60 * 60 * 1000),
        latitude: 40.7128,
        longitude: -74.0060
      }];

      SessionModel.findActiveByUserId.mockResolvedValue(mockSessions);

      await AuthController.getActiveSessions(mockAuthenticatedRequest as AuthenticatedRequest, mockResponse as Response);

      expect(mockResponse.json).toHaveBeenCalledWith({
        sessions: [{
          id: 1,
          device_info: 'Test Device',
          ip_address: '127.0.0.1',
          created_at: mockSessions[0].created_at,
          last_activity: mockSessions[0].last_activity,
          expires_at: mockSessions[0].expires_at,
          location: {
            lat: 40.7128,
            lng: -74.0060
          }
        }],
        total: 1
      });
    });

    it('debería manejar sesiones sin ubicación', async () => {
      const mockSessions = [{
        id: 1,
        device_info: 'Test Device',
        ip_address: '127.0.0.1',
        created_at: new Date(),
        last_activity: new Date(),
        expires_at: new Date(Date.now() + 60 * 60 * 1000),
        latitude: null,
        longitude: null
      }];

      SessionModel.findActiveByUserId.mockResolvedValue(mockSessions);

      await AuthController.getActiveSessions(mockAuthenticatedRequest as AuthenticatedRequest, mockResponse as Response);

      expect(mockResponse.json).toHaveBeenCalledWith({
        sessions: [{
          id: 1,
          device_info: 'Test Device',
          ip_address: '127.0.0.1',
          created_at: mockSessions[0].created_at,
          last_activity: mockSessions[0].last_activity,
          expires_at: mockSessions[0].expires_at,
          location: null
        }],
        total: 1
      });
    });
  });

  describe('logoutOtherSessions', () => {
    it('debería cerrar otras sesiones exitosamente', async () => {
      const mockSessions = [
        { id: 1, token: 'current-token' },
        { id: 2, token: 'other-token-1' },
        { id: 3, token: 'other-token-2' }
      ];

      mockAuthenticatedRequest.headers = {
        authorization: 'Bearer current-token'
      };

      SessionModel.findActiveByUserId.mockResolvedValue(mockSessions);
      SessionModel.invalidate.mockResolvedValue(undefined);

      await AuthController.logoutOtherSessions(mockAuthenticatedRequest as AuthenticatedRequest, mockResponse as Response);

      expect(SessionModel.invalidate).toHaveBeenCalledWith('other-token-1');
      expect(SessionModel.invalidate).toHaveBeenCalledWith('other-token-2');
      expect(SessionModel.invalidate).not.toHaveBeenCalledWith('current-token');
      expect(mockResponse.json).toHaveBeenCalledWith({
        message: 'Otras sesiones cerradas exitosamente'
      });
    });
  });

  describe('logoutSession', () => {
    it('debería cerrar una sesión específica', async () => {
      const mockSessions = [
        { id: 1, token: 'token-1' },
        { id: 2, token: 'token-2' }
      ];

      mockAuthenticatedRequest.params = { sessionId: '2' };

      SessionModel.findActiveByUserId.mockResolvedValue(mockSessions);
      SessionModel.invalidate.mockResolvedValue(undefined);

      await AuthController.logoutSession(mockAuthenticatedRequest as AuthenticatedRequest, mockResponse as Response);

      expect(SessionModel.invalidate).toHaveBeenCalledWith('token-2');
      expect(mockResponse.json).toHaveBeenCalledWith({
        message: 'Sesión cerrada exitosamente'
      });
    });

    it('debería retornar 404 cuando la sesión no existe', async () => {
      const mockSessions = [
        { id: 1, token: 'token-1' }
      ];

      mockAuthenticatedRequest.params = { sessionId: '999' };

      SessionModel.findActiveByUserId.mockResolvedValue(mockSessions);

      await AuthController.logoutSession(mockAuthenticatedRequest as AuthenticatedRequest, mockResponse as Response);

      expect(mockResponse.status).toHaveBeenCalledWith(404);
      expect(mockResponse.json).toHaveBeenCalledWith({
        message: 'Sesión no encontrada'
      });
    });
  });

  describe('refreshToken', () => {
    it('debería renovar el token exitosamente', async () => {
      mockAuthenticatedRequest.headers = {
        authorization: 'Bearer old-token'
      };

      SessionModel.invalidate.mockResolvedValue(undefined);
      securityHelpers.generateToken.mockReturnValue('new-token-123');
      securityHelpers.extractJwtSignature.mockReturnValue('signature');
      const mockSession = {
        id: 1,
        expires_at: new Date(Date.now() + 60 * 60 * 1000)
      };
      SessionModel.create.mockResolvedValue(mockSession);

      await AuthController.refreshToken(mockAuthenticatedRequest as AuthenticatedRequest, mockResponse as Response);

      expect(SessionModel.invalidate).toHaveBeenCalledWith('old-token');
      expect(mockResponse.json).toHaveBeenCalledWith({
        message: 'Token renovado',
        token: 'new-token-123',
        expires_at: mockSession.expires_at
      });
    });

    it('debería retornar 400 cuando falta el token', async () => {
      mockAuthenticatedRequest.headers = {};

      await AuthController.refreshToken(mockAuthenticatedRequest as AuthenticatedRequest, mockResponse as Response);

      expect(mockResponse.status).toHaveBeenCalledWith(400);
      expect(mockResponse.json).toHaveBeenCalledWith({
        message: 'Token requerido'
      });
    });
  });
});
