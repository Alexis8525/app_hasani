// src/controllers/productos-controller.ts
import { Request, Response } from 'express';
import { ProductoModel } from '../models/productos-model';
import { pool } from '../config/db';

const productoModel = new ProductoModel(pool);

export const ProductoController = {
  async getAll(req: Request, res: Response) {
    try {
      const productos = await productoModel.findAll();
      res.json({ code: 0, message: 'Productos obtenidos correctamente', data: productos });
    } catch (error: any) {
      res.status(500).json({ code: 1, message: 'Error al obtener productos: ' + error.message });
    }
  },

  async getByNombre(req: Request, res: Response) {
    try {
      // Cambiar de params a body
      const { nombre } = req.body;
      
      if (!nombre) {
        return res.status(400).json({ code: 1, message: 'El campo nombre es obligatorio en el body' });
      }

      const producto = await productoModel.findByNombre(nombre);

      if (!producto) {
        return res.status(404).json({ code: 1, message: 'Producto no encontrado' });
      }

      res.json({ code: 0, message: 'Producto obtenido correctamente', data: producto });
    } catch (error: any) {
      res.status(500).json({ code: 1, message: 'Error al obtener producto: ' + error.message });
    }
  },

  async create(req: Request, res: Response) {
    try {
      const { codigo, nombre, descripcion, categoria, unidad, stock_minimo, stock_actual, id_proveedor } = req.body;

      if (!codigo || !nombre || !unidad) {
        return res.status(400).json({ code: 1, message: 'Los campos codigo, nombre y unidad son obligatorios' });
      }

      // Verificar si el código ya existe
      const productoExistente = await productoModel.findByNombre(nombre);
      if (productoExistente) {
        return res.status(400).json({ code: 1, message: 'Ya existe un producto con este nombre' });
      }

      const nuevoProducto = await productoModel.create({
        codigo,
        nombre,
        descripcion,
        categoria,
        unidad,
        stock_minimo: stock_minimo || 0,
        stock_actual: stock_actual || 0,
        id_proveedor
      });

      res.status(201).json({ code: 0, message: 'Producto creado correctamente', data: nuevoProducto });
    } catch (error: any) {
      res.status(500).json({ code: 1, message: 'Error al crear producto: ' + error.message });
    }
  },

  async update(req: Request, res: Response) {
    try {
      // Cambiar de params a body
      const { nombre } = req.body;
      const { codigo, descripcion, categoria, unidad, stock_minimo, stock_actual, id_proveedor } = req.body;

      if (!nombre) {
        return res.status(400).json({ code: 1, message: 'El campo nombre es obligatorio en el body' });
      }

      const productoActualizado = await productoModel.update(nombre, {
        codigo,
        descripcion,
        categoria,
        unidad,
        stock_minimo,
        stock_actual,
        id_proveedor
      });

      if (!productoActualizado) {
        return res.status(404).json({ code: 1, message: 'Producto no encontrado' });
      }

      res.json({ code: 0, message: 'Producto actualizado correctamente', data: productoActualizado });
    } catch (error: any) {
      res.status(500).json({ code: 1, message: 'Error al actualizar producto: ' + error.message });
    }
  },

  async delete(req: Request, res: Response) {
    try {
      // Cambiar de params a body
      const { nombre } = req.body;
      
      if (!nombre) {
        return res.status(400).json({ code: 1, message: 'El campo nombre es obligatorio en el body' });
      }

      const eliminado = await productoModel.delete(nombre);

      if (!eliminado) {
        return res.status(404).json({ code: 1, message: 'Producto no encontrado' });
      }

      res.json({ code: 0, message: 'Producto eliminado correctamente' });
    } catch (error: any) {
      res.status(500).json({ code: 1, message: 'Error al eliminar producto: ' + error.message });
    }
  },

  async getLowStock(req: Request, res: Response) {
    try {
      const productos = await productoModel.findLowStock();
      res.json({ code: 0, message: 'Productos con stock bajo obtenidos correctamente', data: productos });
    } catch (error: any) {
      res.status(500).json({ code: 1, message: 'Error al obtener productos con stock bajo: ' + error.message });
    }
  }
};
