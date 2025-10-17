// src/controllers/bitacora-controller.ts
import { Request, Response } from 'express';
import { BitacoraModel, Bitacora } from '../models/bitacora-model';
import { pool } from '../config/db';

const bitacoraModel = new BitacoraModel(pool);

const validarId = (id: any): boolean => {
  return id && !isNaN(parseInt(id)) && parseInt(id) > 0;
};

const validarCantidad = (cantidad: number): boolean => {
  return cantidad > 0 && cantidad <= 1000000;
};

const validarCamposObligatorios = (campos: any): string | null => {
  const { id_movimiento, id_proveedor, cantidad, id_producto } = campos;
  
  if (!id_movimiento) return 'id_movimiento';
  if (!id_proveedor) return 'id_proveedor';
  if (!cantidad) return 'cantidad';
  if (!id_producto) return 'id_producto';
  
  return null;
};

export const BitacoraController = {
  async getAll(req: Request, res: Response) {
    try {
      const bitacora = await bitacoraModel.findAll();
      res.json({
        code: 0,
        message: 'Bitácora obtenida correctamente',
        data: bitacora
      });
    } catch (error: any) {
      res.status(500).json({
        code: 1,
        message: 'Error al obtener bitácora: ' + error.message
      });
    }
  },

  async create(req: Request, res: Response) {
    try {
      const { id_movimiento, id_proveedor, cantidad, id_producto } = req.body;

      // Validar campos obligatorios
      const campoFaltante = validarCamposObligatorios({ id_movimiento, id_proveedor, cantidad, id_producto });
      if (campoFaltante) {
        return res.status(400).json({
          code: 1,
          message: `El campo ${campoFaltante} es obligatorio`
        });
      }

      // Validar formato de IDs
      if (!validarId(id_movimiento)) {
        return res.status(400).json({
          code: 1,
          message: 'El ID del movimiento debe ser un número mayor a 0'
        });
      }

      if (!validarId(id_proveedor)) {
        return res.status(400).json({
          code: 1,
          message: 'El ID del proveedor debe ser un número mayor a 0'
        });
      }

      if (!validarId(id_producto)) {
        return res.status(400).json({
          code: 1,
          message: 'El ID del producto debe ser un número mayor a 0'
        });
      }

      // Validar cantidad
      if (!validarCantidad(cantidad)) {
        return res.status(400).json({
          code: 1,
          message: 'La cantidad debe ser mayor a 0 y no mayor a 1,000,000'
        });
      }

      const nuevoRegistro = await bitacoraModel.create({
        id_movimiento: parseInt(id_movimiento),
        id_proveedor: parseInt(id_proveedor),
        cantidad: parseInt(cantidad),
        id_producto: parseInt(id_producto)
      });

      res.status(201).json({
        code: 0,
        message: 'Registro de bitácora creado correctamente',
        data: nuevoRegistro
      });
    } catch (error: any) {
      res.status(500).json({
        code: 1,
        message: 'Error al crear registro de bitácora: ' + error.message
      });
    }
  },

  async getByMovimiento(req: Request, res: Response) {
    try {
      const { movimientoId } = req.body;
      
      if (!movimientoId) {
        return res.status(400).json({
          code: 1,
          message: 'El campo movimientoId es obligatorio en el body'
        });
      }

      if (!validarId(movimientoId)) {
        return res.status(400).json({
          code: 1,
          message: 'El ID del movimiento debe ser un número mayor a 0'
        });
      }

      const id_movimiento = parseInt(movimientoId);
      const registros = await bitacoraModel.findByMovimiento(id_movimiento);
      
      res.json({
        code: 0,
        message: 'Registros de bitácora por movimiento obtenidos correctamente',
        data: registros
      });
    } catch (error: any) {
      res.status(500).json({
        code: 1,
        message: 'Error al obtener registros por movimiento: ' + error.message
      });
    }
  },

  async getByProveedor(req: Request, res: Response) {
    try {
      const { proveedorId } = req.body;
      
      if (!proveedorId) {
        return res.status(400).json({
          code: 1,
          message: 'El campo proveedorId es obligatorio en el body'
        });
      }

      if (!validarId(proveedorId)) {
        return res.status(400).json({
          code: 1,
          message: 'El ID del proveedor debe ser un número mayor a 0'
        });
      }

      const id_proveedor = parseInt(proveedorId);
      const registros = await bitacoraModel.findByProveedor(id_proveedor);
      
      res.json({
        code: 0,
        message: 'Registros de bitácora por proveedor obtenidos correctamente',
        data: registros
      });
    } catch (error: any) {
      res.status(500).json({
        code: 1,
        message: 'Error al obtener registros por proveedor: ' + error.message
      });
    }
  }
};
