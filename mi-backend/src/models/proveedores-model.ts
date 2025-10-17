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
    const result = await this.pool.query('SELECT * FROM proveedores ORDER BY nombre ASC');
    return result.rows;
  }

  async findByNombre(nombre: string): Promise<Proveedor | null> {
    const result = await this.pool.query('SELECT * FROM proveedores WHERE nombre = $1', [nombre]);
    return result.rows[0] || null;
  }

  async create(proveedor: Omit<Proveedor, 'id_proveedor'>): Promise<Proveedor> {
    const { nombre, telefono, contacto } = proveedor;
    const result = await this.pool.query(
      'INSERT INTO proveedores (nombre, telefono, contacto) VALUES ($1,$2,$3) RETURNING *',
      [nombre, telefono, contacto]
    );
    return result.rows[0];
  }

  async update(nombre: string, proveedor: Partial<Omit<Proveedor, 'id_proveedor'>>): Promise<Proveedor | null> {
    const { telefono, contacto } = proveedor;
    const result = await this.pool.query(
      'UPDATE proveedores SET telefono = COALESCE($1, telefono), contacto = COALESCE($2, contacto) WHERE nombre = $3 RETURNING *',
      [telefono, contacto, nombre]
    );
    return result.rows[0] || null;
  }

  async delete(nombre: string): Promise<boolean> {
    const result = await this.pool.query('DELETE FROM proveedores WHERE nombre = $1', [nombre]);
    return (result.rowCount ?? 0) > 0;
  }
}
