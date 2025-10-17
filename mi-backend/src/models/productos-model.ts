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
    try {
      const result = await this.pool.query(`
        SELECT p.*, pr.nombre as nombre_proveedor 
        FROM productos p 
        LEFT JOIN proveedores pr ON p.id_proveedor = pr.id_proveedor 
        ORDER BY p.nombre ASC
      `);
      
      if (!result.rows || result.rows.length === 0) {
        throw new Error('No se encontraron productos en la base de datos');
      }
      
      return result.rows;
    } catch (error: any) {
      throw new Error(`Error al obtener todos los productos: ${error.message}`);
    }
  }

  async findByNombre(nombre: string): Promise<Producto | null> {
    try {
      if (!nombre || nombre.trim().length === 0) {
        throw new Error('El nombre no puede estar vacío');
      }

      if (nombre.length > 100) {
        throw new Error('El nombre no puede tener más de 100 caracteres');
      }

      const result = await this.pool.query(`
        SELECT p.*, pr.nombre as nombre_proveedor 
        FROM productos p 
        LEFT JOIN proveedores pr ON p.id_proveedor = pr.id_proveedor 
        WHERE p.nombre = $1
      `, [nombre]);
      
      return result.rows[0] || null;
    } catch (error: any) {
      throw new Error(`Error al buscar producto por nombre: ${error.message}`);
    }
  }

  async create(producto: Omit<Producto, 'id_producto' | 'created_at' | 'updated_at'>): Promise<Producto> {
    try {
      const { codigo, nombre, descripcion, categoria, unidad, stock_minimo, stock_actual, id_proveedor } = producto;

      // Validaciones de campos obligatorios
      if (!codigo || codigo.trim().length === 0) {
        throw new Error('El código es obligatorio');
      }

      if (!nombre || nombre.trim().length === 0) {
        throw new Error('El nombre es obligatorio');
      }

      if (!unidad || unidad.trim().length === 0) {
        throw new Error('La unidad es obligatoria');
      }

      // Validaciones de longitud
      if (codigo.length > 50) {
        throw new Error('El código no puede tener más de 50 caracteres');
      }

      if (nombre.length > 100) {
        throw new Error('El nombre no puede tener más de 100 caracteres');
      }

      if (descripcion && descripcion.length > 500) {
        throw new Error('La descripción no puede tener más de 500 caracteres');
      }

      if (categoria && categoria.length > 100) {
        throw new Error('La categoría no puede tener más de 100 caracteres');
      }

      if (unidad.length > 20) {
        throw new Error('La unidad no puede tener más de 20 caracteres');
      }

      // Validaciones numéricas
      if (stock_minimo < 0) {
        throw new Error('El stock mínimo no puede ser negativo');
      }

      if (stock_actual < 0) {
        throw new Error('El stock actual no puede ser negativo');
      }

      if (id_proveedor && id_proveedor <= 0) {
        throw new Error('El ID del proveedor debe ser mayor a 0');
      }

      const result = await this.pool.query(
        `INSERT INTO productos (codigo, nombre, descripcion, categoria, unidad, stock_minimo, stock_actual, id_proveedor) 
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8) RETURNING *`,
        [codigo.trim(), nombre.trim(), descripcion, categoria, unidad.trim(), stock_minimo, stock_actual, id_proveedor]
      );

      if (!result.rows || result.rows.length === 0) {
        throw new Error('No se pudo crear el producto en la base de datos');
      }

      return result.rows[0];
    } catch (error: any) {
      throw new Error(`Error al crear producto: ${error.message}`);
    }
  }

  async update(nombre: string, producto: Partial<Omit<Producto, 'id_producto' | 'created_at' | 'updated_at'>>): Promise<Producto | null> {
    try {
      if (!nombre || nombre.trim().length === 0) {
        throw new Error('El nombre es obligatorio para la actualización');
      }

      if (nombre.length > 100) {
        throw new Error('El nombre no puede tener más de 100 caracteres');
      }

      const { codigo, descripcion, categoria, unidad, stock_minimo, stock_actual, id_proveedor } = producto;

      // Validaciones de longitud
      if (codigo && codigo.length > 50) {
        throw new Error('El código no puede tener más de 50 caracteres');
      }

      if (descripcion && descripcion.length > 500) {
        throw new Error('La descripción no puede tener más de 500 caracteres');
      }

      if (categoria && categoria.length > 100) {
        throw new Error('La categoría no puede tener más de 100 caracteres');
      }

      if (unidad && unidad.length > 20) {
        throw new Error('La unidad no puede tener más de 20 caracteres');
      }

      // Validaciones numéricas
      if (stock_minimo !== undefined && stock_minimo < 0) {
        throw new Error('El stock mínimo no puede ser negativo');
      }

      if (stock_actual !== undefined && stock_actual < 0) {
        throw new Error('El stock actual no puede ser negativo');
      }

      if (id_proveedor && id_proveedor <= 0) {
        throw new Error('El ID del proveedor debe ser mayor a 0');
      }

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

      if (!result.rows || result.rows.length === 0) {
        throw new Error('No se encontró el producto para actualizar');
      }

      return result.rows[0] || null;
    } catch (error: any) {
      throw new Error(`Error al actualizar producto: ${error.message}`);
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

      const result = await this.pool.query('DELETE FROM productos WHERE nombre = $1', [nombre]);
      
      if ((result.rowCount ?? 0) === 0) {
        throw new Error('No se encontró el producto para eliminar');
      }
      
      return (result.rowCount ?? 0) > 0;
    } catch (error: any) {
      throw new Error(`Error al eliminar producto: ${error.message}`);
    }
  }

  async updateStock(nombre: string, cantidad: number): Promise<Producto | null> {
    try {
      if (!nombre || nombre.trim().length === 0) {
        throw new Error('El nombre es obligatorio para actualizar stock');
      }

      if (nombre.length > 100) {
        throw new Error('El nombre no puede tener más de 100 caracteres');
      }

      if (cantidad < 0) {
        throw new Error('La cantidad no puede ser negativa');
      }

      const result = await this.pool.query(
        'UPDATE productos SET stock_actual = $1, updated_at = NOW() WHERE nombre = $2 RETURNING *',
        [cantidad, nombre]
      );

      if (!result.rows || result.rows.length === 0) {
        throw new Error('No se encontró el producto para actualizar stock');
      }

      return result.rows[0] || null;
    } catch (error: any) {
      throw new Error(`Error al actualizar stock del producto: ${error.message}`);
    }
  }

  async findLowStock(): Promise<Producto[]> {
    try {
      const result = await this.pool.query(`
        SELECT p.*, pr.nombre as nombre_proveedor 
        FROM productos p 
        LEFT JOIN proveedores pr ON p.id_proveedor = pr.id_proveedor 
        WHERE p.stock_actual <= p.stock_minimo
        ORDER BY p.stock_actual ASC
      `);

      if (!result.rows) {
        throw new Error('Error al consultar productos con stock bajo');
      }

      return result.rows;
    } catch (error: any) {
      throw new Error(`Error al obtener productos con stock bajo: ${error.message}`);
    }
  }
}
