// test/controllers/movimientos-controller.test.ts
import { Request, Response } from 'express';
import { MovimientoController } from '../../src/controllers/movimientos-controller';

// Mock de las dependencias
jest.mock('../../src/config/db', () => ({
  pool: {
    query: jest.fn(),
    connect: jest.fn()
  }
}));

// Mock de MovimientoModel
const mockMovimientoModel = {
  findAll: jest.fn(),
  create: jest.fn(),
  findById: jest.fn(),
  findByProductoNombre: jest.fn(),
  findByDateRange: jest.fn()
};

// Mock de ProductoModel
const mockProductoModel = {
  findByNombre: jest.fn(),
  findById: jest.fn(),
  updateStock: jest.fn(),
  findLowStock: jest.fn()
};

// Mock de StockAlertService
const mockStockAlertService = {
  verificarAlertaStock: jest.fn(),
  verificarStockBajoGeneral: jest.fn()
};

// Mock de los modelos
jest.mock('../../src/models/movimientos-model', () => {
  return {
    MovimientoModel: jest.fn().mockImplementation(() => mockMovimientoModel)
  };
});

jest.mock('../../src/models/productos-model', () => {
  return {
    ProductoModel: jest.fn().mockImplementation(() => mockProductoModel)
  };
});

jest.mock('../../src/helpers/stock-alerts', () => {
  return {
    StockAlertService: jest.fn().mockImplementation(() => mockStockAlertService)
  };
});

