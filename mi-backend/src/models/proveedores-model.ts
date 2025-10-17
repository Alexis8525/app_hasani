// src/models/proveedores-model.ts
import { Pool } from 'pg';

export interface Proveedor {
  id_proveedor: number;
  nombre: string;
  telefono?: string;
  contacto?: string;
}

export class ProveedorModel {
  private pool: Pool;

  constructor(pool: Pool) {
    this.pool = pool;
  }

  async findAll(): Promise<Proveedor[]> {
    try {
      const result = await this.pool.query('SELECT * FROM proveedores ORDER BY nombre ASC');
      
      if (!result.rows || result.rows.length === 0) {
        throw new Error('No se encontraron proveedores en la base de datos');
      }
      
      return result.rows;
    } catch (error: any) {
      throw new Error(`Error al obtener todos los proveedores: ${error.message}`);
    }
  }

  async findByNombre(nombre: string): Promise<Proveedor[] | null> {
    try {
      if (!nombre || nombre.trim().length === 0) {
        throw new Error('El nombre no puede estar vacío');
      }

      if (nombre.length > 100) {
        throw new Error('El nombre no puede tener más de 100 caracteres');
      }

      const result = await this.pool.query(
        'SELECT * FROM proveedores WHERE nombre ILIKE $1',
        [nombre]
      );
  
      if (result.rows.length === 0) {
        const all = await this.pool.query('SELECT * FROM proveedores');
        
        if (!all.rows || all.rows.length === 0) {
          throw new Error('No hay proveedores registrados en el sistema');
        }
        
        return all.rows;
      }
  
      return result.rows;
    } catch (error: any) {
      throw new Error(`Error al buscar proveedor por nombre: ${error.message}`);
    }
  }

  async create(proveedor: Omit<Proveedor, 'id_proveedor'>): Promise<Proveedor> {
    try {
      const { nombre, telefono, contacto } = proveedor;

      if (!nombre || nombre.trim().length === 0) {
        throw new Error('El nombre es obligatorio');
      }

      if (nombre.length > 100) {
        throw new Error('El nombre no puede tener más de 100 caracteres');
      }

      if (telefono && telefono.length > 20) {
        throw new Error('El teléfono no puede tener más de 20 caracteres');
      }

      if (contacto && contacto.length > 100) {
        throw new Error('El contacto no puede tener más de 100 caracteres');
      }

      const result = await this.pool.query(
        'INSERT INTO proveedores (nombre, telefono, contacto) VALUES ($1,$2,$3) RETURNING *',
        [nombre.trim(), telefono, contacto]
      );

      if (!result.rows || result.rows.length === 0) {
        throw new Error('No se pudo crear el proveedor en la base de datos');
      }

      return result.rows[0];
    } catch (error: any) {
      throw new Error(`Error al crear proveedor: ${error.message}`);
    }
  }

  async update(nombre: string, proveedor: Partial<Omit<Proveedor, 'id_proveedor'>>): Promise<Proveedor | null> {
    try {
      if (!nombre || nombre.trim().length === 0) {
        throw new Error('El nombre es obligatorio para la actualización');
      }

      if (nombre.length > 100) {
        throw new Error('El nombre no puede tener más de 100 caracteres');
      }

      const { telefono, contacto } = proveedor;

      if (telefono && telefono.length > 20) {
        throw new Error('El teléfono no puede tener más de 20 caracteres');
      }

      if (contacto && contacto.length > 100) {
        throw new Error('El contacto no puede tener más de 100 caracteres');
      }

      const result = await this.pool.query(
        'UPDATE proveedores SET telefono = COALESCE($1, telefono), contacto = COALESCE($2, contacto) WHERE nombre = $3 RETURNING *',
        [telefono, contacto, nombre]
      );

      if (!result.rows || result.rows.length === 0) {
        throw new Error('No se encontró el proveedor para actualizar');
      }

      return result.rows[0] || null;
    } catch (error: any) {
      throw new Error(`Error al actualizar proveedor: ${error.message}`);
    }
  }

  async delete(nombre: string): Promise<boolean> {
    try {
      if (!nombre || nombre.trim().length === 0) {
        throw new Error('El nombre es obligatorio para eliminar');
      }

      if (nombre.length > 100) {
        throw new Error('El nombre no puede tener más de 100 caracteres');
      }

      const result = await this.pool.query('DELETE FROM proveedores WHERE nombre = $1', [nombre]);
      
      if ((result.rowCount ?? 0) === 0) {
        throw new Error('No se encontró el proveedor para eliminar');
      }
      
      return (result.rowCount ?? 0) > 0;
    } catch (error: any) {
      throw new Error(`Error al eliminar proveedor: ${error.message}`);
    }
  }
}
