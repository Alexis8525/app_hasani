jest.mock('../../src/helpers/notify', () => ({
    sendEmail: jest.fn().mockResolvedValue(undefined),
    sendSMS: jest.fn().mockResolvedValue(undefined),
  }));
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const auth_controller_1 = require("../../src/controllers/auth-controller");
// Mock de las dependencias
jest.mock('../../src/models/user-models');
jest.mock('../../src/models/session-model');
jest.mock('../../src/models/passwordReset-model');
jest.mock('../../src/helpers/security');
jest.mock('../../src/helpers/notify');
jest.mock('bcrypt');
// Importar los mocks después de mockearlos
const { UserModel } = require('../../src/models/user-models');
const { SessionModel } = require('../../src/models/session-model');
const { PasswordResetModel } = require('../../src/models/passwordReset-model');
const securityHelpers = require('../../src/helpers/security');
const notifyHelpers = require('../../src/helpers/notify');
const bcrypt = require('bcrypt');
describe('AuthController', () => {
    let mockRequest;
    let mockResponse;
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
        jest.clearAllMocks();
    });
    describe('login', () => {
        it('debería retornar 401 cuando el usuario no existe', async () => {
            UserModel.findByEmailFull.mockResolvedValue(null);
            mockRequest.body = { email: 'test@test.com', password: 'wrongpassword' };
            await auth_controller_1.AuthController.login(mockRequest, mockResponse);
            expect(mockResponse.status).toHaveBeenCalledWith(401);
            expect(mockResponse.json).toHaveBeenCalledWith({
                message: 'Credenciales inválidas'
            });
        });
        it('debería retornar 401 cuando la contraseña es incorrecta', async () => {
            const mockUser = {
                id: 1,
                email: 'test@test.com',
                password: 'hashedpassword',
                two_factor_enabled: false,
                role: 'user'
            };
            UserModel.findByEmailFull.mockResolvedValue(mockUser);
            bcrypt.compare.mockResolvedValue(false);
            mockRequest.body = { email: 'test@test.com', password: 'wrongpassword' };
            await auth_controller_1.AuthController.login(mockRequest, mockResponse);
            expect(mockResponse.status).toHaveBeenCalledWith(401);
            expect(mockResponse.json).toHaveBeenCalledWith({
                message: 'Credenciales inválidas'
            });
        });
        it('debería retornar 409 cuando ya existe una sesión activa', async () => {
            const mockUser = {
                id: 1,
                email: 'test@test.com',
                password: 'hashedpassword',
                two_factor_enabled: false,
                role: 'user'
            };
            const mockActiveSession = [{
                    id: 1,
                    created_at: new Date(),
                    device_info: 'Test Device',
                    ip_address: '127.0.0.1'
                }];
            UserModel.findByEmailFull.mockResolvedValue(mockUser);
            bcrypt.compare.mockResolvedValue(true);
            SessionModel.findActiveByUserId.mockResolvedValue(mockActiveSession);
            mockRequest.body = { email: 'test@test.com', password: 'correctpassword' };
            await auth_controller_1.AuthController.login(mockRequest, mockResponse);
            expect(mockResponse.status).toHaveBeenCalledWith(409);
            expect(mockResponse.json).toHaveBeenCalledWith({
                message: 'Ya hay una sesión activa. Cierre la sesión actual antes de iniciar una nueva.',
                code: 'ACTIVE_SESSION_EXISTS',
                existing_session: {
                    id: mockActiveSession[0].id,
                    created_at: mockActiveSession[0].created_at,
                    device_info: mockActiveSession[0].device_info,
                    ip_address: mockActiveSession[0].ip_address
                }
            });
        });
        it('debería requerir 2FA cuando está habilitado', async () => {
            const mockUser = {
                id: 1,
                email: 'test@test.com',
                password: 'hashedpassword',
                two_factor_enabled: true,
                role: 'user',
                phone: '+1234567890'
            };
            UserModel.findByEmailFull.mockResolvedValue(mockUser);
            bcrypt.compare.mockResolvedValue(true);
            SessionModel.findActiveByUserId.mockResolvedValue([]);
            securityHelpers.generateOTP
                .mockReturnValueOnce('123456') // OTP
                .mockReturnValueOnce('654321'); // offline PIN
            securityHelpers.generateTempToken.mockReturnValue('temp-token-123');
            PasswordResetModel.create.mockResolvedValue(undefined);
            notifyHelpers.sendEmail.mockResolvedValue(undefined);
            notifyHelpers.sendSMS.mockResolvedValue(undefined);
            mockRequest.body = {
                email: 'test@test.com',
                password: 'correctpassword',
                device_info: 'Test Device',
                ip_address: '127.0.0.1'
            };
            await auth_controller_1.AuthController.login(mockRequest, mockResponse);
            expect(mockResponse.status).toHaveBeenCalledWith(200);
            expect(mockResponse.json).toHaveBeenCalledWith({
                message: '2FA requerido',
                requires2fa: true,
                tempToken: 'temp-token-123',
                offlinePin: '654321'
            });
        });
        it('debería hacer login exitoso sin 2FA', async () => {
            const mockUser = {
                id: 1,
                email: 'test@test.com',
                password: 'hashedpassword',
                two_factor_enabled: false,
                role: 'user'
            };
            const mockSession = {
                id: 1,
                created_at: new Date(),
                expires_at: new Date(Date.now() + 60 * 60 * 1000)
            };
            UserModel.findByEmailFull.mockResolvedValue(mockUser);
            bcrypt.compare.mockResolvedValue(true);
            SessionModel.findActiveByUserId.mockResolvedValue([]);
            securityHelpers.generateToken.mockReturnValue('jwt-token-123');
            securityHelpers.extractJwtSignature.mockReturnValue('signature');
            SessionModel.create.mockResolvedValue(mockSession);
            mockRequest.body = {
                email: 'test@test.com',
                password: 'correctpassword',
                device_info: 'Test Device',
                ip_address: '127.0.0.1'
            };
            await auth_controller_1.AuthController.login(mockRequest, mockResponse);
            expect(mockResponse.json).toHaveBeenCalledWith({
                message: 'Login exitoso',
                token: 'jwt-token-123',
                user: { id: 1, email: 'test@test.com', role: 'user' },
                session: {
                    id: 1,
                    created_at: mockSession.created_at,
                    expires_at: mockSession.expires_at
                }
            });
        });
    });
    describe('verify2FA', () => {
        it('debería retornar 400 cuando el token OTP es inválido', async () => {
            PasswordResetModel.findValidByTokenAndOtp.mockResolvedValue(null);
            mockRequest.body = {
                tempToken: 'invalid-token',
                otp: 'wrong-otp'
            };
            await auth_controller_1.AuthController.verify2FA(mockRequest, mockResponse);
            expect(mockResponse.status).toHaveBeenCalledWith(400);
            expect(mockResponse.json).toHaveBeenCalledWith({
                message: 'Token o código 2FA inválido o expirado'
            });
        });
        it('debería verificar 2FA exitosamente', async () => {
            const mockReset = {
                id: 1,
                user_id: 1
            };
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
            PasswordResetModel.findValidByTokenAndOtp.mockResolvedValue(mockReset);
            PasswordResetModel.markUsed.mockResolvedValue(undefined);
            UserModel.findById.mockResolvedValue(mockUser);
            securityHelpers.generateToken.mockReturnValue('final-token-123');
            securityHelpers.extractJwtSignature.mockReturnValue('signature');
            SessionModel.create.mockResolvedValue(mockSession);
            mockRequest.body = {
                tempToken: 'valid-token',
                otp: '123456',
                device_info: 'Test Device',
                ip_address: '127.0.0.1'
            };
            await auth_controller_1.AuthController.verify2FA(mockRequest, mockResponse);
            expect(mockResponse.json).toHaveBeenCalledWith({
                message: '2FA verificado',
                token: 'final-token-123',
                user: { id: 1, email: 'test@test.com', role: 'user' },
                session: {
                    id: 1,
                    created_at: mockSession.created_at,
                    expires_at: mockSession.expires_at
                }
            });
        });
    });
    describe('Manejo de errores', () => {
        it('debería manejar errores internos del servidor en login', async () => {
            UserModel.findByEmailFull.mockRejectedValue(new Error('Database error'));
            mockRequest.body = { email: 'test@test.com', password: 'password' };
            await auth_controller_1.AuthController.login(mockRequest, mockResponse);
            expect(mockResponse.status).toHaveBeenCalledWith(500);
            expect(mockResponse.json).toHaveBeenCalledWith({
                message: 'Error en login',
                error: 'Database error'
            });
        });
    });
});