describe('MovimientoController', () => {
  let mockRequest: Partial<Request>;
  let mockResponse: Partial<Response>;

  beforeEach(() => {
    mockResponse = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn().mockReturnThis(),
    };

    mockRequest = {
      body: {},
      params: {},
      query: {},
    };

    // Limpiar todos los mocks
    jest.clearAllMocks();
  });

  describe('getAll', () => {
    it('debería obtener todos los movimientos exitosamente', async () => {
      const movimientos = [
        { 
          id_movimiento: 1, 
          tipo: 'Salida', 
          cantidad: 2, 
          id_producto: 1, 
          fecha: new Date('2025-10-03T19:09:12.936Z'),
          referencia: 'Factura #123',
          responsable: 49,
          id_cliente: 1
        }
      ];

      // Configurar el mock para retornar los movimientos
      mockMovimientoModel.findAll.mockResolvedValue(movimientos);

      await MovimientoController.getAll(mockRequest as Request, mockResponse as Response);

      expect(mockResponse.json).toHaveBeenCalledWith({
        code: 0,
        message: 'Movimientos obtenidos correctamente',
        data: movimientos,
      });
    });

    it('debería manejar error al obtener movimientos', async () => {
      // Configurar el mock para rechazar con error
      mockMovimientoModel.findAll.mockRejectedValue(new Error('Error de base de datos'));

      await MovimientoController.getAll(mockRequest as Request, mockResponse as Response);

      expect(mockResponse.status).toHaveBeenCalledWith(500);
      expect(mockResponse.json).toHaveBeenCalledWith({
        code: 1,
        message: 'Error al obtener movimientos: Error de base de datos'
      });
    });
  });

  describe('getById', () => {
    it('debería obtener movimiento por ID exitosamente', async () => {
      const movimiento = {
        id_movimiento: 1,
        tipo: 'Salida',
        cantidad: 2,
        id_producto: 1,
        fecha: new Date('2025-10-03T19:09:12.936Z'),
        referencia: 'Factura #123',
        responsable: 49,
        id_cliente: 1
      };

      // Configurar el mock para retornar el movimiento
      mockMovimientoModel.findById.mockResolvedValue(movimiento);

      mockRequest.body = { id: '1' };

      await MovimientoController.getById(mockRequest as Request, mockResponse as Response);

      expect(mockResponse.json).toHaveBeenCalledWith({
        code: 0,
        message: 'Movimiento obtenido correctamente',
        data: movimiento
      });
    });

    it('debería retornar 400 cuando falta el ID', async () => {
      mockRequest.body = {};

      await MovimientoController.getById(mockRequest as Request, mockResponse as Response);

      expect(mockResponse.status).toHaveBeenCalledWith(400);
      expect(mockResponse.json).toHaveBeenCalledWith({
        code: 1,
        message: 'El campo id es obligatorio en el body'
      });
    });

    it('debería retornar 400 cuando el ID es inválido', async () => {
      mockRequest.body = { id: 'invalid' };

      await MovimientoController.getById(mockRequest as Request, mockResponse as Response);

      expect(mockResponse.status).toHaveBeenCalledWith(400);
      expect(mockResponse.json).toHaveBeenCalledWith({
        code: 1,
        message: 'El ID debe ser un número mayor a 0'
      });
    });

    it('debería retornar 404 cuando el movimiento no existe', async () => {
      // Configurar el mock para retornar null
      mockMovimientoModel.findById.mockResolvedValue(null);

      mockRequest.body = { id: '999' };

      await MovimientoController.getById(mockRequest as Request, mockResponse as Response);

      expect(mockResponse.status).toHaveBeenCalledWith(404);
      expect(mockResponse.json).toHaveBeenCalledWith({
        code: 1,
        message: 'Movimiento no encontrado'
      });
    });
  });

  describe('create', () => {
    it('debería crear movimiento de entrada exitosamente', async () => {
      const producto = {
        id_producto: 1,
        nombre: 'Producto Test',
        stock_actual: 10,
        stock_minimo: 5
      };

      const nuevoMovimiento = {
        id_movimiento: 4,
        tipo: 'Entrada',
        id_producto: 1,
        cantidad: 5,
        referencia: 'Compra #789',
        responsable: 49,
        fecha: new Date()
      };

      // Configurar los mocks
      mockProductoModel.findByNombre.mockResolvedValue([producto]);
      mockMovimientoModel.create.mockResolvedValue(nuevoMovimiento);

      mockRequest.body = {
        tipo: 'Entrada',
        nombreProducto: 'Producto Test',
        cantidad: 5,
        referencia: 'Compra #789',
        responsable: '49'
      };

      await MovimientoController.create(mockRequest as Request, mockResponse as Response);

      expect(mockResponse.status).toHaveBeenCalledWith(201);
      expect(mockResponse.json).toHaveBeenCalledWith({
        code: 0,
        message: 'Movimiento creado correctamente',
        data: nuevoMovimiento
      });
    });

    it('debería crear movimiento de salida exitosamente', async () => {
      const producto = {
        id_producto: 1,
        nombre: 'Producto Test',
        stock_actual: 10,
        stock_minimo: 5
      };

      const nuevoMovimiento = {
        id_movimiento: 5,
        tipo: 'Salida',
        id_producto: 1,
        cantidad: 3,
        referencia: 'Venta #123',
        responsable: 49,
        id_cliente: 1,
        fecha: new Date()
      };

      // Configurar los mocks
      mockProductoModel.findByNombre.mockResolvedValue([producto]);
      mockMovimientoModel.create.mockResolvedValue(nuevoMovimiento);

      mockRequest.body = {
        tipo: 'Salida',
        nombreProducto: 'Producto Test',
        cantidad: 3,
        referencia: 'Venta #123',
        responsable: '49',
        id_cliente: '1'
      };

      await MovimientoController.create(mockRequest as Request, mockResponse as Response);

      expect(mockResponse.status).toHaveBeenCalledWith(201);
      expect(mockResponse.json).toHaveBeenCalledWith({
        code: 0,
        message: 'Movimiento creado correctamente',
        data: nuevoMovimiento
      });
    });

    it('debería retornar 400 cuando falta el tipo', async () => {
      mockRequest.body = {
        nombreProducto: 'Producto Test',
        cantidad: 5,
        responsable: '49'
      };

      await MovimientoController.create(mockRequest as Request, mockResponse as Response);

      expect(mockResponse.status).toHaveBeenCalledWith(400);
      expect(mockResponse.json).toHaveBeenCalledWith({
        code: 1,
        message: 'El campo tipo es obligatorio'
      });
    });

    it('debería retornar 400 cuando el tipo es inválido', async () => {
      mockRequest.body = {
        tipo: 'InvalidType',
        nombreProducto: 'Producto Test',
        cantidad: 5,
        responsable: '49'
      };

      await MovimientoController.create(mockRequest as Request, mockResponse as Response);

      expect(mockResponse.status).toHaveBeenCalledWith(400);
      expect(mockResponse.json).toHaveBeenCalledWith({
        code: 1,
        message: 'El tipo debe ser "Entrada" o "Salida"'
      });
    });

    it('debería retornar 400 cuando falta nombreProducto', async () => {
      mockRequest.body = {
        tipo: 'Entrada',
        cantidad: 5,
        responsable: '49'
      };

      await MovimientoController.create(mockRequest as Request, mockResponse as Response);

      expect(mockResponse.status).toHaveBeenCalledWith(400);
      expect(mockResponse.json).toHaveBeenCalledWith({
        code: 1,
        message: 'El campo nombreProducto es obligatorio'
      });
    });

    it('debería retornar 400 cuando falta cantidad', async () => {
      mockRequest.body = {
        tipo: 'Entrada',
        nombreProducto: 'Producto Test',
        responsable: '49'
      };

      await MovimientoController.create(mockRequest as Request, mockResponse as Response);

      expect(mockResponse.status).toHaveBeenCalledWith(400);
      expect(mockResponse.json).toHaveBeenCalledWith({
        code: 1,
        message: 'El campo cantidad es obligatorio'
      });
    });

    it('debería retornar 400 cuando falta responsable', async () => {
      mockRequest.body = {
        tipo: 'Entrada',
        nombreProducto: 'Producto Test',
        cantidad: 5
      };

      await MovimientoController.create(mockRequest as Request, mockResponse as Response);

      expect(mockResponse.status).toHaveBeenCalledWith(400);
      expect(mockResponse.json).toHaveBeenCalledWith({
        code: 1,
        message: 'El campo responsable es obligatorio'
      });
    });

    it('debería retornar 400 cuando la cantidad es 0', async () => {
      mockRequest.body = {
        tipo: 'Entrada',
        nombreProducto: 'Producto Test',
        cantidad: 0,
        responsable: '49'
      };

      await MovimientoController.create(mockRequest as Request, mockResponse as Response);

      expect(mockResponse.status).toHaveBeenCalledWith(400);
      expect(mockResponse.json).toHaveBeenCalledWith({
        code: 1,
        message: 'La cantidad debe ser mayor a 0 y no mayor a 1,000,000'
      });
    });

    it('debería retornar 400 cuando la cantidad es negativa', async () => {
      mockRequest.body = {
        tipo: 'Entrada',
        nombreProducto: 'Producto Test',
        cantidad: -5,
        responsable: '49'
      };

      await MovimientoController.create(mockRequest as Request, mockResponse as Response);

      expect(mockResponse.status).toHaveBeenCalledWith(400);
      expect(mockResponse.json).toHaveBeenCalledWith({
        code: 1,
        message: 'La cantidad debe ser mayor a 0 y no mayor a 1,000,000'
      });
    });

    it('debería retornar 404 cuando el producto no existe', async () => {
      // Configurar el mock para retornar array vacío
      mockProductoModel.findByNombre.mockResolvedValue([]);

      mockRequest.body = {
        tipo: 'Entrada',
        nombreProducto: 'Producto Inexistente',
        cantidad: 5,
        responsable: '49'
      };

      await MovimientoController.create(mockRequest as Request, mockResponse as Response);

      expect(mockResponse.status).toHaveBeenCalledWith(404);
      expect(mockResponse.json).toHaveBeenCalledWith({
        code: 1,
        message: 'Producto no encontrado'
      });
    });

    it('debería retornar 400 cuando hay stock insuficiente para salida', async () => {
      const producto = {
        id_producto: 1,
        nombre: 'Producto Test',
        stock_actual: 2,
        stock_minimo: 5
      };

      // Configurar el mock para retornar el producto con stock bajo
      mockProductoModel.findByNombre.mockResolvedValue([producto]);

      mockRequest.body = {
        tipo: 'Salida',
        nombreProducto: 'Producto Test',
        cantidad: 5,
        responsable: '49'
      };

      await MovimientoController.create(mockRequest as Request, mockResponse as Response);

      expect(mockResponse.status).toHaveBeenCalledWith(400);
      expect(mockResponse.json).toHaveBeenCalledWith({
        code: 1,
        message: 'Stock insuficiente. Stock actual: 2, cantidad solicitada: 5'
      });
    });

    it('debería manejar múltiples productos encontrados', async () => {
      const productos = [
        {
          id_producto: 1,
          nombre: 'Producto Test',
          stock_actual: 10,
          stock_minimo: 5
        },
        {
          id_producto: 2,
          nombre: 'Producto Test Similar',
          stock_actual: 15,
          stock_minimo: 5
        }
      ];

      const nuevoMovimiento = {
        id_movimiento: 6,
        tipo: 'Entrada',
        id_producto: 1,
        cantidad: 5,
        referencia: 'Compra #999',
        responsable: 49,
        fecha: new Date()
      };

      // Configurar los mocks
      mockProductoModel.findByNombre.mockResolvedValue(productos);
      mockMovimientoModel.create.mockResolvedValue(nuevoMovimiento);

      mockRequest.body = {
        tipo: 'Entrada',
        nombreProducto: 'Producto Test',
        cantidad: 5,
        referencia: 'Compra #999',
        responsable: '49'
      };

      await MovimientoController.create(mockRequest as Request, mockResponse as Response);

      expect(mockResponse.status).toHaveBeenCalledWith(201);
    });
  });

  describe('getByProducto', () => {
    it('debería obtener movimientos por producto exitosamente', async () => {
      const movimientos = [
        {
          id_movimiento: 1,
          tipo: 'Salida',
          cantidad: 2,
          id_producto: 1,
          fecha: new Date('2025-10-03T19:09:12.936Z'),
          referencia: 'Factura #123',
          responsable: 49
        }
      ];

      // Configurar el mock para retornar los movimientos
      mockMovimientoModel.findByProductoNombre.mockResolvedValue(movimientos);

      mockRequest.body = { nombreProducto: 'Producto Test' };

      await MovimientoController.getByProducto(mockRequest as Request, mockResponse as Response);

      expect(mockResponse.json).toHaveBeenCalledWith({
        code: 0,
        message: 'Se encontraron 1 movimiento(s) para el producto "Producto Test"',
        data: movimientos,
        total: 1,
        busquedaOriginal: 'Producto Test'
      });
    });

    it('debería retornar mensaje cuando no hay movimientos para el producto', async () => {
      // Configurar el mock para retornar array vacío
      mockMovimientoModel.findByProductoNombre.mockResolvedValue([]);

      mockRequest.body = { nombreProducto: 'Producto Sin Movimientos' };

      await MovimientoController.getByProducto(mockRequest as Request, mockResponse as Response);

      expect(mockResponse.json).toHaveBeenCalledWith({
        code: 0,
        message: 'No se encontraron movimientos para el producto "Producto Sin Movimientos"',
        data: [],
        total: 0,
        busquedaOriginal: 'Producto Sin Movimientos'
      });
    });

    it('debería retornar 400 cuando falta nombreProducto', async () => {
      mockRequest.body = {};

      await MovimientoController.getByProducto(mockRequest as Request, mockResponse as Response);

      expect(mockResponse.status).toHaveBeenCalledWith(400);
      expect(mockResponse.json).toHaveBeenCalledWith({
        code: 1,
        message: 'El campo nombreProducto es obligatorio en el body'
      });
    });
  });

  describe('getByDateRange', () => {
    it('debería obtener movimientos por rango de fecha exitosamente', async () => {
      const movimientos = [
        {
          id_movimiento: 1,
          tipo: 'Salida',
          cantidad: 2,
          id_producto: 1,
          fecha: new Date('2025-10-03T19:09:12.936Z'),
          referencia: 'Factura #123',
          responsable: 49
        }
      ];

      // Configurar el mock para retornar los movimientos
      mockMovimientoModel.findByDateRange.mockResolvedValue(movimientos);

      mockRequest.body = {
        fechaInicio: '2025-10-01',
        fechaFin: '2025-10-31'
      };

      await MovimientoController.getByDateRange(mockRequest as Request, mockResponse as Response);

      expect(mockResponse.json).toHaveBeenCalledWith({
        code: 0,
        message: 'Movimientos por rango de fecha obtenidos correctamente',
        data: movimientos
      });
    });

    it('debería retornar 400 cuando faltan fechas', async () => {
      mockRequest.body = { fechaInicio: '2025-10-01' };

      await MovimientoController.getByDateRange(mockRequest as Request, mockResponse as Response);

      expect(mockResponse.status).toHaveBeenCalledWith(400);
      expect(mockResponse.json).toHaveBeenCalledWith({
        code: 1,
        message: 'Los campos fechaInicio y fechaFin son obligatorios en el body'
      });
    });

    it('debería retornar 400 cuando la fecha de inicio es mayor a la fecha fin', async () => {
      mockRequest.body = {
        fechaInicio: '2025-10-31',
        fechaFin: '2025-10-01'
      };

      await MovimientoController.getByDateRange(mockRequest as Request, mockResponse as Response);

      expect(mockResponse.status).toHaveBeenCalledWith(400);
      expect(mockResponse.json).toHaveBeenCalledWith({
        code: 1,
        message: 'La fecha de inicio no puede ser mayor a la fecha de fin'
      });
    });

    it('debería retornar 400 cuando el rango es mayor a 1 año', async () => {
      mockRequest.body = {
        fechaInicio: '2024-01-01',
        fechaFin: '2025-12-31'
      };

      await MovimientoController.getByDateRange(mockRequest as Request, mockResponse as Response);

      expect(mockResponse.status).toHaveBeenCalledWith(400);
      expect(mockResponse.json).toHaveBeenCalledWith({
        code: 1,
        message: 'El rango de fechas no puede ser mayor a 1 año'
      });
    });
  });
});
