// test/controllers/productos-controller.test.ts
import { ProductoController } from '../../src/controllers/productos-controller';
import { ProductoModel } from '../../src/models/productos-model';
import { StockAlertService } from '../../src/helpers/stock-alerts';
import { Request, Response } from 'express';

// Mock de dependencias
jest.mock('../../src/models/productos-model');
jest.mock('../../src/helpers/stock-alerts');

describe('ProductoController', () => {
  let req: Partial<Request>;
  let res: Partial<Response>;
  let jsonMock: jest.Mock;
  let statusMock: jest.Mock;

  beforeEach(() => {
    req = {};
    jsonMock = jest.fn();
    statusMock = jest.fn().mockReturnValue({ json: jsonMock });
    res = {
      json: jsonMock,
      status: statusMock
    };
    jest.clearAllMocks();
  });

  describe('getAll', () => {
    it('debe retornar productos correctamente', async () => {
      const productos = [{ nombre: 'Producto 1' }];
      (ProductoModel.prototype.findAll as jest.Mock).mockResolvedValue(productos);

      await ProductoController.getAll(req as Request, res as Response);

      expect(jsonMock).toHaveBeenCalledWith({
        code: 0,
        message: 'Productos obtenidos correctamente',
        data: productos
      });
    });

    it('debe retornar error 500 si falla el modelo', async () => {
      (ProductoModel.prototype.findAll as jest.Mock).mockRejectedValue(new Error('Error DB'));

      await ProductoController.getAll(req as Request, res as Response);

      expect(statusMock).toHaveBeenCalledWith(500);
      expect(jsonMock).toHaveBeenCalledWith({
        code: 1,
        message: 'Error al obtener productos: Error DB'
      });
    });
  });

  describe('checkStockAlerts', () => {
    it('debe retornar alertas correctamente', async () => {
      const alertas = [{ nombre: 'Producto 1', stock: 2 }];
      (StockAlertService.prototype.verificarStockBajoGeneral as jest.Mock).mockResolvedValue(alertas);

      await ProductoController.checkStockAlerts(req as Request, res as Response);

      expect(jsonMock).toHaveBeenCalledWith({
        code: 0,
        message: `Verificación completada. ${alertas.length} productos con stock bajo.`,
        data: alertas
      });
    });
  });

  describe('create', () => {
    it('debe crear un producto correctamente', async () => {
      req.body = {
        codigo: 'P001',
        nombre: 'Producto Test',
        unidad: 'pieza',
        stock_minimo: 0,
        stock_actual: 10,
        id_proveedor: 1
      };

      (ProductoModel.prototype.findByNombre as jest.Mock).mockResolvedValue(undefined);
      (ProductoModel.prototype.create as jest.Mock).mockResolvedValue(req.body);

      await ProductoController.create(req as Request, res as Response);

      expect(statusMock).toHaveBeenCalledWith(201);
      expect(jsonMock).toHaveBeenCalledWith({
        code: 0,
        message: 'Producto creado correctamente',
        data: req.body
      });
    });

    it('debe retornar 400 si falta el nombre', async () => {
      req.body = { codigo: 'P001', unidad: 'pieza' };

      await ProductoController.create(req as Request, res as Response);

      expect(statusMock).toHaveBeenCalledWith(400);
      expect(jsonMock).toHaveBeenCalledWith({
        code: 1,
        message: 'El campo nombre es obligatorio'
      });
    });
  });
});
