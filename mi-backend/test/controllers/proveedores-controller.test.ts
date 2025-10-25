// test/controllers/proveedores-controller.test.ts
import { ProveedorController } from '../../src/controllers/proveedores-controller';
import { ProveedorModel } from '../../src/models/proveedores-model';
import { Request, Response } from 'express';

jest.mock('../../src/models/proveedores-model');

describe('ProveedorController', () => {
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
    it('debe retornar proveedores correctamente', async () => {
      const proveedores = [{ nombre: 'Proveedor 1' }];
      (ProveedorModel.prototype.findAll as jest.Mock).mockResolvedValue(proveedores);

      await ProveedorController.getAll(req as Request, res as Response);

      expect(jsonMock).toHaveBeenCalledWith({
        code: 0,
        message: 'Proveedores obtenidos correctamente',
        data: proveedores
      });
    });

    it('debe retornar error 500 si falla el modelo', async () => {
      (ProveedorModel.prototype.findAll as jest.Mock).mockRejectedValue(new Error('Error DB'));

      await ProveedorController.getAll(req as Request, res as Response);

      expect(statusMock).toHaveBeenCalledWith(500);
      expect(jsonMock).toHaveBeenCalledWith({
        code: 1,
        message: 'Error al obtener proveedores: Error DB'
      });
    });
  });

  describe('getByNombre', () => {
    it('debe retornar error 400 si no se pasa nombre', async () => {
      req.body = {};
      await ProveedorController.getByNombre(req as Request, res as Response);

      expect(statusMock).toHaveBeenCalledWith(400);
      expect(jsonMock).toHaveBeenCalledWith({
        code: 1,
        message: 'El campo nombre es obligatorio en el body'
      });
    });

    it('debe retornar proveedor correctamente', async () => {
      req.body = { nombre: 'Proveedor 1' };
      const proveedor = { nombre: 'Proveedor 1', telefono: '1234567890' };
      (ProveedorModel.prototype.findByNombre as jest.Mock).mockResolvedValue(proveedor);

      await ProveedorController.getByNombre(req as Request, res as Response);

      expect(jsonMock).toHaveBeenCalledWith({
        code: 0,
        message: 'Proveedor obtenido correctamente',
        data: proveedor
      });
    });

    it('debe retornar 404 si no se encuentra el proveedor', async () => {
      req.body = { nombre: 'NoExiste' };
      (ProveedorModel.prototype.findByNombre as jest.Mock).mockResolvedValue(null);

      await ProveedorController.getByNombre(req as Request, res as Response);

      expect(statusMock).toHaveBeenCalledWith(404);
      expect(jsonMock).toHaveBeenCalledWith({
        code: 1,
        message: 'Proveedor no encontrado'
      });
    });
  });

  describe('create', () => {
    it('debe crear un proveedor correctamente', async () => {
      req.body = { nombre: 'Proveedor Test', telefono: '1234567890', contacto: 'Juan' };
      (ProveedorModel.prototype.create as jest.Mock).mockResolvedValue(req.body);

      await ProveedorController.create(req as Request, res as Response);

      expect(statusMock).toHaveBeenCalledWith(201);
      expect(jsonMock).toHaveBeenCalledWith({
        code: 0,
        message: 'Proveedor creado correctamente',
        data: req.body
      });
    });

    it('debe retornar 400 si nombre inválido', async () => {
      req.body = { telefono: '1234567890' };

      await ProveedorController.create(req as Request, res as Response);

      expect(statusMock).toHaveBeenCalledWith(400);
      expect(jsonMock).toHaveBeenCalledWith({
        code: 1,
        message: 'El campo nombre es obligatorio'
      });
    });

    it('debe retornar 400 si teléfono inválido', async () => {
      req.body = { nombre: 'Proveedor Test', telefono: '123' };

      await ProveedorController.create(req as Request, res as Response);

      expect(statusMock).toHaveBeenCalledWith(400);
      expect(jsonMock).toHaveBeenCalledWith({
        code: 1,
        message: 'El teléfono debe tener exactamente 10 dígitos numéricos'
      });
    });
  });

  describe('update', () => {
    it('debe actualizar proveedor correctamente', async () => {
      req.body = { nombre: 'Proveedor 1', telefono: '0987654321', contacto: 'Maria' };
      (ProveedorModel.prototype.update as jest.Mock).mockResolvedValue(req.body);

      await ProveedorController.update(req as Request, res as Response);

      expect(jsonMock).toHaveBeenCalledWith({
        code: 0,
        message: 'Proveedor actualizado correctamente',
        data: req.body
      });
    });

    it('debe retornar 404 si proveedor no existe', async () => {
      req.body = { nombre: 'NoExiste', telefono: '1234567890' };
      (ProveedorModel.prototype.update as jest.Mock).mockResolvedValue(null);

      await ProveedorController.update(req as Request, res as Response);

      expect(statusMock).toHaveBeenCalledWith(404);
      expect(jsonMock).toHaveBeenCalledWith({
        code: 1,
        message: 'Proveedor no encontrado para actualizar'
      });
    });
  });

  describe('delete', () => {
    it('debe eliminar proveedor correctamente', async () => {
      req.body = { nombre: 'Proveedor 1' };
      (ProveedorModel.prototype.delete as jest.Mock).mockResolvedValue(true);

      await ProveedorController.delete(req as Request, res as Response);

      expect(jsonMock).toHaveBeenCalledWith({
        code: 0,
        message: 'Proveedor eliminado correctamente'
      });
    });

    it('debe retornar 404 si proveedor no existe', async () => {
      req.body = { nombre: 'NoExiste' };
      (ProveedorModel.prototype.delete as jest.Mock).mockResolvedValue(false);

      await ProveedorController.delete(req as Request, res as Response);

      expect(statusMock).toHaveBeenCalledWith(404);
      expect(jsonMock).toHaveBeenCalledWith({
        code: 1,
        message: 'Proveedor no encontrado para eliminar'
      });
    });
  });
});
