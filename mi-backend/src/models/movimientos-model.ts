import { Pool } from 'pg';

export interface Movimiento {
  id_movimiento: number;
  fecha: Date;
  tipo: 'Entrada' | 'Salida';
  id_producto: number;
  cantidad: number;
  referencia?: string;
  responsable: number;
  id_cliente?: number;
  created_at: Date;
}

export class MovimientoModel {
  private pool: Pool;

  constructor(pool: Pool) {
    this.pool = pool;
  }

  async findAll(): Promise<Movimiento[]> {
    const result = await this.pool.query(`
      SELECT m.*, p.nombre as producto_nombre, u.username as responsable_nombre, c.nombre as cliente_nombre
      FROM movimientos m
      JOIN productos p ON m.id_producto = p.id_producto
      JOIN users u ON m.responsable = u.id
      LEFT JOIN clientes c ON m.id_cliente = c.id_cliente
      ORDER BY m.fecha DESC
    `);
    return result.rows;
  }

  async findById(id: number): Promise<Movimiento | null> {
    const result = await this.pool.query(`
      SELECT m.*, p.nombre as producto_nombre, u.username as responsable_nombre, c.nombre as cliente_nombre
      FROM movimientos m
      JOIN productos p ON m.id_producto = p.id_producto
      JOIN users u ON m.responsable = u.id
      LEFT JOIN clientes c ON m.id_cliente = c.id_cliente
      WHERE m.id_movimiento = $1
    `, [id]);
    return result.rows[0] || null;
  }

  async create(movimiento: Omit<Movimiento, 'id_movimiento' | 'fecha' | 'created_at'>): Promise<Movimiento> {
    const { tipo, id_producto, cantidad, referencia, responsable, id_cliente } = movimiento;
    const result = await this.pool.query(
      `INSERT INTO movimientos (tipo, id_producto, cantidad, referencia, responsable, id_cliente) 
       VALUES ($1, $2, $3, $4, $5, $6) RETURNING *`,
      [tipo, id_producto, cantidad, referencia, responsable, id_cliente]
    );
    return result.rows[0];
  }

  async findByProducto(id_producto: number): Promise<Movimiento[]> {
    const result = await this.pool.query(`
      SELECT m.*, p.nombre as producto_nombre, u.username as responsable_nombre, c.nombre as cliente_nombre
      FROM movimientos m
      JOIN productos p ON m.id_producto = p.id_producto
      JOIN users u ON m.responsable = u.id
      LEFT JOIN clientes c ON m.id_cliente = c.id_cliente
      WHERE m.id_producto = $1
      ORDER BY m.fecha DESC
    `, [id_producto]);
    return result.rows;
  }

  async findByDateRange(fechaInicio: Date, fechaFin: Date): Promise<Movimiento[]> {
    const result = await this.pool.query(`
      SELECT m.*, p.nombre as producto_nombre, u.username as responsable_nombre, c.nombre as cliente_nombre
      FROM movimientos m
      JOIN productos p ON m.id_producto = p.id_producto
      JOIN users u ON m.responsable = u.id
      LEFT JOIN clientes c ON m.id_cliente = c.id_cliente
      WHERE m.fecha BETWEEN $1 AND $2
      ORDER BY m.fecha DESC
    `, [fechaInicio, fechaFin]);
    return result.rows;
  }
}