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
  nombre_proveedor?: string;
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

      return result.rows || [];
    } catch (error: any) {
      throw new Error(`Error al obtener todos los productos: ${error.message}`);
    }
  }

  // Buscar por nombre - CORREGIDO
  async findByNombre(nombre: string): Promise<Producto[]> {
    try {
      if (!nombre || nombre.trim().length === 0) {
        return [];
      }

      if (nombre.length > 100) {
        throw new Error('El nombre no puede tener más de 100 caracteres');
      }

      const result = await this.pool.query(
        `SELECT p.*, pr.nombre as nombre_proveedor 
         FROM productos p 
         LEFT JOIN proveedores pr ON p.id_proveedor = pr.id_proveedor 
         WHERE p.nombre ILIKE $1
         ORDER BY p.nombre ASC`,
        [`%${nombre}%`]
      );

      return result.rows || [];
    } catch (error: any) {
      throw new Error(`Error al buscar producto por nombre: ${error.message}`);
    }
  }

  // NUEVO: Buscar por código
  async findByCodigo(codigo: string): Promise<Producto[]> {
    try {
      if (!codigo || codigo.trim().length === 0) {
        return [];
      }

      const result = await this.pool.query(
        `SELECT p.*, pr.nombre as nombre_proveedor 
         FROM productos p 
         LEFT JOIN proveedores pr ON p.id_proveedor = pr.id_proveedor 
         WHERE p.codigo = $1`,
        [codigo.trim()]
      );

      return result.rows || [];
    } catch (error: any) {
      throw new Error(`Error al buscar producto por código: ${error.message}`);
    }
  }

  // NUEVO: Verificar si existe producto por nombre o código
  async exists(nombre: string, codigo: string): Promise<{ exists: boolean; byName: boolean; byCode: boolean }> {
    try {
      const result = await this.pool.query(
        `SELECT 
          EXISTS(SELECT 1 FROM productos WHERE nombre = $1) as exists_by_name,
          EXISTS(SELECT 1 FROM productos WHERE codigo = $2) as exists_by_code`,
        [nombre.trim(), codigo.trim()]
      );

      return {
        exists: result.rows[0].exists_by_name || result.rows[0].exists_by_code,
        byName: result.rows[0].exists_by_name,
        byCode: result.rows[0].exists_by_code
      };
    } catch (error: any) {
      throw new Error(`Error al verificar existencia de producto: ${error.message}`);
    }
  }

  // Crear producto - CORREGIDO
  async create(
    producto: Omit<Producto, 'id_producto' | 'created_at' | 'updated_at' | 'nombre_proveedor'>
  ): Promise<Producto> {
    try {
      const {
        codigo,
        nombre,
        descripcion,
        categoria,
        unidad,
        stock_minimo,
        stock_actual,
        id_proveedor,
      } = producto;

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

      // Verificar si ya existe un producto con el mismo nombre o código
      const existe = await this.exists(nombre, codigo);
      if (existe.exists) {
        if (existe.byName && existe.byCode) {
          throw new Error('Ya existe un producto con este nombre y código');
        } else if (existe.byName) {
          throw new Error('Ya existe un producto con este nombre');
        } else if (existe.byCode) {
          throw new Error('Ya existe un producto con este código');
        }
      }

      const result = await this.pool.query(
        `INSERT INTO productos (codigo, nombre, descripcion, categoria, unidad, stock_minimo, stock_actual, id_proveedor) 
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING *`,
        [
          codigo.trim(),
          nombre.trim(),
          descripcion?.trim() || null,
          categoria?.trim() || null,
          unidad.trim(),
          stock_minimo,
          stock_actual,
          id_proveedor || null,
        ]
      );

      if (!result.rows || result.rows.length === 0) {
        throw new Error('No se pudo crear el producto en la base de datos');
      }

      return result.rows[0];
    } catch (error: any) {
      // Si es un error de unique constraint de PostgreSQL
      if (error.code === '23505') {
        if (error.constraint?.includes('nombre')) {
          throw new Error('Ya existe un producto con este nombre');
        } else if (error.constraint?.includes('codigo')) {
          throw new Error('Ya existe un producto con este código');
        }
      }
      throw new Error(`Error al crear producto: ${error.message}`);
    }
  }

  // Actualizar producto - CORREGIDO
  async update(
    nombreOriginal: string,
    producto: Partial<Omit<Producto, 'id_producto' | 'created_at' | 'updated_at' | 'nombre_proveedor'>>
  ): Promise<Producto> {
    try {
      if (!nombreOriginal || nombreOriginal.trim().length === 0) {
        throw new Error('El nombre original es obligatorio para la actualización');
      }

      const { codigo, nombre, descripcion, categoria, unidad, stock_minimo, stock_actual, id_proveedor } = producto;

      // Verificar que el producto original exista
      const productoOriginal = await this.findByNombre(nombreOriginal);
      if (productoOriginal.length === 0) {
        throw new Error('No se encontró el producto para actualizar');
      }

      // Si se está cambiando el nombre, verificar que no exista otro con el nuevo nombre
      if (nombre && nombre !== nombreOriginal) {
        const existeConNuevoNombre = await this.findByNombre(nombre);
        if (existeConNuevoNombre.length > 0) {
          throw new Error('Ya existe otro producto con este nombre');
        }
      }

      // Si se está cambiando el código, verificar que no exista otro con el nuevo código
      if (codigo && codigo !== productoOriginal[0].codigo) {
        const existeConNuevoCodigo = await this.findByCodigo(codigo);
        if (existeConNuevoCodigo.length > 0) {
          throw new Error('Ya existe otro producto con este código');
        }
      }

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
         WHERE nombre = $9 RETURNING *`,
        [
          codigo,
          nombre,
          descripcion,
          categoria,
          unidad,
          stock_minimo,
          stock_actual,
          id_proveedor,
          nombreOriginal
        ]
      );

      if (!result.rows || result.rows.length === 0) {
        throw new Error('No se pudo actualizar el producto');
      }

      return result.rows[0];
    } catch (error: any) {
      throw new Error(`Error al actualizar producto: ${error.message}`);
    }
  }

  // Eliminar producto - CORREGIDO
  async delete(nombre: string): Promise<boolean> {
    try {
      if (!nombre || nombre.trim().length === 0) {
        throw new Error('El nombre es obligatorio para eliminar');
      }

      const result = await this.pool.query(
        'DELETE FROM productos WHERE nombre = $1', 
        [nombre]
      );

      return (result.rowCount ?? 0) > 0;
    } catch (error: any) {
      throw new Error(`Error al eliminar producto: ${error.message}`);
    }
  }

  // Actualizar stock - CORREGIDO
  async updateStock(nombre: string, cantidad: number): Promise<Producto> {
    try {
      if (!nombre || nombre.trim().length === 0) {
        throw new Error('El nombre es obligatorio para actualizar stock');
      }

      if (cantidad < 0) {
        throw new Error('La cantidad no puede ser negativa');
      }

      const result = await this.pool.query(
        `UPDATE productos SET stock_actual = $1, updated_at = NOW() 
         WHERE nombre = $2 RETURNING *`,
        [cantidad, nombre]
      );

      if (!result.rows || result.rows.length === 0) {
        throw new Error('No se encontró el producto para actualizar stock');
      }

      return result.rows[0];
    } catch (error: any) {
      throw new Error(`Error al actualizar stock del producto: ${error.message}`);
    }
  }

  // Buscar productos con stock bajo - CORREGIDO
  async findLowStock(): Promise<Producto[]> {
    try {
      const result = await this.pool.query(`
        SELECT p.*, pr.nombre as nombre_proveedor 
        FROM productos p 
        LEFT JOIN proveedores pr ON p.id_proveedor = pr.id_proveedor 
        WHERE p.stock_actual <= p.stock_minimo
        ORDER BY p.stock_actual ASC
      `);

      return result.rows || [];
    } catch (error: any) {
      throw new Error(`Error al obtener productos con stock bajo: ${error.message}`);
    }
  }

  // NUEVO: Búsqueda avanzada
  async searchAdvanced(criteria: {
    termino?: string;
    codigo?: string;
    categoria?: string;
    nombre?: string;
  }): Promise<Producto[]> {
    try {
      const { termino, codigo, categoria, nombre } = criteria;
      
      let query = `
        SELECT p.*, pr.nombre as nombre_proveedor 
        FROM productos p 
        LEFT JOIN proveedores pr ON p.id_proveedor = pr.id_proveedor 
        WHERE 1=1
      `;
      const params: any[] = [];
      let paramCount = 0;

      if (termino) {
        paramCount++;
        query += ` AND (p.nombre ILIKE $${paramCount} OR p.codigo ILIKE $${paramCount} OR p.categoria ILIKE $${paramCount})`;
        params.push(`%${termino}%`);
      }

      if (nombre) {
        paramCount++;
        query += ` AND p.nombre ILIKE $${paramCount}`;
        params.push(`%${nombre}%`);
      }

      if (codigo) {
        paramCount++;
        query += ` AND p.codigo ILIKE $${paramCount}`;
        params.push(`%${codigo}%`);
      }

      if (categoria) {
        paramCount++;
        query += ` AND p.categoria ILIKE $${paramCount}`;
        params.push(`%${categoria}%`);
      }

      query += ` ORDER BY p.nombre ASC`;

      const result = await this.pool.query(query, params);
      return result.rows || [];
    } catch (error: any) {
      throw new Error(`Error en búsqueda avanzada: ${error.message}`);
    }
  }
}
