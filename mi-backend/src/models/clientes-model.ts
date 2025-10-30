// src/models/clientes-model.ts
import { Pool } from 'pg';

export interface Cliente {
  id_cliente: number;
  id_user: number;
  nombre: string;
  telefono?: string;
  contacto?: string;
}

export class ClienteModel {
  private pool: Pool;

  constructor(pool: Pool) {
    this.pool = pool;
  }

  async findAll(): Promise<Cliente[]> {
    try {
      const result = await this.pool.query('SELECT * FROM clientes ORDER BY nombre ASC');

      if (!result.rows || result.rows.length === 0) {
        throw new Error('No se encontraron clientes en la base de datos');
      }

      return result.rows;
    } catch (error: any) {
      throw new Error(`Error al obtener todos los clientes: ${error.message}`);
    }
  }

  async findByNombre(nombre: string): Promise<Cliente[] | null> {
    try {
      if (!nombre || nombre.trim().length === 0) {
        throw new Error('El nombre no puede estar vacío');
      }

      if (nombre.length > 100) {
        throw new Error('El nombre no puede tener más de 100 caracteres');
      }

      const result = await this.pool.query('SELECT * FROM clientes WHERE nombre ILIKE $1', [
        nombre,
      ]);

      // Si no hay coincidencias, devuelve todos los registros
      if (result.rows.length === 0) {
        const all = await this.pool.query('SELECT * FROM clientes');

        if (!all.rows || all.rows.length === 0) {
          throw new Error('No hay clientes registrados en el sistema');
        }

        return all.rows;
      }

      return result.rows;
    } catch (error: any) {
      throw new Error(`Error al buscar cliente por nombre: ${error.message}`);
    }
  }

  async create(cliente: Omit<Cliente, 'id_cliente'>): Promise<Cliente> {
    try {
      const { id_user, nombre, telefono, contacto } = cliente;

      if (!id_user || id_user <= 0) {
        throw new Error('El ID de usuario es obligatorio y debe ser mayor a 0');
      }

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
        'INSERT INTO clientes (id_user, nombre, telefono, contacto) VALUES ($1, $2, $3, $4) RETURNING *',
        [id_user, nombre.trim(), telefono, contacto]
      );

      if (!result.rows || result.rows.length === 0) {
        throw new Error('No se pudo crear el cliente en la base de datos');
      }

      return result.rows[0];
    } catch (error: any) {
      throw new Error(`Error al crear cliente: ${error.message}`);
    }
  }

  async update(
    nombre: string,
    cliente: Partial<Omit<Cliente, 'id_cliente'>>
  ): Promise<Cliente | null> {
    try {
      if (!nombre || nombre.trim().length === 0) {
        throw new Error('El nombre es obligatorio para la actualización');
      }

      if (nombre.length > 100) {
        throw new Error('El nombre no puede tener más de 100 caracteres');
      }

      const { telefono, contacto } = cliente;

      if (telefono && telefono.length > 20) {
        throw new Error('El teléfono no puede tener más de 20 caracteres');
      }

      if (contacto && contacto.length > 100) {
        throw new Error('El contacto no puede tener más de 100 caracteres');
      }

      const result = await this.pool.query(
        'UPDATE clientes SET telefono = COALESCE($1, telefono), contacto = COALESCE($2, contacto) WHERE nombre = $3 RETURNING *',
        [telefono, contacto, nombre]
      );

      if (!result.rows || result.rows.length === 0) {
        throw new Error('No se encontró el cliente para actualizar');
      }

      return result.rows[0] || null;
    } catch (error: any) {
      throw new Error(`Error al actualizar cliente: ${error.message}`);
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

      const result = await this.pool.query('DELETE FROM clientes WHERE nombre = $1', [nombre]);

      if ((result.rowCount ?? 0) === 0) {
        throw new Error('No se encontró el cliente para eliminar');
      }

      return (result.rowCount ?? 0) > 0;
    } catch (error: any) {
      throw new Error(`Error al eliminar cliente: ${error.message}`);
    }
  }

  async findByUserId(id_user: number): Promise<Cliente[]> {
    try {
      if (!id_user || id_user <= 0) {
        throw new Error('El ID de usuario es obligatorio y debe ser mayor a 0');
      }

      const result = await this.pool.query(
        'SELECT * FROM clientes WHERE id_user = $1 ORDER BY nombre ASC',
        [id_user]
      );

      if (!result.rows || result.rows.length === 0) {
        throw new Error('No se encontraron clientes para este usuario');
      }

      return result.rows;
    } catch (error: any) {
      throw new Error(`Error al buscar clientes por ID de usuario: ${error.message}`);
    }
  }
}
