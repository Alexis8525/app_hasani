// src/controllers/clientes-controller.ts
import { Request, Response } from 'express';
import { ClienteModel } from '../models/clientes-model';
import { pool } from '../config/db';

const clienteModel = new ClienteModel(pool);

const validarTelefono = (telefono?: string): boolean => {
  return !telefono || /^\d{10}$/.test(telefono);
};

const validarNombre = (nombre: string): boolean => {
  return (
    nombre !== undefined && nombre !== null && nombre.trim().length > 0 && nombre.length <= 100
  );
};

const validarUserId = (userId: any): boolean => {
  return userId && !isNaN(parseInt(userId)) && parseInt(userId) > 0;
};

export const ClienteController = {
  async getAll(req: Request, res: Response) {
    try {
      const clientes = await clienteModel.findAll();
      res.json({
        code: 0,
        message: 'Clientes obtenidos correctamente',
        data: clientes,
      });
    } catch (error: any) {
      res.status(500).json({
        code: 1,
        message: 'Error al obtener clientes: ' + error.message,
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

      const cliente = await clienteModel.findByNombre(nombre);

      if (!cliente) {
        return res.status(404).json({
          code: 1,
          message: 'Cliente no encontrado',
        });
      }

      res.json({
        code: 0,
        message: 'Cliente obtenido correctamente',
        data: cliente,
      });
    } catch (error: any) {
      res.status(500).json({
        code: 1,
        message: 'Error al obtener cliente: ' + error.message,
      });
    }
  },

  async create(req: Request, res: Response) {
    try {
      const { id_user, nombre, telefono, contacto } = req.body;

      if (!id_user) {
        return res.status(400).json({
          code: 1,
          message: 'El campo id_user es obligatorio',
        });
      }

      if (!nombre) {
        return res.status(400).json({
          code: 1,
          message: 'El campo nombre es obligatorio',
        });
      }

      if (!validarUserId(id_user)) {
        return res.status(400).json({
          code: 1,
          message: 'El ID de usuario debe ser un número mayor a 0',
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

      const nuevoCliente = await clienteModel.create({
        id_user,
        nombre,
        telefono,
        contacto,
      });

      res.status(201).json({
        code: 0,
        message: 'Cliente creado correctamente',
        data: nuevoCliente,
      });
    } catch (error: any) {
      res.status(500).json({
        code: 1,
        message: 'Error al crear cliente: ' + error.message,
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

      const clienteActualizado = await clienteModel.update(nombre, { telefono, contacto });

      if (!clienteActualizado) {
        return res.status(404).json({
          code: 1,
          message: 'Cliente no encontrado para actualizar',
        });
      }

      res.json({
        code: 0,
        message: 'Cliente actualizado correctamente',
        data: clienteActualizado,
      });
    } catch (error: any) {
      res.status(500).json({
        code: 1,
        message: 'Error al actualizar cliente: ' + error.message,
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

      const eliminado = await clienteModel.delete(nombre);

      if (!eliminado) {
        return res.status(404).json({
          code: 1,
          message: 'Cliente no encontrado para eliminar',
        });
      }

      res.json({
        code: 0,
        message: 'Cliente eliminado correctamente',
      });
    } catch (error: any) {
      res.status(500).json({
        code: 1,
        message: 'Error al eliminar cliente: ' + error.message,
      });
    }
  },

  async getByUser(req: Request, res: Response) {
    try {
      const { userId } = req.body;

      if (!userId) {
        return res.status(400).json({
          code: 1,
          message: 'El campo userId es obligatorio en el body',
        });
      }

      if (!validarUserId(userId)) {
        return res.status(400).json({
          code: 1,
          message: 'El userId debe ser un número mayor a 0',
        });
      }

      const id_user = parseInt(userId);
      const clientes = await clienteModel.findByUserId(id_user);

      res.json({
        code: 0,
        message: 'Clientes obtenidos correctamente',
        data: clientes,
      });
    } catch (error: any) {
      res.status(500).json({
        code: 1,
        message: 'Error al obtener clientes: ' + error.message,
      });
    }
  },
};
