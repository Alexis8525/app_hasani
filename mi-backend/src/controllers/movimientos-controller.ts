// src/controllers/movimientos-controller.ts
import { Request, Response } from 'express';
import { MovimientoModel } from '../models/movimientos-model';
import { ProductoModel } from '../models/productos-model';
import { pool } from '../config/db';

const movimientoModel = new MovimientoModel(pool);
const productoModel = new ProductoModel(pool);

export const MovimientoController = {
  async getAll(req: Request, res: Response) {
    try {
      const movimientos = await movimientoModel.findAll();
      res.json({ code: 0, message: 'Movimientos obtenidos correctamente', data: movimientos });
    } catch (error: any) {
      res.status(500).json({ code: 1, message: 'Error al obtener movimientos: ' + error.message });
    }
  },

  async getById(req: Request, res: Response) {
    try {
      // Cambiar de params a body
      const { id } = req.body;
      
      if (!id) {
        return res.status(400).json({ code: 1, message: 'El campo id es obligatorio en el body' });
      }

      const movimientoId = parseInt(id);
      const movimiento = await movimientoModel.findById(movimientoId);

      if (!movimiento) return res.status(404).json({ code: 1, message: 'Movimiento no encontrado' });

      res.json({ code: 0, message: 'Movimiento obtenido correctamente', data: movimiento });
    } catch (error: any) {
      res.status(500).json({ code: 1, message: 'Error al obtener movimiento: ' + error.message });
    }
  },

  async create(req: Request, res: Response) {
    try {
      const { tipo, nombreProducto, cantidad, referencia, responsable, id_cliente } = req.body;

      if (!tipo || !nombreProducto || !cantidad || !responsable) {
        return res.status(400).json({ code: 1, message: 'Los campos tipo, nombreProducto, cantidad y responsable son obligatorios' });
      }

      if (!['Entrada', 'Salida'].includes(tipo)) {
        return res.status(400).json({ code: 1, message: 'El tipo debe ser "Entrada" o "Salida"' });
      }

      if (cantidad <= 0) {
        return res.status(400).json({ code: 1, message: 'La cantidad debe ser mayor a 0' });
      }

      const producto = await productoModel.findByNombre(nombreProducto);
      if (!producto) return res.status(404).json({ code: 1, message: 'Producto no encontrado' });

      if (tipo === 'Salida' && producto.stock_actual < cantidad) {
        return res.status(400).json({ code: 1, message: `Stock insuficiente. Stock actual: ${producto.stock_actual}` });
      }

      const nuevoMovimiento = await movimientoModel.create({
        tipo,
        id_producto: producto.id_producto,
        cantidad,
        referencia,
        responsable,
        id_cliente
      });

      // Actualizar stock
      const nuevoStock = tipo === 'Entrada' ? producto.stock_actual + cantidad : producto.stock_actual - cantidad;
      await productoModel.updateStock(producto.nombre, nuevoStock);

      res.status(201).json({ code: 0, message: 'Movimiento creado correctamente', data: nuevoMovimiento });
    } catch (error: any) {
      res.status(500).json({ code: 1, message: 'Error al crear movimiento: ' + error.message });
    }
  },

  async getByProducto(req: Request, res: Response) {
    try {
      // Cambiar de params a body
      const { nombreProducto } = req.body;
      
      if (!nombreProducto) {
        return res.status(400).json({ code: 1, message: 'El campo nombreProducto es obligatorio en el body' });
      }

      const movimientos = await movimientoModel.findByProductoNombre(nombreProducto);

      res.json({ code: 0, message: 'Movimientos del producto obtenidos correctamente', data: movimientos });
    } catch (error: any) {
      res.status(500).json({ code: 1, message: 'Error al obtener movimientos del producto: ' + error.message });
    }
  },

  async getByDateRange(req: Request, res: Response) {
    try {
      // Cambiar de query a body
      const { fechaInicio, fechaFin } = req.body;
      
      if (!fechaInicio || !fechaFin) {
        return res.status(400).json({ code: 1, message: 'Los campos fechaInicio y fechaFin son obligatorios en el body' });
      }

      const movimientos = await movimientoModel.findByDateRange(new Date(fechaInicio), new Date(fechaFin));
      res.json({ code: 0, message: 'Movimientos por rango de fecha obtenidos correctamente', data: movimientos });
    } catch (error: any) {
      res.status(500).json({ code: 1, message: 'Error al obtener movimientos por fecha: ' + error.message });
    }
  }
};
