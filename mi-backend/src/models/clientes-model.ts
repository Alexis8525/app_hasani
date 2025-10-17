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
    const result = await this.pool.query('SELECT * FROM clientes ORDER BY nombre ASC');
    return result.rows;
  }

  async findByNombre(nombre: string): Promise<Cliente | null> {
    const result = await this.pool.query('SELECT * FROM clientes WHERE nombre = $1', [nombre]);
    return result.rows[0] || null;
  }

  async create(cliente: Omit<Cliente, 'id_cliente'>): Promise<Cliente> {
    const { id_user, nombre, telefono, contacto } = cliente;
    const result = await this.pool.query(
      'INSERT INTO clientes (id_user, nombre, telefono, contacto) VALUES ($1, $2, $3, $4) RETURNING *',
      [id_user, nombre, telefono, contacto]
    );
    return result.rows[0];
  }

  async update(nombre: string, cliente: Partial<Omit<Cliente, 'id_cliente'>>): Promise<Cliente | null> {
    const { telefono, contacto } = cliente;
    const result = await this.pool.query(
      'UPDATE clientes SET telefono = COALESCE($1, telefono), contacto = COALESCE($2, contacto) WHERE nombre = $3 RETURNING *',
      [telefono, contacto, nombre]
    );
    return result.rows[0] || null;
  }

  async delete(nombre: string): Promise<boolean> {
    const result = await this.pool.query('DELETE FROM clientes WHERE nombre = $1', [nombre]);
    return (result.rowCount ?? 0) > 0;
  }

  async findByUserId(id_user: number): Promise<Cliente[]> {
    const result = await this.pool.query('SELECT * FROM clientes WHERE id_user = $1 ORDER BY nombre ASC', [id_user]);
    return result.rows;
  }
}
