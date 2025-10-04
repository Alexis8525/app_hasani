import { Pool } from 'pg';

export interface Bitacora {
  id_movimiento: number;
  id_proveedor: number;
  cantidad: number;
  id_producto: number;
}

export class BitacoraModel {
  private pool: Pool;

  constructor(pool: Pool) {
    this.pool = pool;
  }

  async findAll(): Promise<Bitacora[]> {
    const result = await this.pool.query(`
      SELECT b.*, m.tipo, m.fecha, p.nombre as producto_nombre, pr.nombre as proveedor_nombre
      FROM bitacora b
      JOIN movimientos m ON b.id_movimiento = m.id_movimiento
      JOIN productos p ON b.id_producto = p.id_producto
      JOIN proveedores pr ON b.id_proveedor = pr.id_proveedor
      ORDER BY m.fecha DESC
    `);
    return result.rows;
  }

  async create(bitacora: Bitacora): Promise<Bitacora> {
    const { id_movimiento, id_proveedor, cantidad, id_producto } = bitacora;
    const result = await this.pool.query(
      'INSERT INTO bitacora (id_movimiento, id_proveedor, cantidad, id_producto) VALUES ($1, $2, $3, $4) RETURNING *',
      [id_movimiento, id_proveedor, cantidad, id_producto]
    );
    return result.rows[0];
  }

  async findByMovimiento(id_movimiento: number): Promise<Bitacora[]> {
    const result = await this.pool.query(`
      SELECT b.*, p.nombre as producto_nombre, pr.nombre as proveedor_nombre
      FROM bitacora b
      JOIN productos p ON b.id_producto = p.id_producto
      JOIN proveedores pr ON b.id_proveedor = pr.id_proveedor
      WHERE b.id_movimiento = $1
    `, [id_movimiento]);
    return result.rows;
  }

  async findByProveedor(id_proveedor: number): Promise<Bitacora[]> {
    const result = await this.pool.query(`
      SELECT b.*, m.tipo, m.fecha, p.nombre as producto_nombre
      FROM bitacora b
      JOIN movimientos m ON b.id_movimiento = m.id_movimiento
      JOIN productos p ON b.id_producto = p.id_producto
      WHERE b.id_proveedor = $1
      ORDER BY m.fecha DESC
    `, [id_proveedor]);
    return result.rows;
  }
}