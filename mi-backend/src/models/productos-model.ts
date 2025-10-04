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
      ORDER BY p.id_producto DESC
    `);
    return result.rows;
  }

  async findById(id: number): Promise<Producto | null> {
    const result = await this.pool.query(`
      SELECT p.*, pr.nombre as nombre_proveedor 
      FROM productos p 
      LEFT JOIN proveedores pr ON p.id_proveedor = pr.id_proveedor 
      WHERE p.id_producto = $1
    `, [id]);
    return result.rows[0] || null;
  }

  async findByCodigo(codigo: string): Promise<Producto | null> {
    const result = await this.pool.query('SELECT * FROM productos WHERE codigo = $1', [codigo]);
    return result.rows[0] || null;
  }

  async create(producto: Omit<Producto, 'id_producto' | 'created_at' | 'updated_at'>): Promise<Producto> {
    const { codigo, nombre, descripcion, categoria, unidad, stock_minimo, stock_actual, id_proveedor } = producto;
    const result = await this.pool.query(
      `INSERT INTO productos (codigo, nombre, descripcion, categoria, unidad, stock_minimo, stock_actual, id_proveedor) 
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING *`,
      [codigo, nombre, descripcion, categoria, unidad, stock_minimo, stock_actual, id_proveedor]
    );
    return result.rows[0];
  }

  async update(id: number, producto: Partial<Omit<Producto, 'id_producto' | 'created_at' | 'updated_at'>>): Promise<Producto | null> {
    const { codigo, nombre, descripcion, categoria, unidad, stock_minimo, stock_actual, id_proveedor } = producto;
    const result = await this.pool.query(
      `UPDATE productos SET 
        codigo = COALESCE($1, codigo), 
        nombre = COALESCE($2, nombre), 
        descripcion = COALESCE($3, descripcion), 
        categoria = COALESCE($4, categoria), 
        unidad = COALESCE($5, unidad), 
        stock_minimo = COALESCE($6, stock_minimo), 
        stock_actual = COALESCE($7, stock_actual), 
        id_proveedor = COALESCE($8, id_proveedor),
        updated_at = NOW()
       WHERE id_producto = $9 RETURNING *`,
      [codigo, nombre, descripcion, categoria, unidad, stock_minimo, stock_actual, id_proveedor, id]
    );
    return result.rows[0] || null;
  }

  async delete(id: number): Promise<boolean> {
    const result = await this.pool.query('DELETE FROM productos WHERE id_producto = $1', [id]);
    return (result.rowCount ?? 0) > 0;
  }
  

  async updateStock(id: number, cantidad: number): Promise<Producto | null> {
    const result = await this.pool.query(
      'UPDATE productos SET stock_actual = $1, updated_at = NOW() WHERE id_producto = $2 RETURNING *',
      [cantidad, id]
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