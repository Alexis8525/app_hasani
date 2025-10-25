// test/controllers/clientes-controller.test.ts
import { ClienteController } from '../../src/controllers/clientes-controller';
import { ClienteModel } from '../../src/models/clientes-model';
import { Request, Response } from 'express';

jest.mock('../../src/models/clientes-model');

describe('ClienteController', () => {
  let req: Partial<Request>;
  let res: Partial<Response>;
  let jsonMock: jest.Mock;
  let statusMock: jest.Mock;

  beforeEach(() => {
    req = {};
    jsonMock = jest.fn();
    statusMock = jest.fn().mockReturnValue({ json: jsonMock });
    res = { json: jsonMock, status: statusMock };
    jest.clearAllMocks();
  });

  describe('getAll', () => {
    it('debe retornar clientes correctamente', async () => {
      const clientes = [{ nombre: 'Cliente 1' }];
      (ClienteModel.prototype.findAll as jest.Mock).mockResolvedValue(clientes);

      await ClienteController.getAll(req as Request, res as Response);

      expect(jsonMock).toHaveBeenCalledWith({
        code: 0,
        message: 'Clientes obtenidos correctamente',
        data: clientes
      });
    });

    it('debe retornar error 500 si falla el modelo', async () => {
      (ClienteModel.prototype.findAll as jest.Mock).mockRejectedValue(new Error('Error DB'));

      await ClienteController.getAll(req as Request, res as Response);

      expect(statusMock).toHaveBeenCalledWith(500);
      expect(jsonMock).toHaveBeenCalledWith({
        code: 1,
        message: 'Error al obtener clientes: Error DB'
      });
    });
  });

  describe('getByNombre', () => {
    it('debe retornar error 400 si no se pasa nombre', async () => {
      req.body = {};
      await ClienteController.getByNombre(req as Request, res as Response);

      expect(statusMock).toHaveBeenCalledWith(400);
      expect(jsonMock).toHaveBeenCalledWith({
        code: 1,
        message: 'El campo nombre es obligatorio en el body'
      });
    });

    it('debe retornar cliente correctamente', async () => {
      req.body = { nombre: 'Cliente 1' };
      const cliente = { nombre: 'Cliente 1', telefono: '1234567890' };
      (ClienteModel.prototype.findByNombre as jest.Mock).mockResolvedValue(cliente);

      await ClienteController.getByNombre(req as Request, res as Response);

      expect(jsonMock).toHaveBeenCalledWith({
        code: 0,
        message: 'Cliente obtenido correctamente',
        data: cliente
      });
    });

    it('debe retornar 404 si no se encuentra el cliente', async () => {
      req.body = { nombre: 'NoExiste' };
      (ClienteModel.prototype.findByNombre as jest.Mock).mockResolvedValue(null);

      await ClienteController.getByNombre(req as Request, res as Response);

      expect(statusMock).toHaveBeenCalledWith(404);
      expect(jsonMock).toHaveBeenCalledWith({
        code: 1,
        message: 'Cliente no encontrado'
      });
    });
  });

  describe('create', () => {
    it('debe crear un cliente correctamente', async () => {
      req.body = { id_user: 1, nombre: 'Cliente Test', telefono: '1234567890', contacto: 'Juan' };
      (ClienteModel.prototype.create as jest.Mock).mockResolvedValue(req.body);

      await ClienteController.create(req as Request, res as Response);

      expect(statusMock).toHaveBeenCalledWith(201);
      expect(jsonMock).toHaveBeenCalledWith({
        code: 0,
        message: 'Cliente creado correctamente',
        data: req.body
      });
    });

    it('debe retornar 400 si id_user es inválido', async () => {
      req.body = { id_user: -1, nombre: 'Cliente Test' };
      await ClienteController.create(req as Request, res as Response);

      expect(statusMock).toHaveBeenCalledWith(400);
      expect(jsonMock).toHaveBeenCalledWith({
        code: 1,
        message: 'El ID de usuario debe ser un número mayor a 0'
      });
    });

    it('debe retornar 400 si teléfono inválido', async () => {
      req.body = { id_user: 1, nombre: 'Cliente Test', telefono: '123' };
      await ClienteController.create(req as Request, res as Response);

      expect(statusMock).toHaveBeenCalledWith(400);
      expect(jsonMock).toHaveBeenCalledWith({
        code: 1,
        message: 'El teléfono debe tener exactamente 10 dígitos numéricos'
      });
    });
  });

  describe('update', () => {
    it('debe actualizar cliente correctamente', async () => {
      req.body = { nombre: 'Cliente 1', telefono: '0987654321', contacto: 'Maria' };
      (ClienteModel.prototype.update as jest.Mock).mockResolvedValue(req.body);

      await ClienteController.update(req as Request, res as Response);

      expect(jsonMock).toHaveBeenCalledWith({
        code: 0,
        message: 'Cliente actualizado correctamente',
        data: req.body
      });
    });

    it('debe retornar 404 si cliente no existe', async () => {
      req.body = { nombre: 'NoExiste', telefono: '1234567890' };
      (ClienteModel.prototype.update as jest.Mock).mockResolvedValue(null);

      await ClienteController.update(req as Request, res as Response);

      expect(statusMock).toHaveBeenCalledWith(404);
      expect(jsonMock).toHaveBeenCalledWith({
        code: 1,
        message: 'Cliente no encontrado para actualizar'
      });
    });
  });

  describe('delete', () => {
    it('debe eliminar cliente correctamente', async () => {
      req.body = { nombre: 'Cliente 1' };
      (ClienteModel.prototype.delete as jest.Mock).mockResolvedValue(true);

      await ClienteController.delete(req as Request, res as Response);

      expect(jsonMock).toHaveBeenCalledWith({
        code: 0,
        message: 'Cliente eliminado correctamente'
      });
    });

    it('debe retornar 404 si cliente no existe', async () => {
      req.body = { nombre: 'NoExiste' };
      (ClienteModel.prototype.delete as jest.Mock).mockResolvedValue(false);

      await ClienteController.delete(req as Request, res as Response);

      expect(statusMock).toHaveBeenCalledWith(404);
      expect(jsonMock).toHaveBeenCalledWith({
        code: 1,
        message: 'Cliente no encontrado para eliminar'
      });
    });
  });

  describe('getByUser', () => {
    it('debe retornar error 400 si userId no se pasa', async () => {
      req.body = {};
      await ClienteController.getByUser(req as Request, res as Response);

      expect(statusMock).toHaveBeenCalledWith(400);
      expect(jsonMock).toHaveBeenCalledWith({
        code: 1,
        message: 'El campo userId es obligatorio en el body'
      });
    });

    it('debe retornar clientes por userId correctamente', async () => {
      req.body = { userId: 1 };
      const clientes = [{ nombre: 'Cliente 1' }];
      (ClienteModel.prototype.findByUserId as jest.Mock).mockResolvedValue(clientes);

      await ClienteController.getByUser(req as Request, res as Response);

      expect(jsonMock).toHaveBeenCalledWith({
        code: 0,
        message: 'Clientes obtenidos correctamente',
        data: clientes
      });
    });
  });
});
