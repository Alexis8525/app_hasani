// src/controllers/proveedores-controller.ts
import { Request, Response } from 'express';
import { ProveedorModel } from '../models/proveedores-model';
import { pool } from '../config/db';

const proveedorModel = new ProveedorModel(pool);

const validarTelefono = (telefono?: string): boolean => {
  return !telefono || /^\d{10}$/.test(telefono);
};

const validarNombre = (nombre: string): boolean => {
  return (
    nombre !== undefined && nombre !== null && nombre.trim().length > 0 && nombre.length <= 100
  );
};

export const ProveedorController = {
  async getAll(req: Request, res: Response) {
    try {
      const proveedores = await proveedorModel.findAll();
      res.json({
        code: 0,
        message: 'Proveedores obtenidos correctamente',
        data: proveedores,
      });
    } catch (error: any) {
      res.status(500).json({
        code: 1,
        message: 'Error al obtener proveedores: ' + error.message,
      });
    }
  },

  async getByNombre(req: Request, res: Response) {
    try {
      const { nombre } = req.body;

      if (!nombre) {
        return res.status(400).json({
          code: 1,
          message: 'El campo nombre es obligatorio en el body',
        });
      }

      if (!validarNombre(nombre)) {
        return res.status(400).json({
          code: 1,
          message: 'El nombre debe tener entre 1 y 100 caracteres',
        });
      }

      const proveedor = await proveedorModel.findByNombre(nombre);

      if (!proveedor) {
        return res.status(404).json({
          code: 1,
          message: 'Proveedor no encontrado',
        });
      }

      res.json({
        code: 0,
        message: 'Proveedor obtenido correctamente',
        data: proveedor,
      });
    } catch (error: any) {
      res.status(500).json({
        code: 1,
        message: 'Error al obtener proveedor: ' + error.message,
      });
    }
  },

  async create(req: Request, res: Response) {
    try {
      const { nombre, telefono, contacto } = req.body;

      if (!nombre) {
        return res.status(400).json({
          code: 1,
          message: 'El campo nombre es obligatorio',
        });
      }

      if (!validarNombre(nombre)) {
        return res.status(400).json({
          code: 1,
          message: 'El nombre debe tener entre 1 y 100 caracteres',
        });
      }

      if (!validarTelefono(telefono)) {
        return res.status(400).json({
          code: 1,
          message: 'El teléfono debe tener exactamente 10 dígitos numéricos',
        });
      }

      if (contacto && contacto.length > 100) {
        return res.status(400).json({
          code: 1,
          message: 'El contacto no puede tener más de 100 caracteres',
        });
      }

      const nuevoProveedor = await proveedorModel.create({
        nombre,
        telefono,
        contacto,
      });

      res.status(201).json({
        code: 0,
        message: 'Proveedor creado correctamente',
        data: nuevoProveedor,
      });
    } catch (error: any) {
      res.status(500).json({
        code: 1,
        message: 'Error al crear proveedor: ' + error.message,
      });
    }
  },

  async update(req: Request, res: Response) {
    try {
      const { nombre, telefono, contacto } = req.body;

      if (!nombre) {
        return res.status(400).json({
          code: 1,
          message: 'El campo nombre es obligatorio en el body',
        });
      }

      if (!validarNombre(nombre)) {
        return res.status(400).json({
          code: 1,
          message: 'El nombre debe tener entre 1 y 100 caracteres',
        });
      }

      if (!validarTelefono(telefono)) {
        return res.status(400).json({
          code: 1,
          message: 'El teléfono debe tener exactamente 10 dígitos numéricos',
        });
      }

      if (contacto && contacto.length > 100) {
        return res.status(400).json({
          code: 1,
          message: 'El contacto no puede tener más de 100 caracteres',
        });
      }

      const proveedorActualizado = await proveedorModel.update(nombre, {
        telefono,
        contacto,
      });

      if (!proveedorActualizado) {
        return res.status(404).json({
          code: 1,
          message: 'Proveedor no encontrado para actualizar',
        });
      }

      res.json({
        code: 0,
        message: 'Proveedor actualizado correctamente',
        data: proveedorActualizado,
      });
    } catch (error: any) {
      res.status(500).json({
        code: 1,
        message: 'Error al actualizar proveedor: ' + error.message,
      });
    }
  },

  async delete(req: Request, res: Response) {
    try {
      const { nombre } = req.body;

      if (!nombre) {
        return res.status(400).json({
          code: 1,
          message: 'El campo nombre es obligatorio en el body',
        });
      }

      if (!validarNombre(nombre)) {
        return res.status(400).json({
          code: 1,
          message: 'El nombre debe tener entre 1 y 100 caracteres',
        });
      }

      const eliminado = await proveedorModel.delete(nombre);

      if (!eliminado) {
        return res.status(404).json({
          code: 1,
          message: 'Proveedor no encontrado para eliminar',
        });
      }

      res.json({
        code: 0,
        message: 'Proveedor eliminado correctamente',
      });
    } catch (error: any) {
      res.status(500).json({
        code: 1,
        message: 'Error al eliminar proveedor: ' + error.message,
      });
    }
  },
};
