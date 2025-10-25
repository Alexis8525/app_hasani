// test/controllers/user-controller.test.ts
import { Request, Response } from 'express';
import { UserController } from '../../src/controllers/user-controller';
import { UserModel } from '../../src/models/user-models';
import { pool } from '../../src/config/db';
import { sendEmail } from '../../src/helpers/notify';
import QRCode from 'qrcode';

jest.mock('../../src/models/user-models');
jest.mock('../../src/helpers/notify');
jest.mock('qrcode');
jest.mock('../../src/config/db');

describe('UserController', () => {
  let req: Partial<Request>;
  let res: Partial<Response>;
  let statusMock: jest.Mock;
  let jsonMock: jest.Mock;

  beforeEach(() => {
    req = { body: {}, params: {}, query: {} };
    statusMock = jest.fn().mockReturnThis();
    jsonMock = jest.fn();
    res = {
      status: statusMock,
      json: jsonMock
    };
    jest.clearAllMocks();
  });

  describe('crearUsuario', () => {
    it('debe retornar 400 si faltan campos obligatorios', async () => {
      req.body = {};
      await UserController.crearUsuario(req as Request, res as Response);
      expect(statusMock).toHaveBeenCalledWith(400);
      expect(jsonMock).toHaveBeenCalledWith({
        message: 'Email, password, role y phone son obligatorios'
      });
    });

    it('debe retornar 400 si email es inválido', async () => {
      req.body = { email: 'abc', password: 'Aa123456!', role: 'admin', phone: '1234567890' };
      (UserModel.validateEmail as jest.Mock).mockReturnValue(false);

      await UserController.crearUsuario(req as Request, res as Response);
      expect(statusMock).toHaveBeenCalledWith(400);
      expect(jsonMock).toHaveBeenCalledWith({ message: 'Correo electrónico inválido' });
    });

    it('debe retornar 400 si contraseña es inválida', async () => {
      req.body = { email: 'test@test.com', password: '123', role: 'admin', phone: '1234567890' };
      (UserModel.validateEmail as jest.Mock).mockReturnValue(true);
      (UserModel.validatePasswordFormat as jest.Mock).mockReturnValue(false);

      await UserController.crearUsuario(req as Request, res as Response);
      expect(statusMock).toHaveBeenCalledWith(400);
      expect(jsonMock).toHaveBeenCalledWith({
        message: 'Contraseña inválida. Debe tener al menos 8 caracteres, una mayúscula, un número y un símbolo especial.'
      });
    });

    it('debe retornar 400 si teléfono es inválido', async () => {
      req.body = { email: 'test@test.com', password: 'Aa123456!', role: 'admin', phone: '123' };
      (UserModel.validateEmail as jest.Mock).mockReturnValue(true);
      (UserModel.validatePasswordFormat as jest.Mock).mockReturnValue(true);
      (UserModel.validatePhone as jest.Mock).mockReturnValue(false);

      await UserController.crearUsuario(req as Request, res as Response);
      expect(statusMock).toHaveBeenCalledWith(400);
      expect(jsonMock).toHaveBeenCalledWith({ message: 'Teléfono inválido' });
    });

    it('debe retornar 400 si usuario ya existe', async () => {
      req.body = { email: 'test@test.com', password: 'Aa123456!', role: 'admin', phone: '1234567890' };
      (UserModel.validateEmail as jest.Mock).mockReturnValue(true);
      (UserModel.validatePasswordFormat as jest.Mock).mockReturnValue(true);
      (UserModel.validatePhone as jest.Mock).mockReturnValue(true);
      (UserModel.findByEmail as jest.Mock).mockResolvedValue({ id: 1, email: 'test@test.com' });

      await UserController.crearUsuario(req as Request, res as Response);
      expect(statusMock).toHaveBeenCalledWith(400);
      expect(jsonMock).toHaveBeenCalledWith({ message: 'Usuario ya registrado' });
    });

    it('debe crear usuario correctamente', async () => {
      req.body = { email: 'test@test.com', password: 'Aa123456!', role: 'admin', phone: '1234567890' };
      (UserModel.validateEmail as jest.Mock).mockReturnValue(true);
      (UserModel.validatePasswordFormat as jest.Mock).mockReturnValue(true);
      (UserModel.validatePhone as jest.Mock).mockReturnValue(true);
      (UserModel.findByEmail as jest.Mock).mockResolvedValue(null);
      (UserModel.create as jest.Mock).mockResolvedValue({
        user: { id: 1, email: 'test@test.com', role: 'admin', phone: '1234567890' },
        offlinePin: '1234',
        qrCodeUrl: 'data:image/png;base64,QRcode'
      });
      (sendEmail as jest.Mock).mockResolvedValue(undefined);

      await UserController.crearUsuario(req as Request, res as Response);
      expect(statusMock).toHaveBeenCalledWith(201);
      expect(jsonMock).toHaveBeenCalledWith(expect.objectContaining({
        message: 'Usuario registrado exitosamente',
        offlinePin: '1234',
        qrCodeUrl: 'data:image/png;base64,QRcode'
      }));
    });
  });
});
