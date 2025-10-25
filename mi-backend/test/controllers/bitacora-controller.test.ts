// test/controllers/bitacora-controller.test.ts
import { Request, Response } from 'express';
import { BitacoraController } from '../../src/controllers/bitacora-controller';

// Mock de las dependencias
jest.mock('../../src/models/bitacora-model', () => {
  return {
    BitacoraModel: jest.fn().mockImplementation(() => ({
      findAll: jest.fn(),
      create: jest.fn(),
      findByMovimiento: jest.fn(),
      findByProveedor: jest.fn()
    }))
  };
});

jest.mock('../../src/config/db', () => ({
  pool: {
    query: jest.fn()
  }
}));

// Importar los mocks después de mockearlos
const { BitacoraModel } = require('../../src/models/bitacora-model');

describe('BitacoraController', () => {
  let mockRequest: Partial<Request>;
  let mockResponse: Partial<Response>;
  let mockBitacoraModelInstance: any;

  beforeEach(() => {
    // Crear una nueva instancia mock para cada test
    mockBitacoraModelInstance = {
      findAll: jest.fn(),
      create: jest.fn(),
      findByMovimiento: jest.fn(),
      findByProveedor: jest.fn()
    };
    
    // Configurar el constructor mock para retornar nuestra instancia
    (BitacoraModel as jest.Mock).mockImplementation(() => mockBitacoraModelInstance);

    mockResponse = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn().mockReturnThis(),
    };

    mockRequest = {
      body: {},
      params: {},
      query: {},
    };

    jest.clearAllMocks();
  });

  describe('getAll', () => {
    it('debería obtener todos los registros de bitácora exitosamente', async () => {
      const mockBitacora = [
        { 
          id: 1, 
          id_movimiento: 1, 
          id_proveedor: 1, 
          cantidad: 100, 
          id_producto: 1,
          fecha: new Date()
        },
        { 
          id: 2, 
          id_movimiento: 2, 
          id_proveedor: 2, 
          cantidad: 200, 
          id_producto: 2,
          fecha: new Date()
        }
      ];

      mockBitacoraModelInstance.findAll.mockResolvedValue(mockBitacora);

      await BitacoraController.getAll(mockRequest as Request, mockResponse as Response);

      expect(mockResponse.json).toHaveBeenCalledWith({
        code: 0,
        message: 'Bitácora obtenida correctamente',
        data: mockBitacora
      });
    });

    it('debería manejar error al obtener bitácora', async () => {
      mockBitacoraModelInstance.findAll.mockRejectedValue(new Error('Error de base de datos'));

      await BitacoraController.getAll(mockRequest as Request, mockResponse as Response);

      expect(mockResponse.status).toHaveBeenCalledWith(500);
      expect(mockResponse.json).toHaveBeenCalledWith({
        code: 1,
        message: 'Error al obtener bitácora: Error de base de datos'
      });
    });
  });

  describe('create', () => {
    it('debería crear registro de bitácora exitosamente', async () => {
      const nuevoRegistro = { 
        id: 1, 
        id_movimiento: 1, 
        id_proveedor: 1, 
        cantidad: 100, 
        id_producto: 1,
        fecha: new Date()
      };
      
      mockBitacoraModelInstance.create.mockResolvedValue(nuevoRegistro);

      mockRequest.body = {
        id_movimiento: '1',
        id_proveedor: '1',
        cantidad: '100',
        id_producto: '1'
      };

      await BitacoraController.create(mockRequest as Request, mockResponse as Response);

      expect(mockResponse.status).toHaveBeenCalledWith(201);
      expect(mockResponse.json).toHaveBeenCalledWith({
        code: 0,
        message: 'Registro de bitácora creado correctamente',
        data: nuevoRegistro
      });
    });

    it('debería retornar 400 cuando falta id_movimiento', async () => {
      mockRequest.body = {
        id_proveedor: '1',
        cantidad: '100',
        id_producto: '1'
      };

      await BitacoraController.create(mockRequest as Request, mockResponse as Response);

      expect(mockResponse.status).toHaveBeenCalledWith(400);
      expect(mockResponse.json).toHaveBeenCalledWith({
        code: 1,
        message: 'El campo id_movimiento es obligatorio'
      });
    });

    it('debería retornar 400 cuando falta id_proveedor', async () => {
      mockRequest.body = {
        id_movimiento: '1',
        cantidad: '100',
        id_producto: '1'
      };

      await BitacoraController.create(mockRequest as Request, mockResponse as Response);

      expect(mockResponse.status).toHaveBeenCalledWith(400);
      expect(mockResponse.json).toHaveBeenCalledWith({
        code: 1,
        message: 'El campo id_proveedor es obligatorio'
      });
    });

    it('debería retornar 400 cuando falta cantidad', async () => {
      mockRequest.body = {
        id_movimiento: '1',
        id_proveedor: '1',
        id_producto: '1'
      };

      await BitacoraController.create(mockRequest as Request, mockResponse as Response);

      expect(mockResponse.status).toHaveBeenCalledWith(400);
      expect(mockResponse.json).toHaveBeenCalledWith({
        code: 1,
        message: 'El campo cantidad es obligatorio'
      });
    });

    it('debería retornar 400 cuando falta id_producto', async () => {
      mockRequest.body = {
        id_movimiento: '1',
        id_proveedor: '1',
        cantidad: '100'
      };

      await BitacoraController.create(mockRequest as Request, mockResponse as Response);

      expect(mockResponse.status).toHaveBeenCalledWith(400);
      expect(mockResponse.json).toHaveBeenCalledWith({
        code: 1,
        message: 'El campo id_producto es obligatorio'
      });
    });

    it('debería retornar 400 cuando id_movimiento es inválido', async () => {
      mockRequest.body = {
        id_movimiento: 'invalid',
        id_proveedor: '1',
        cantidad: '100',
        id_producto: '1'
      };

      await BitacoraController.create(mockRequest as Request, mockResponse as Response);

      expect(mockResponse.status).toHaveBeenCalledWith(400);
      expect(mockResponse.json).toHaveBeenCalledWith({
        code: 1,
        message: 'El ID del movimiento debe ser un número mayor a 0'
      });
    });

    it('debería retornar 400 cuando id_proveedor es inválido', async () => {
      mockRequest.body = {
        id_movimiento: '1',
        id_proveedor: '0',
        cantidad: '100',
        id_producto: '1'
      };

      await BitacoraController.create(mockRequest as Request, mockResponse as Response);

      expect(mockResponse.status).toHaveBeenCalledWith(400);
      expect(mockResponse.json).toHaveBeenCalledWith({
        code: 1,
        message: 'El ID del proveedor debe ser un número mayor a 0'
      });
    });

    it('debería retornar 400 cuando id_producto es inválido', async () => {
      mockRequest.body = {
        id_movimiento: '1',
        id_proveedor: '1',
        cantidad: '100',
        id_producto: '-1'
      };

      await BitacoraController.create(mockRequest as Request, mockResponse as Response);

      expect(mockResponse.status).toHaveBeenCalledWith(400);
      expect(mockResponse.json).toHaveBeenCalledWith({
        code: 1,
        message: 'El ID del producto debe ser un número mayor a 0'
      });
    });

    it('debería retornar 400 cuando la cantidad es 0', async () => {
      mockRequest.body = {
        id_movimiento: '1',
        id_proveedor: '1',
        cantidad: '0',
        id_producto: '1'
      };

      await BitacoraController.create(mockRequest as Request, mockResponse as Response);

      expect(mockResponse.status).toHaveBeenCalledWith(400);
      expect(mockResponse.json).toHaveBeenCalledWith({
        code: 1,
        message: 'La cantidad debe ser mayor a 0 y no mayor a 1,000,000'
      });
    });

    it('debería retornar 400 cuando la cantidad es negativa', async () => {
      mockRequest.body = {
        id_movimiento: '1',
        id_proveedor: '1',
        cantidad: '-50',
        id_producto: '1'
      };

      await BitacoraController.create(mockRequest as Request, mockResponse as Response);

      expect(mockResponse.status).toHaveBeenCalledWith(400);
      expect(mockResponse.json).toHaveBeenCalledWith({
        code: 1,
        message: 'La cantidad debe ser mayor a 0 y no mayor a 1,000,000'
      });
    });

    it('debería retornar 400 cuando la cantidad es mayor a 1,000,000', async () => {
      mockRequest.body = {
        id_movimiento: '1',
        id_proveedor: '1',
        cantidad: '1000001',
        id_producto: '1'
      };

      await BitacoraController.create(mockRequest as Request, mockResponse as Response);

      expect(mockResponse.status).toHaveBeenCalledWith(400);
      expect(mockResponse.json).toHaveBeenCalledWith({
        code: 1,
        message: 'La cantidad debe ser mayor a 0 y no mayor a 1,000,000'
      });
    });

    it('debería aceptar cantidad en el límite superior', async () => {
      const nuevoRegistro = { 
        id: 1, 
        id_movimiento: 1, 
        id_proveedor: 1, 
        cantidad: 1000000, 
        id_producto: 1,
        fecha: new Date()
      };
      
      mockBitacoraModelInstance.create.mockResolvedValue(nuevoRegistro);

      mockRequest.body = {
        id_movimiento: '1',
        id_proveedor: '1',
        cantidad: '1000000',
        id_producto: '1'
      };

      await BitacoraController.create(mockRequest as Request, mockResponse as Response);

      expect(mockResponse.status).toHaveBeenCalledWith(201);
      expect(mockResponse.json).toHaveBeenCalledWith({
        code: 0,
        message: 'Registro de bitácora creado correctamente',
        data: nuevoRegistro
      });
    });

    it('debería manejar error al crear registro de bitácora', async () => {
      mockBitacoraModelInstance.create.mockRejectedValue(new Error('Error de base de datos'));

      mockRequest.body = {
        id_movimiento: '1',
        id_proveedor: '1',
        cantidad: '100',
        id_producto: '1'
      };

      await BitacoraController.create(mockRequest as Request, mockResponse as Response);

      expect(mockResponse.status).toHaveBeenCalledWith(500);
      expect(mockResponse.json).toHaveBeenCalledWith({
        code: 1,
        message: 'Error al crear registro de bitácora: Error de base de datos'
      });
    });
  });

  describe('getByMovimiento', () => {
    it('debería obtener registros por movimiento exitosamente', async () => {
      const mockRegistros = [
        { 
          id: 1, 
          id_movimiento: 1, 
          id_proveedor: 1, 
          cantidad: 100, 
          id_producto: 1,
          fecha: new Date()
        }
      ];
      
      mockBitacoraModelInstance.findByMovimiento.mockResolvedValue(mockRegistros);

      mockRequest.body = { movimientoId: '1' };

      await BitacoraController.getByMovimiento(mockRequest as Request, mockResponse as Response);

      expect(mockResponse.json).toHaveBeenCalledWith({
        code: 0,
        message: 'Registros de bitácora por movimiento obtenidos correctamente',
        data: mockRegistros
      });
    });

    it('debería retornar 400 cuando falta movimientoId', async () => {
      mockRequest.body = {};

      await BitacoraController.getByMovimiento(mockRequest as Request, mockResponse as Response);

      expect(mockResponse.status).toHaveBeenCalledWith(400);
      expect(mockResponse.json).toHaveBeenCalledWith({
        code: 1,
        message: 'El campo movimientoId es obligatorio en el body'
      });
    });

    it('debería retornar 400 cuando movimientoId es inválido', async () => {
      mockRequest.body = { movimientoId: 'invalid' };

      await BitacoraController.getByMovimiento(mockRequest as Request, mockResponse as Response);

      expect(mockResponse.status).toHaveBeenCalledWith(400);
      expect(mockResponse.json).toHaveBeenCalledWith({
        code: 1,
        message: 'El ID del movimiento debe ser un número mayor a 0'
      });
    });

    it('debería manejar error al obtener registros por movimiento', async () => {
        // Configurar el mock para rechazar con error
        mockBitacoraModelInstance.findByMovimiento.mockRejectedValue(new Error('Error de base de datos'));
  
        mockRequest.body = { movimientoId: '1' };
  
        await BitacoraController.getByMovimiento(mockRequest as Request, mockResponse as Response);
  
        expect(mockResponse.status).toHaveBeenCalledWith(500);
        expect(mockResponse.json).toHaveBeenCalledWith({
          code: 1,
          message: 'Error al obtener registros por movimiento: Error de base de datos'
        });
      });
    });
  
    describe('getByProveedor', () => {
      it('debería obtener registros por proveedor exitosamente', async () => {
        const mockRegistros = [
          { 
            id: 1, 
            id_movimiento: 1, 
            id_proveedor: 1, 
            cantidad: 100, 
            id_producto: 1,
            fecha: new Date()
          }
        ];
        
        // Configurar el mock para retornar los registros
        mockBitacoraModelInstance.findByProveedor.mockResolvedValue(mockRegistros);
  
        mockRequest.body = { proveedorId: '1' };
  
        await BitacoraController.getByProveedor(mockRequest as Request, mockResponse as Response);
  
        expect(mockResponse.json).toHaveBeenCalledWith({
          code: 0,
          message: 'Registros de bitácora por proveedor obtenidos correctamente',
          data: mockRegistros
        });
      });
  
      it('debería manejar error al obtener registros por proveedor', async () => {
        // Configurar el mock para rechazar con error
        mockBitacoraModelInstance.findByProveedor.mockRejectedValue(new Error('Error de base de datos'));
  
        mockRequest.body = { proveedorId: '1' };
  
        await BitacoraController.getByProveedor(mockRequest as Request, mockResponse as Response);
  
        expect(mockResponse.status).toHaveBeenCalledWith(500);
        expect(mockResponse.json).toHaveBeenCalledWith({
          code: 1,
          message: 'Error al obtener registros por proveedor: Error de base de datos'
        });
      });
    });
  

  describe('getByProveedor', () => {
    it('debería obtener registros por proveedor exitosamente', async () => {
      const mockRegistros = [
        { 
          id: 1, 
          id_movimiento: 1, 
          id_proveedor: 1, 
          cantidad: 100, 
          id_producto: 1,
          fecha: new Date()
        }
      ];
      
      mockBitacoraModelInstance.findByProveedor.mockResolvedValue(mockRegistros);

      mockRequest.body = { proveedorId: '1' };

      await BitacoraController.getByProveedor(mockRequest as Request, mockResponse as Response);

      expect(mockResponse.json).toHaveBeenCalledWith({
        code: 0,
        message: 'Registros de bitácora por proveedor obtenidos correctamente',
        data: mockRegistros
      });
    });

    it('debería retornar 400 cuando falta proveedorId', async () => {
      mockRequest.body = {};

      await BitacoraController.getByProveedor(mockRequest as Request, mockResponse as Response);

      expect(mockResponse.status).toHaveBeenCalledWith(400);
      expect(mockResponse.json).toHaveBeenCalledWith({
        code: 1,
        message: 'El campo proveedorId es obligatorio en el body'
      });
    });

    it('debería retornar 400 cuando proveedorId es inválido', async () => {
      mockRequest.body = { proveedorId: '0' };

      await BitacoraController.getByProveedor(mockRequest as Request, mockResponse as Response);

      expect(mockResponse.status).toHaveBeenCalledWith(400);
      expect(mockResponse.json).toHaveBeenCalledWith({
        code: 1,
        message: 'El ID del proveedor debe ser un número mayor a 0'
      });
    });

    it('debería manejar error al obtener registros por proveedor', async () => {
      mockBitacoraModelInstance.findByProveedor.mockRejectedValue(new Error('Error de base de datos'));

      mockRequest.body = { proveedorId: '1' };

      await BitacoraController.getByProveedor(mockRequest as Request, mockResponse as Response);

      expect(mockResponse.status).toHaveBeenCalledWith(500);
      expect(mockResponse.json).toHaveBeenCalledWith({
        code: 1,
        message: 'Error al obtener registros por proveedor: Error de base de datos'
      });
    });
  });

  // Tests para validaciones específicas
  describe('validaciones', () => {
    it('debería aceptar IDs válidos como números', async () => {
      const nuevoRegistro = { 
        id: 1, 
        id_movimiento: 1, 
        id_proveedor: 1, 
        cantidad: 100, 
        id_producto: 1,
        fecha: new Date()
      };
      
      mockBitacoraModelInstance.create.mockResolvedValue(nuevoRegistro);

      mockRequest.body = {
        id_movimiento: '1',
        id_proveedor: '1',
        cantidad: '100',
        id_producto: '1'
      };

      await BitacoraController.create(mockRequest as Request, mockResponse as Response);

      expect(mockResponse.status).toHaveBeenCalledWith(201);
    });

    it('debería rechazar IDs como números negativos', async () => {
      mockRequest.body = {
        id_movimiento: '-1',
        id_proveedor: '1',
        cantidad: '100',
        id_producto: '1'
      };

      await BitacoraController.create(mockRequest as Request, mockResponse as Response);

      expect(mockResponse.status).toHaveBeenCalledWith(400);
    });

    it('debería rechazar IDs como cero', async () => {
      mockRequest.body = {
        id_movimiento: '0',
        id_proveedor: '1',
        cantidad: '100',
        id_producto: '1'
      };

      await BitacoraController.create(mockRequest as Request, mockResponse as Response);

      expect(mockResponse.status).toHaveBeenCalledWith(400);
    });

    it('debería rechazar IDs como strings no numéricos', async () => {
      mockRequest.body = {
        id_movimiento: 'abc',
        id_proveedor: '1',
        cantidad: '100',
        id_producto: '1'
      };

      await BitacoraController.create(mockRequest as Request, mockResponse as Response);

      expect(mockResponse.status).toHaveBeenCalledWith(400);
    });

    it('debería aceptar cantidad mínima válida', async () => {
      const nuevoRegistro = { 
        id: 1, 
        id_movimiento: 1, 
        id_proveedor: 1, 
        cantidad: 1, 
        id_producto: 1,
        fecha: new Date()
      };
      
      mockBitacoraModelInstance.create.mockResolvedValue(nuevoRegistro);

      mockRequest.body = {
        id_movimiento: '1',
        id_proveedor: '1',
        cantidad: '1',
        id_producto: '1'
      };

      await BitacoraController.create(mockRequest as Request, mockResponse as Response);

      expect(mockResponse.status).toHaveBeenCalledWith(201);
    });
  });
});
