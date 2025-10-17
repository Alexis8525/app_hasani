// src/controllers/productos-controller.ts
import { Request, Response } from 'express';
import { ProductoModel } from '../models/productos-model';
import { pool } from '../config/db';

const productoModel = new ProductoModel(pool);

const validarNombre = (nombre: string): boolean => {
  return !!nombre && nombre.trim().length > 0 && nombre.length <= 100;
};

const validarCodigo = (codigo: string): boolean => {
  return !!codigo && codigo.trim().length > 0 && codigo.length <= 50;
};

const validarUnidad = (unidad: string): boolean => {
  return !!unidad && unidad.trim().length > 0 && unidad.length <= 20;
};


const validarStock = (stock: number): boolean => {
  return stock >= 0;
};

const validarIdProveedor = (id_proveedor: any): boolean => {
  return !id_proveedor || (!isNaN(parseInt(id_proveedor)) && parseInt(id_proveedor) > 0);
};

export const ProductoController = {
  async getAll(req: Request, res: Response) {
    try {
      const productos = await productoModel.findAll();
      res.json({ 
        code: 0, 
        message: 'Productos obtenidos correctamente', 
        data: productos 
      });
    } catch (error: any) {
      res.status(500).json({ 
        code: 1, 
        message: 'Error al obtener productos: ' + error.message 
      });
    }
  },

  async getByNombre(req: Request, res: Response) {
    try {
      const { nombre } = req.body;
      
      if (!nombre) {
        return res.status(400).json({ 
          code: 1, 
          message: 'El campo nombre es obligatorio en el body' 
        });
      }

      if (!validarNombre(nombre)) {
        return res.status(400).json({ 
          code: 1, 
          message: 'El nombre debe tener entre 1 y 100 caracteres' 
        });
      }

      const producto = await productoModel.findByNombre(nombre);

      if (!producto) {
        return res.status(404).json({ 
          code: 1, 
          message: 'Producto no encontrado' 
        });
      }

      res.json({ 
        code: 0, 
        message: 'Producto obtenido correctamente', 
        data: producto 
      });
    } catch (error: any) {
      res.status(500).json({ 
        code: 1, 
        message: 'Error al obtener producto: ' + error.message 
      });
    }
  },

  async create(req: Request, res: Response) {
    try {
      const { codigo, nombre, descripcion, categoria, unidad, stock_minimo, stock_actual, id_proveedor } = req.body;

      if (!codigo) {
        return res.status(400).json({ 
          code: 1, 
          message: 'El campo código es obligatorio' 
        });
      }

      if (!nombre) {
        return res.status(400).json({ 
          code: 1, 
          message: 'El campo nombre es obligatorio' 
        });
      }

      if (!unidad) {
        return res.status(400).json({ 
          code: 1, 
          message: 'El campo unidad es obligatorio' 
        });
      }

      if (!validarCodigo(codigo)) {
        return res.status(400).json({ 
          code: 1, 
          message: 'El código debe tener entre 1 y 50 caracteres' 
        });
      }

      if (!validarNombre(nombre)) {
        return res.status(400).json({ 
          code: 1, 
          message: 'El nombre debe tener entre 1 y 100 caracteres' 
        });
      }

      if (!validarUnidad(unidad)) {
        return res.status(400).json({ 
          code: 1, 
          message: 'La unidad debe tener entre 1 y 20 caracteres' 
        });
      }

      if (descripcion && descripcion.length > 500) {
        return res.status(400).json({ 
          code: 1, 
          message: 'La descripción no puede tener más de 500 caracteres' 
        });
      }

      if (categoria && categoria.length > 100) {
        return res.status(400).json({ 
          code: 1, 
          message: 'La categoría no puede tener más de 100 caracteres' 
        });
      }

      if (!validarStock(stock_minimo)) {
        return res.status(400).json({ 
          code: 1, 
          message: 'El stock mínimo no puede ser negativo' 
        });
      }

      if (!validarStock(stock_actual)) {
        return res.status(400).json({ 
          code: 1, 
          message: 'El stock actual no puede ser negativo' 
        });
      }

      if (!validarIdProveedor(id_proveedor)) {
        return res.status(400).json({ 
          code: 1, 
          message: 'El ID del proveedor debe ser un número mayor a 0' 
        });
      }

      // Verificar si el producto ya existe
      const productoExistente = await productoModel.findByNombre(nombre);
      if (productoExistente) {
        return res.status(400).json({ 
          code: 1, 
          message: 'Ya existe un producto con este nombre' 
        });
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

      res.status(201).json({ 
        code: 0, 
        message: 'Producto creado correctamente', 
        data: nuevoProducto 
      });
    } catch (error: any) {
      res.status(500).json({ 
        code: 1, 
        message: 'Error al crear producto: ' + error.message 
      });
    }
  },

  async update(req: Request, res: Response) {
    try {
      const { nombre, codigo, descripcion, categoria, unidad, stock_minimo, stock_actual, id_proveedor } = req.body;

      if (!nombre) {
        return res.status(400).json({ 
          code: 1, 
          message: 'El campo nombre es obligatorio en el body' 
        });
      }

      if (!validarNombre(nombre)) {
        return res.status(400).json({ 
          code: 1, 
          message: 'El nombre debe tener entre 1 y 100 caracteres' 
        });
      }

      if (codigo && !validarCodigo(codigo)) {
        return res.status(400).json({ 
          code: 1, 
          message: 'El código debe tener entre 1 y 50 caracteres' 
        });
      }

      if (unidad && !validarUnidad(unidad)) {
        return res.status(400).json({ 
          code: 1, 
          message: 'La unidad debe tener entre 1 y 20 caracteres' 
        });
      }

      if (descripcion && descripcion.length > 500) {
        return res.status(400).json({ 
          code: 1, 
          message: 'La descripción no puede tener más de 500 caracteres' 
        });
      }

      if (categoria && categoria.length > 100) {
        return res.status(400).json({ 
          code: 1, 
          message: 'La categoría no puede tener más de 100 caracteres' 
        });
      }

      if (stock_minimo !== undefined && !validarStock(stock_minimo)) {
        return res.status(400).json({ 
          code: 1, 
          message: 'El stock mínimo no puede ser negativo' 
        });
      }

      if (stock_actual !== undefined && !validarStock(stock_actual)) {
        return res.status(400).json({ 
          code: 1, 
          message: 'El stock actual no puede ser negativo' 
        });
      }

      if (!validarIdProveedor(id_proveedor)) {
        return res.status(400).json({ 
          code: 1, 
          message: 'El ID del proveedor debe ser un número mayor a 0' 
        });
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
        return res.status(404).json({ 
          code: 1, 
          message: 'Producto no encontrado para actualizar' 
        });
      }

      res.json({ 
        code: 0, 
        message: 'Producto actualizado correctamente', 
        data: productoActualizado 
      });
    } catch (error: any) {
      res.status(500).json({ 
        code: 1, 
        message: 'Error al actualizar producto: ' + error.message 
      });
    }
  },

  async delete(req: Request, res: Response) {
    try {
      const { nombre } = req.body;
      
      if (!nombre) {
        return res.status(400).json({ 
          code: 1, 
          message: 'El campo nombre es obligatorio en el body' 
        });
      }

      if (!validarNombre(nombre)) {
        return res.status(400).json({ 
          code: 1, 
          message: 'El nombre debe tener entre 1 y 100 caracteres' 
        });
      }

      const eliminado = await productoModel.delete(nombre);

      if (!eliminado) {
        return res.status(404).json({ 
          code: 1, 
          message: 'Producto no encontrado para eliminar' 
        });
      }

      res.json({ 
        code: 0, 
        message: 'Producto eliminado correctamente' 
      });
    } catch (error: any) {
      res.status(500).json({ 
        code: 1, 
        message: 'Error al eliminar producto: ' + error.message 
      });
    }
  },

  async getLowStock(req: Request, res: Response) {
    try {
      const productos = await productoModel.findLowStock();
      res.json({ 
        code: 0, 
        message: 'Productos con stock bajo obtenidos correctamente', 
        data: productos 
      });
    } catch (error: any) {
      res.status(500).json({ 
        code: 1, 
        message: 'Error al obtener productos con stock bajo: ' + error.message 
      });
    }
  }
};