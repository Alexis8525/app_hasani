import { Request, Response } from 'express';
import { BitacoraModel, Bitacora } from '../models/bitacora-model';
import { pool } from '../config/db';

const bitacoraModel = new BitacoraModel(pool);

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

      if (!id_movimiento || !id_proveedor || !cantidad || !id_producto) {
        return res.status(400).json({
          code: 1,
          message: 'Todos los campos son obligatorios'
        });
      }

      const nuevoRegistro = await bitacoraModel.create({
        id_movimiento,
        id_proveedor,
        cantidad,
        id_producto
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
      const id_movimiento = parseInt(req.params.movimientoId);
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
      const id_proveedor = parseInt(req.params.proveedorId);
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