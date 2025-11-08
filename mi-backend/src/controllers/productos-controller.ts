// src/controllers/productos-controller.ts
import { Request, Response } from 'express';
import { ProductoModel } from '../models/productos-model';
import { pool } from '../config/db';
import { StockAlertService } from '../helpers/stock-alerts';

const productoModel = new ProductoModel(pool);
const stockAlertService = new StockAlertService(pool);

export const ProductoController = {
  async getAll(req: Request, res: Response) {
    try {
      const productos = await productoModel.findAll();
      res.json({
        code: 0,
        message: 'Productos obtenidos correctamente',
        data: productos,
        total: productos.length
      });
    } catch (error: any) {
      console.error('Error en getAll:', error);
      res.status(500).json({
        code: 1,
        message: 'Error al obtener productos: ' + error.message,
      });
    }
  },

  async checkStockAlerts(req: Request, res: Response) {
    try {
      const alertas = await stockAlertService.verificarStockBajoGeneral();
      res.json({
        code: 0,
        message: `Verificación completada. ${alertas.length} productos con stock bajo.`,
        data: alertas,
      });
    } catch (error: any) {
      console.error('Error en checkStockAlerts:', error);
      res.status(500).json({
        code: 1,
        message: 'Error verificando alertas de stock: ' + error.message,
      });
    }
  },

  async getByNombre(req: Request, res: Response) {
    try {
      const { nombre } = req.body;

      if (!nombre || nombre.trim().length === 0) {
        return res.status(400).json({
          code: 1,
          message: 'El campo nombre es obligatorio',
        });
      }

      const productos = await productoModel.findByNombre(nombre);

      if (productos.length === 0) {
        return res.json({
          code: 0,
          message: `No se encontraron productos con el nombre "${nombre}"`,
          data: [],
          total: 0,
          busquedaOriginal: nombre,
        });
      }

      res.json({
        code: 0,
        message: `Se encontraron ${productos.length} producto(s) con el nombre "${nombre}"`,
        data: productos,
        total: productos.length,
        busquedaOriginal: nombre,
      });
    } catch (error: any) {
      console.error('Error en getByNombre:', error);
      res.status(500).json({
        code: 1,
        message: 'Error al buscar productos: ' + error.message,
      });
    }
  },

  // NUEVO: Búsqueda avanzada
  async searchAdvanced(req: Request, res: Response) {
    try {
      const { termino, codigo, categoria, nombre } = req.body;

      // Si no hay criterios de búsqueda, devolver todos los productos
      if (!termino && !codigo && !categoria && !nombre) {
        const productos = await productoModel.findAll();
        return res.json({
          code: 0,
          message: 'Mostrando todos los productos',
          data: productos,
          total: productos.length
        });
      }

      const productos = await productoModel.searchAdvanced({
        termino,
        codigo,
        categoria,
        nombre
      });

      res.json({
        code: 0,
        message: `Búsqueda completada. Se encontraron ${productos.length} producto(s)`,
        data: productos,
        total: productos.length
      });
    } catch (error: any) {
      console.error('Error en searchAdvanced:', error);
      res.status(500).json({
        code: 1,
        message: 'Error en búsqueda avanzada: ' + error.message,
      });
    }
  },

  async create(req: Request, res: Response) {
    try {
      const {
        codigo,
        nombre,
        descripcion,
        categoria,
        unidad,
        stock_minimo = 0,
        stock_actual = 0,
        id_proveedor,
      } = req.body;

      // Validaciones básicas
      if (!codigo || codigo.trim().length === 0) {
        return res.status(400).json({
          code: 1,
          message: 'El campo código es obligatorio',
        });
      }

      if (!nombre || nombre.trim().length === 0) {
        return res.status(400).json({
          code: 1,
          message: 'El campo nombre es obligatorio',
        });
      }

      if (!unidad || unidad.trim().length === 0) {
        return res.status(400).json({
          code: 1,
          message: 'El campo unidad es obligatorio',
        });
      }

      if (stock_minimo < 0) {
        return res.status(400).json({
          code: 1,
          message: 'El stock mínimo no puede ser negativo',
        });
      }

      if (stock_actual < 0) {
        return res.status(400).json({
          code: 1,
          message: 'El stock actual no puede ser negativo',
        });
      }

      const nuevoProducto = await productoModel.create({
        codigo: codigo.trim(),
        nombre: nombre.trim(),
        descripcion: descripcion?.trim(),
        categoria: categoria?.trim(),
        unidad: unidad.trim(),
        stock_minimo,
        stock_actual,
        id_proveedor: id_proveedor || null,
      });

      res.status(201).json({
        code: 0,
        message: 'Producto creado correctamente',
        data: nuevoProducto,
      });
    } catch (error: any) {
      console.error('Error en create:', error);
      
      // Manejar errores de duplicados específicamente
      if (error.message.includes('Ya existe')) {
        return res.status(400).json({
          code: 1,
          message: error.message,
        });
      }

      res.status(500).json({
        code: 1,
        message: 'Error al crear producto: ' + error.message,
      });
    }
  },

  async update(req: Request, res: Response) {
    try {
      const {
        nombre: nombreOriginal,
        codigo,
        nombre: nuevoNombre,
        descripcion,
        categoria,
        unidad,
        stock_minimo,
        stock_actual,
        id_proveedor,
      } = req.body;

      if (!nombreOriginal || nombreOriginal.trim().length === 0) {
        return res.status(400).json({
          code: 1,
          message: 'El nombre original es obligatorio para la actualización',
        });
      }

      const productoActualizado = await productoModel.update(nombreOriginal, {
        codigo,
        nombre: nuevoNombre,
        descripcion,
        categoria,
        unidad,
        stock_minimo,
        stock_actual,
        id_proveedor,
      });

      res.json({
        code: 0,
        message: 'Producto actualizado correctamente',
        data: productoActualizado,
      });
    } catch (error: any) {
      console.error('Error en update:', error);
      
      if (error.message.includes('No se encontró')) {
        return res.status(404).json({
          code: 1,
          message: error.message,
        });
      }

      if (error.message.includes('Ya existe')) {
        return res.status(400).json({
          code: 1,
          message: error.message,
        });
      }

      res.status(500).json({
        code: 1,
        message: 'Error al actualizar producto: ' + error.message,
      });
    }
  },

  async delete(req: Request, res: Response) {
    try {
      const { nombre } = req.body;

      if (!nombre || nombre.trim().length === 0) {
        return res.status(400).json({
          code: 1,
          message: 'El campo nombre es obligatorio',
        });
      }

      const eliminado = await productoModel.delete(nombre);

      if (!eliminado) {
        return res.status(404).json({
          code: 1,
          message: 'Producto no encontrado para eliminar',
        });
      }

      res.json({
        code: 0,
        message: 'Producto eliminado correctamente',
      });
    } catch (error: any) {
      console.error('Error en delete:', error);
      res.status(500).json({
        code: 1,
        message: 'Error al eliminar producto: ' + error.message,
      });
    }
  },

  async getLowStock(req: Request, res: Response) {
    try {
      const productos = await productoModel.findLowStock();
      res.json({
        code: 0,
        message: 'Productos con stock bajo obtenidos correctamente',
        data: productos,
        total: productos.length
      });
    } catch (error: any) {
      console.error('Error en getLowStock:', error);
      res.status(500).json({
        code: 1,
        message: 'Error al obtener productos con stock bajo: ' + error.message,
      });
    }
  },
};
