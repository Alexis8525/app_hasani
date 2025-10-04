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
    const result = await this.pool.query('SELECT * FROM proveedores ORDER BY id_proveedor DESC');
    return result.rows;
  }

  async findById(id: number): Promise<Proveedor | null> {
    const result = await this.pool.query('SELECT * FROM proveedores WHERE id_proveedor = $1', [id]);
    return result.rows[0] || null;
  }

  async create(proveedor: Omit<Proveedor, 'id_proveedor'>): Promise<Proveedor> {
    const { nombre, telefono, contacto } = proveedor;
    const result = await this.pool.query(
      'INSERT INTO proveedores (nombre, telefono, contacto) VALUES ($1, $2, $3) RETURNING *',
      [nombre, telefono, contacto]
    );
    return result.rows[0];
  }

  async update(id: number, proveedor: Partial<Omit<Proveedor, 'id_proveedor'>>): Promise<Proveedor | null> {
    const { nombre, telefono, contacto } = proveedor;
    const result = await this.pool.query(
      'UPDATE proveedores SET nombre = COALESCE($1, nombre), telefono = COALESCE($2, telefono), contacto = COALESCE($3, contacto) WHERE id_proveedor = $4 RETURNING *',
      [nombre, telefono, contacto, id]
    );
    return result.rows[0] || null;
  }

  async delete(id: number): Promise<boolean> {
    const result = await this.pool.query('DELETE FROM proveedores WHERE id_proveedor = $1', [id]);
    return (result.rowCount ?? 0) > 0;
  }
  
}