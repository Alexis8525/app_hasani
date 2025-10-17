// src/models/productos-model.ts
import { Pool } from 'pg';

export interface Producto {
  id_producto: number;
  codigo: string;
  nombre: string;
  descripcion?: string;
  categoria?: string;
  unidad: string;
  stock_minimo: number;
  stock_actual: number;
  created_at: Date;
  updated_at: Date;
  id_proveedor?: number;
}

export class ProductoModel {
  private pool: Pool;

  constructor(pool: Pool) {
    this.pool = pool;
  }

  async findAll(): Promise<Producto[]> {
    const result = await this.pool.query(`
      SELECT p.*, pr.nombre as nombre_proveedor 
      FROM productos p 
      LEFT JOIN proveedores pr ON p.id_proveedor = pr.id_proveedor 
      ORDER BY p.nombre ASC
    `);
    return result.rows;
  }

  async findByNombre(nombre: string): Promise<Producto | null> {
    const result = await this.pool.query(`
      SELECT p.*, pr.nombre as nombre_proveedor 
      FROM productos p 
      LEFT JOIN proveedores pr ON p.id_proveedor = pr.id_proveedor 
      WHERE p.nombre = $1
    `, [nombre]);
    return result.rows[0] || null;
  }

  async create(producto: Omit<Producto, 'id_producto' | 'created_at' | 'updated_at'>): Promise<Producto> {
    const { codigo, nombre, descripcion, categoria, unidad, stock_minimo, stock_actual, id_proveedor } = producto;
    const result = await this.pool.query(
      `INSERT INTO productos (codigo, nombre, descripcion, categoria, unidad, stock_minimo, stock_actual, id_proveedor) 
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8) RETURNING *`,
      [codigo, nombre, descripcion, categoria, unidad, stock_minimo, stock_actual, id_proveedor]
    );
    return result.rows[0];
  }

  async update(nombre: string, producto: Partial<Omit<Producto, 'id_producto' | 'created_at' | 'updated_at'>>): Promise<Producto | null> {
    const { codigo, descripcion, categoria, unidad, stock_minimo, stock_actual, id_proveedor } = producto;
    const result = await this.pool.query(
      `UPDATE productos SET 
        codigo = COALESCE($1, codigo),
        descripcion = COALESCE($2, descripcion),
        categoria = COALESCE($3, categoria),
        unidad = COALESCE($4, unidad),
        stock_minimo = COALESCE($5, stock_minimo),
        stock_actual = COALESCE($6, stock_actual),
        id_proveedor = COALESCE($7, id_proveedor),
        updated_at = NOW()
       WHERE nombre = $8 RETURNING *`,
      [codigo, descripcion, categoria, unidad, stock_minimo, stock_actual, id_proveedor, nombre]
    );
    return result.rows[0] || null;
  }

  async delete(nombre: string): Promise<boolean> {
    const result = await this.pool.query('DELETE FROM productos WHERE nombre = $1', [nombre]);
    return (result.rowCount ?? 0) > 0;
  }

  async updateStock(nombre: string, cantidad: number): Promise<Producto | null> {
    const result = await this.pool.query(
      'UPDATE productos SET stock_actual = $1, updated_at = NOW() WHERE nombre = $2 RETURNING *',
      [cantidad, nombre]
    );
    return result.rows[0] || null;
  }

  async findLowStock(): Promise<Producto[]> {
    const result = await this.pool.query(`
      SELECT p.*, pr.nombre as nombre_proveedor 
      FROM productos p 
      LEFT JOIN proveedores pr ON p.id_proveedor = pr.id_proveedor 
      WHERE p.stock_actual <= p.stock_minimo
      ORDER BY p.stock_actual ASC
    `);
    return result.rows;
  }
}
