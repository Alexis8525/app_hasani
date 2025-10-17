// src/models/movimientos-model.ts
import { Pool } from 'pg';
import { ProductoModel } from './productos-model';

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
  private productoModel: ProductoModel;

  constructor(pool: Pool) {
    this.pool = pool;
    this.productoModel = new ProductoModel(pool);
  }

  async findAll(): Promise<Movimiento[]> {
    try {
      const result = await this.pool.query(`
        SELECT m.*, p.nombre as producto_nombre, u.email as responsable_nombre, c.nombre as cliente_nombre
        FROM movimientos m
        JOIN productos p ON m.id_producto = p.id_producto
        JOIN users u ON m.responsable = u.id
        LEFT JOIN clientes c ON m.id_cliente = c.id_cliente
        ORDER BY m.fecha DESC
      `);
      
      if (!result.rows || result.rows.length === 0) {
        throw new Error('No se encontraron movimientos en la base de datos');
      }
      
      return result.rows;
    } catch (error: any) {
      throw new Error(`Error al obtener todos los movimientos: ${error.message}`);
    }
  }

  async findById(id: number): Promise<Movimiento | null> {
    try {
      if (!id || id <= 0) {
        throw new Error('El ID debe ser un número mayor a 0');
      }

      const result = await this.pool.query(`
        SELECT m.*, p.nombre as producto_nombre, u.email as responsable_nombre, c.nombre as cliente_nombre
        FROM movimientos m
        JOIN productos p ON m.id_producto = p.id_producto
        JOIN users u ON m.responsable = u.id
        LEFT JOIN clientes c ON m.id_cliente = c.id_cliente
        WHERE m.id_movimiento = $1
      `, [id]);
      
      return result.rows[0] || null;
    } catch (error: any) {
      throw new Error(`Error al buscar movimiento por ID: ${error.message}`);
    }
  }

  async create(movimiento: Omit<Movimiento, 'id_movimiento' | 'fecha' | 'created_at'>): Promise<Movimiento> {
    try {
      const { tipo, id_producto, cantidad, referencia, responsable, id_cliente } = movimiento;

      // Validaciones de campos obligatorios
      if (!tipo) {
        throw new Error('El tipo es obligatorio');
      }

      if (!id_producto || id_producto <= 0) {
        throw new Error('El ID del producto es obligatorio y debe ser mayor a 0');
      }

      if (!cantidad) {
        throw new Error('La cantidad es obligatoria');
      }

      if (!responsable || responsable <= 0) {
        throw new Error('El responsable es obligatorio y debe ser mayor a 0');
      }

      // Validaciones de formato y rangos
      if (!['Entrada', 'Salida'].includes(tipo)) {
        throw new Error('El tipo debe ser "Entrada" o "Salida"');
      }

      if (cantidad <= 0) {
        throw new Error('La cantidad debe ser mayor a 0');
      }

      if (cantidad > 1000000) {
        throw new Error('La cantidad no puede ser mayor a 1,000,000');
      }

      if (referencia && referencia.length > 200) {
        throw new Error('La referencia no puede tener más de 200 caracteres');
      }

      if (id_cliente && id_cliente <= 0) {
        throw new Error('El ID del cliente debe ser mayor a 0');
      }

      const result = await this.pool.query(
        `INSERT INTO movimientos (tipo, id_producto, cantidad, referencia, responsable, id_cliente) 
         VALUES ($1, $2, $3, $4, $5, $6) RETURNING *`,
        [tipo, id_producto, cantidad, referencia, responsable, id_cliente]
      );

      if (!result.rows || result.rows.length === 0) {
        throw new Error('No se pudo crear el movimiento en la base de datos');
      }

      return result.rows[0];
    } catch (error: any) {
      throw new Error(`Error al crear movimiento: ${error.message}`);
    }
  }

  async findByProductoNombre(nombreProducto: string): Promise<Movimiento[]> {
    try {
      if (!nombreProducto || nombreProducto.trim().length === 0) {
        throw new Error('El nombre del producto no puede estar vacío');
      }

      if (nombreProducto.length > 100) {
        throw new Error('El nombre del producto no puede tener más de 100 caracteres');
      }

      const producto = await this.productoModel.findByNombre(nombreProducto);
      if (!producto) {
        throw new Error('Producto no encontrado');
      }

      const result = await this.pool.query(`
        SELECT m.*, p.nombre as producto_nombre, u.email as responsable_nombre, c.nombre as cliente_nombre
        FROM movimientos m
        JOIN productos p ON m.id_producto = p.id_producto
        JOIN users u ON m.responsable = u.id
        LEFT JOIN clientes c ON m.id_cliente = c.id_cliente
        WHERE m.id_producto = $1
        ORDER BY m.fecha DESC
      `, [producto.id_producto]);

      if (!result.rows) {
        throw new Error('Error al consultar movimientos del producto');
      }

      return result.rows;
    } catch (error: any) {
      throw new Error(`Error al buscar movimientos por nombre de producto: ${error.message}`);
    }
  }

  async findByDateRange(fechaInicio: Date, fechaFin: Date): Promise<Movimiento[]> {
    try {
      if (!fechaInicio) {
        throw new Error('La fecha de inicio es obligatoria');
      }

      if (!fechaFin) {
        throw new Error('La fecha de fin es obligatoria');
      }

      if (fechaInicio > fechaFin) {
        throw new Error('La fecha de inicio no puede ser mayor a la fecha de fin');
      }

      // Validar que el rango de fechas no sea mayor a 1 año
      const unAnioEnMs = 365 * 24 * 60 * 60 * 1000;
      if (fechaFin.getTime() - fechaInicio.getTime() > unAnioEnMs) {
        throw new Error('El rango de fechas no puede ser mayor a 1 año');
      }

      const result = await this.pool.query(`
        SELECT m.*, p.nombre as producto_nombre, u.email as responsable_nombre, c.nombre as cliente_nombre
        FROM movimientos m
        JOIN productos p ON m.id_producto = p.id_producto
        JOIN users u ON m.responsable = u.id
        LEFT JOIN clientes c ON m.id_cliente = c.id_cliente
        WHERE m.fecha BETWEEN $1 AND $2
        ORDER BY m.fecha DESC
      `, [fechaInicio, fechaFin]);

      if (!result.rows) {
        throw new Error('Error al consultar movimientos por rango de fechas');
      }

      return result.rows;
    } catch (error: any) {
      throw new Error(`Error al buscar movimientos por rango de fechas: ${error.message}`);
    }
  }
}
