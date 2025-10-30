// src/models/bitacora-model.ts
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
    try {
      const result = await this.pool.query(`
        SELECT b.*, m.tipo, m.fecha, p.nombre as producto_nombre, pr.nombre as proveedor_nombre
        FROM bitacora b
        JOIN movimientos m ON b.id_movimiento = m.id_movimiento
        JOIN productos p ON b.id_producto = p.id_producto
        JOIN proveedores pr ON b.id_proveedor = pr.id_proveedor
        ORDER BY m.fecha DESC
      `);

      if (!result.rows || result.rows.length === 0) {
        throw new Error('No se encontraron registros en la bitácora');
      }

      return result.rows;
    } catch (error: any) {
      throw new Error(`Error al obtener todos los registros de bitácora: ${error.message}`);
    }
  }

  async create(bitacora: Bitacora): Promise<Bitacora> {
    try {
      const { id_movimiento, id_proveedor, cantidad, id_producto } = bitacora;

      // Validaciones de campos obligatorios
      if (!id_movimiento || id_movimiento <= 0) {
        throw new Error('El ID del movimiento es obligatorio y debe ser mayor a 0');
      }

      if (!id_proveedor || id_proveedor <= 0) {
        throw new Error('El ID del proveedor es obligatorio y debe ser mayor a 0');
      }

      if (!cantidad) {
        throw new Error('La cantidad es obligatoria');
      }

      if (!id_producto || id_producto <= 0) {
        throw new Error('El ID del producto es obligatorio y debe ser mayor a 0');
      }

      // Validaciones de rangos y formatos
      if (cantidad <= 0) {
        throw new Error('La cantidad debe ser mayor a 0');
      }

      if (cantidad > 1000000) {
        throw new Error('La cantidad no puede ser mayor a 1,000,000');
      }

      // Verificar si el movimiento existe
      const movimientoExiste = await this.pool.query(
        'SELECT 1 FROM movimientos WHERE id_movimiento = $1',
        [id_movimiento]
      );

      if (movimientoExiste.rows.length === 0) {
        throw new Error('El movimiento especificado no existe');
      }

      // Verificar si el proveedor existe
      const proveedorExiste = await this.pool.query(
        'SELECT 1 FROM proveedores WHERE id_proveedor = $1',
        [id_proveedor]
      );

      if (proveedorExiste.rows.length === 0) {
        throw new Error('El proveedor especificado no existe');
      }

      // Verificar si el producto existe
      const productoExiste = await this.pool.query(
        'SELECT 1 FROM productos WHERE id_producto = $1',
        [id_producto]
      );

      if (productoExiste.rows.length === 0) {
        throw new Error('El producto especificado no existe');
      }

      const result = await this.pool.query(
        'INSERT INTO bitacora (id_movimiento, id_proveedor, cantidad, id_producto) VALUES ($1, $2, $3, $4) RETURNING *',
        [id_movimiento, id_proveedor, cantidad, id_producto]
      );

      if (!result.rows || result.rows.length === 0) {
        throw new Error('No se pudo crear el registro en la bitácora');
      }

      return result.rows[0];
    } catch (error: any) {
      throw new Error(`Error al crear registro de bitácora: ${error.message}`);
    }
  }

  async findByMovimiento(id_movimiento: number): Promise<Bitacora[]> {
    try {
      if (!id_movimiento || id_movimiento <= 0) {
        throw new Error('El ID del movimiento es obligatorio y debe ser mayor a 0');
      }

      // Verificar si el movimiento existe
      const movimientoExiste = await this.pool.query(
        'SELECT 1 FROM movimientos WHERE id_movimiento = $1',
        [id_movimiento]
      );

      if (movimientoExiste.rows.length === 0) {
        throw new Error('El movimiento especificado no existe');
      }

      const result = await this.pool.query(
        `
        SELECT b.*, p.nombre as producto_nombre, pr.nombre as proveedor_nombre
        FROM bitacora b
        JOIN productos p ON b.id_producto = p.id_producto
        JOIN proveedores pr ON b.id_proveedor = pr.id_proveedor
        WHERE b.id_movimiento = $1
      `,
        [id_movimiento]
      );

      if (!result.rows) {
        throw new Error('Error al consultar registros de bitácora por movimiento');
      }

      if (result.rows.length === 0) {
        throw new Error('No se encontraron registros de bitácora para este movimiento');
      }

      return result.rows;
    } catch (error: any) {
      throw new Error(`Error al buscar registros de bitácora por movimiento: ${error.message}`);
    }
  }

  async findByProveedor(id_proveedor: number): Promise<Bitacora[]> {
    try {
      if (!id_proveedor || id_proveedor <= 0) {
        throw new Error('El ID del proveedor es obligatorio y debe ser mayor a 0');
      }

      // Verificar si el proveedor existe
      const proveedorExiste = await this.pool.query(
        'SELECT 1 FROM proveedores WHERE id_proveedor = $1',
        [id_proveedor]
      );

      if (proveedorExiste.rows.length === 0) {
        throw new Error('El proveedor especificado no existe');
      }

      const result = await this.pool.query(
        `
        SELECT b.*, m.tipo, m.fecha, p.nombre as producto_nombre
        FROM bitacora b
        JOIN movimientos m ON b.id_movimiento = m.id_movimiento
        JOIN productos p ON b.id_producto = p.id_producto
        WHERE b.id_proveedor = $1
        ORDER BY m.fecha DESC
      `,
        [id_proveedor]
      );

      if (!result.rows) {
        throw new Error('Error al consultar registros de bitácora por proveedor');
      }

      if (result.rows.length === 0) {
        throw new Error('No se encontraron registros de bitácora para este proveedor');
      }

      return result.rows;
    } catch (error: any) {
      throw new Error(`Error al buscar registros de bitácora por proveedor: ${error.message}`);
    }
  }
}
