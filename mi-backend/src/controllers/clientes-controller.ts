// src/controllers/clientes-controller.ts
import { Request, Response } from 'express';
import { ClienteModel } from '../models/clientes-model';
import { pool } from '../config/db';

const clienteModel = new ClienteModel(pool);

const validarTelefono = (telefono?: string): boolean => {
  return !telefono || /^\d{10}$/.test(telefono);
};

export const ClienteController = {
  async getAll(req: Request, res: Response) {
    try {
      const clientes = await clienteModel.findAll();
      res.json({ code: 0, message: 'Clientes obtenidos correctamente', data: clientes });
    } catch (error: any) {
      res.status(500).json({ code: 1, message: 'Error al obtener clientes: ' + error.message });
    }
  },

  async getByNombre(req: Request, res: Response) {
    try {
      // Cambiar de params a body
      const { nombre } = req.body; // En lugar de req.params.nombre
      
      if (!nombre) {
        return res.status(400).json({ code: 1, message: 'El campo nombre es obligatorio en el body' });
      }

      const cliente = await clienteModel.findByNombre(nombre);
      if (!cliente) return res.status(404).json({ code: 1, message: 'Cliente no encontrado' });
      res.json({ code: 0, message: 'Cliente obtenido correctamente', data: cliente });
    } catch (error: any) {
      res.status(500).json({ code: 1, message: 'Error al obtener cliente: ' + error.message });
    }
  },


  async create(req: Request, res: Response) {
    try {
      const { id_user, nombre, telefono, contacto } = req.body;

      if (!id_user || !nombre) {
        return res.status(400).json({ code: 1, message: 'Los campos id_user y nombre son obligatorios' });
      }

      if (!validarTelefono(telefono)) {
        return res.status(400).json({ code: 1, message: 'El teléfono debe tener 10 dígitos' });
      }

      const nuevoCliente = await clienteModel.create({ id_user, nombre, telefono, contacto });
      res.status(201).json({ code: 0, message: 'Cliente creado correctamente', data: nuevoCliente });
    } catch (error: any) {
      res.status(500).json({ code: 1, message: 'Error al crear cliente: ' + error.message });
    }
  },

  async update(req: Request, res: Response) {
    try {
      // Cambiar de params a body
      const { nombre } = req.body; // En lugar de req.params.nombre
      const { telefono, contacto } = req.body;

      if (!nombre) {
        return res.status(400).json({ code: 1, message: 'El campo nombre es obligatorio en el body' });
      }

      if (!validarTelefono(telefono)) {
        return res.status(400).json({ code: 1, message: 'El teléfono debe tener 10 dígitos' });
      }

      const clienteActualizado = await clienteModel.update(nombre, { telefono, contacto });
      if (!clienteActualizado) return res.status(404).json({ code: 1, message: 'Cliente no encontrado' });

      res.json({ code: 0, message: 'Cliente actualizado correctamente', data: clienteActualizado });
    } catch (error: any) {
      res.status(500).json({ code: 1, message: 'Error al actualizar cliente: ' + error.message });
    }
  },

  async delete(req: Request, res: Response) {
    try {
      // Cambiar de params a body
      const { nombre } = req.body; // En lugar de req.params.nombre
      
      if (!nombre) {
        return res.status(400).json({ code: 1, message: 'El campo nombre es obligatorio en el body' });
      }

      const eliminado = await clienteModel.delete(nombre);
      if (!eliminado) return res.status(404).json({ code: 1, message: 'Cliente no encontrado' });

      res.json({ code: 0, message: 'Cliente eliminado correctamente' });
    } catch (error: any) {
      res.status(500).json({ code: 1, message: 'Error al eliminar cliente: ' + error.message });
    }
  },


  async getByUser(req: Request, res: Response) {
    try {
      // Cambiar de params a body
      const { userId } = req.body; // En lugar de req.params.userId
      
      if (!userId) {
        return res.status(400).json({ code: 1, message: 'El campo userId es obligatorio en el body' });
      }

      const id_user = parseInt(userId);
      const clientes = await clienteModel.findByUserId(id_user);
      res.json({ code: 0, message: 'Clientes obtenidos correctamente', data: clientes });
    } catch (error: any) {
      res.status(500).json({ code: 1, message: 'Error al obtener clientes: ' + error.message });
    }
  }
};

