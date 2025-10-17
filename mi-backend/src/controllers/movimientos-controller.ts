// src/controllers/movimientos-controller.ts
import { Request, Response } from 'express';
import { MovimientoModel } from '../models/movimientos-model';
import { ProductoModel } from '../models/productos-model';
import { pool } from '../config/db';

const movimientoModel = new MovimientoModel(pool);
const productoModel = new ProductoModel(pool);

const validarId = (id: any): boolean => {
  return id && !isNaN(parseInt(id)) && parseInt(id) > 0;
};

const validarTipo = (tipo: string): boolean => {
  return ['Entrada', 'Salida'].includes(tipo);
};

const validarCantidad = (cantidad: number): boolean => {
  return cantidad > 0 && cantidad <= 1000000;
};

const validarNombreProducto = (nombre: string): boolean => {
  return !!nombre && nombre.trim().length > 0 && nombre.length <= 100;
};

const validarReferencia = (referencia: string): boolean => {
  return !referencia || referencia.length <= 200;
};

const validarFechas = (fechaInicio: string, fechaFin: string): boolean => {
  if (!fechaInicio || !fechaFin) return false;
  
  const inicio = new Date(fechaInicio);
  const fin = new Date(fechaFin);
  
  return inicio <= fin;
};

export const MovimientoController = {
  async getAll(req: Request, res: Response) {
    try {
      const movimientos = await movimientoModel.findAll();
      res.json({ 
        code: 0, 
        message: 'Movimientos obtenidos correctamente', 
        data: movimientos 
      });
    } catch (error: any) {
      res.status(500).json({ 
        code: 1, 
        message: 'Error al obtener movimientos: ' + error.message 
      });
    }
  },

  async getById(req: Request, res: Response) {
    try {
      const { id } = req.body;
      
      if (!id) {
        return res.status(400).json({ 
          code: 1, 
          message: 'El campo id es obligatorio en el body' 
        });
      }

      if (!validarId(id)) {
        return res.status(400).json({ 
          code: 1, 
          message: 'El ID debe ser un número mayor a 0' 
        });
      }

      const movimientoId = parseInt(id);
      const movimiento = await movimientoModel.findById(movimientoId);

      if (!movimiento) {
        return res.status(404).json({ 
          code: 1, 
          message: 'Movimiento no encontrado' 
        });
      }

      res.json({ 
        code: 0, 
        message: 'Movimiento obtenido correctamente', 
        data: movimiento 
      });
    } catch (error: any) {
      res.status(500).json({ 
        code: 1, 
        message: 'Error al obtener movimiento: ' + error.message 
      });
    }
  },

  async create(req: Request, res: Response) {
    try {
      const { tipo, nombreProducto, cantidad, referencia, responsable, id_cliente } = req.body;

      // Validaciones de campos obligatorios
      if (!tipo) {
        return res.status(400).json({ 
          code: 1, 
          message: 'El campo tipo es obligatorio' 
        });
      }

      if (!nombreProducto) {
        return res.status(400).json({ 
          code: 1, 
          message: 'El campo nombreProducto es obligatorio' 
        });
      }

      if (!cantidad) {
        return res.status(400).json({ 
          code: 1, 
          message: 'El campo cantidad es obligatorio' 
        });
      }

      if (!responsable) {
        return res.status(400).json({ 
          code: 1, 
          message: 'El campo responsable es obligatorio' 
        });
      }

      // Validaciones de formato
      if (!validarTipo(tipo)) {
        return res.status(400).json({ 
          code: 1, 
          message: 'El tipo debe ser "Entrada" o "Salida"' 
        });
      }

      if (!validarNombreProducto(nombreProducto)) {
        return res.status(400).json({ 
          code: 1, 
          message: 'El nombre del producto debe tener entre 1 y 100 caracteres' 
        });
      }

      if (!validarCantidad(cantidad)) {
        return res.status(400).json({ 
          code: 1, 
          message: 'La cantidad debe ser mayor a 0 y no mayor a 1,000,000' 
        });
      }

      if (!validarReferencia(referencia)) {
        return res.status(400).json({ 
          code: 1, 
          message: 'La referencia no puede tener más de 200 caracteres' 
        });
      }

      if (!validarId(responsable)) {
        return res.status(400).json({ 
          code: 1, 
          message: 'El responsable debe ser un número mayor a 0' 
        });
      }

      if (id_cliente && !validarId(id_cliente)) {
        return res.status(400).json({ 
          code: 1, 
          message: 'El ID del cliente debe ser un número mayor a 0' 
        });
      }

      const producto = await productoModel.findByNombre(nombreProducto);
      if (!producto) {
        return res.status(404).json({ 
          code: 1, 
          message: 'Producto no encontrado' 
        });
      }

      if (tipo === 'Salida' && producto.stock_actual < cantidad) {
        return res.status(400).json({ 
          code: 1, 
          message: `Stock insuficiente. Stock actual: ${producto.stock_actual}, cantidad solicitada: ${cantidad}` 
        });
      }

      const nuevoMovimiento = await movimientoModel.create({
        tipo,
        id_producto: producto.id_producto,
        cantidad,
        referencia,
        responsable: parseInt(responsable),
        id_cliente: id_cliente ? parseInt(id_cliente) : undefined
      });

      // Actualizar stock
      const nuevoStock = tipo === 'Entrada' 
        ? producto.stock_actual + cantidad 
        : producto.stock_actual - cantidad;
      
      await productoModel.updateStock(producto.nombre, nuevoStock);

      res.status(201).json({ 
        code: 0, 
        message: 'Movimiento creado correctamente', 
        data: nuevoMovimiento 
      });
    } catch (error: any) {
      res.status(500).json({ 
        code: 1, 
        message: 'Error al crear movimiento: ' + error.message 
      });
    }
  },

  async getByProducto(req: Request, res: Response) {
    try {
      const { nombreProducto } = req.body;
      
      if (!nombreProducto) {
        return res.status(400).json({ 
          code: 1, 
          message: 'El campo nombreProducto es obligatorio en el body' 
        });
      }

      if (!validarNombreProducto(nombreProducto)) {
        return res.status(400).json({ 
          code: 1, 
          message: 'El nombre del producto debe tener entre 1 y 100 caracteres' 
        });
      }

      const movimientos = await movimientoModel.findByProductoNombre(nombreProducto);

      res.json({ 
        code: 0, 
        message: 'Movimientos del producto obtenidos correctamente', 
        data: movimientos 
      });
    } catch (error: any) {
      res.status(500).json({ 
        code: 1, 
        message: 'Error al obtener movimientos del producto: ' + error.message 
      });
    }
  },

  async getByDateRange(req: Request, res: Response) {
    try {
      const { fechaInicio, fechaFin } = req.body;
      
      if (!fechaInicio || !fechaFin) {
        return res.status(400).json({ 
          code: 1, 
          message: 'Los campos fechaInicio y fechaFin son obligatorios en el body' 
        });
      }

      if (!validarFechas(fechaInicio, fechaFin)) {
        return res.status(400).json({ 
          code: 1, 
          message: 'La fecha de inicio no puede ser mayor a la fecha de fin' 
        });
      }

      // Validar que el rango no sea mayor a 1 año
      const inicio = new Date(fechaInicio);
      const fin = new Date(fechaFin);
      const unAnioEnMs = 365 * 24 * 60 * 60 * 1000;
      
      if (fin.getTime() - inicio.getTime() > unAnioEnMs) {
        return res.status(400).json({ 
          code: 1, 
          message: 'El rango de fechas no puede ser mayor a 1 año' 
        });
      }

      const movimientos = await movimientoModel.findByDateRange(inicio, fin);
      
      res.json({ 
        code: 0, 
        message: 'Movimientos por rango de fecha obtenidos correctamente', 
        data: movimientos 
      });
    } catch (error: any) {
      res.status(500).json({ 
        code: 1, 
        message: 'Error al obtener movimientos por fecha: ' + error.message 
      });
    }
  }
};
