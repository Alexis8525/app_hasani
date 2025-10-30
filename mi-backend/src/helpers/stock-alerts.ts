// src/helpers/stock-alerts.ts
import { sendEmail } from './notify';
import { Pool } from 'pg';

export interface AlertaStock {
  producto_id: number;
  producto_nombre: string;
  stock_actual: number;
  stock_minimo: number;
  diferencia: number;
  cliente_email?: string;
  cliente_nombre?: string;
}

export class StockAlertService {
  private pool: Pool;

  constructor(pool: Pool) {
    this.pool = pool;
  }

  /**
   * Verifica si después de un movimiento el stock queda por debajo del mínimo
   * y envía alertas si es necesario
   */
  async verificarAlertaStock(
    id_producto: number,
    cantidadMovimiento: number,
    tipoMovimiento: 'Entrada' | 'Salida'
  ): Promise<void> {
    try {
      // Obtener información del producto
      const productoResult = await this.pool.query(
        `
        SELECT p.*, pr.nombre as proveedor_nombre
        FROM productos p
        LEFT JOIN proveedores pr ON p.id_proveedor = pr.id_proveedor
        WHERE p.id_producto = $1
      `,
        [id_producto]
      );

      if (productoResult.rows.length === 0) {
        console.log(`Producto con ID ${id_producto} no encontrado`);
        return;
      }

      const producto = productoResult.rows[0];
      const stockDespuesMovimiento =
        tipoMovimiento === 'Entrada'
          ? producto.stock_actual + cantidadMovimiento
          : producto.stock_actual - cantidadMovimiento;

      // Verificar si el stock queda por debajo del mínimo
      if (stockDespuesMovimiento < producto.stock_minimo) {
        const diferencia = producto.stock_minimo - stockDespuesMovimiento;

        console.log(`⚠️ ALERTA: Producto "${producto.nombre}" quedará con stock bajo`);
        console.log(`   Stock actual: ${producto.stock_actual}`);
        console.log(`   Stock después del movimiento: ${stockDespuesMovimiento}`);
        console.log(`   Stock mínimo: ${producto.stock_minimo}`);
        console.log(`   Diferencia: ${diferencia}`);

        // Enviar alerta
        await this.enviarAlertaStock({
          producto_id: producto.id_producto,
          producto_nombre: producto.nombre,
          stock_actual: stockDespuesMovimiento,
          stock_minimo: producto.stock_minimo,
          diferencia: diferencia,
        });
      }
    } catch (error: any) {
      console.error('Error verificando alerta de stock:', error.message);
    }
  }

  /**
   * Envía alertas por correo a los clientes/usuarios configurados
   */
  private async enviarAlertaStock(alerta: AlertaStock): Promise<void> {
    try {
      // Obtener todos los clientes que deben recibir alertas
      const clientesResult = await this.pool.query(`
        SELECT nombre, contacto as email 
        FROM clientes 
        WHERE contacto IS NOT NULL AND contacto != ''
      `);

      if (clientesResult.rows.length === 0) {
        console.log('No hay clientes configurados para recibir alertas');
        return;
      }

      const subject = `🚨 ALERTA: Stock bajo - ${alerta.producto_nombre}`;
      const html = this.generarHTMLAlerta(alerta);

      // Enviar correo a cada cliente
      for (const cliente of clientesResult.rows) {
        try {
          await sendEmail(cliente.email, subject, html);
          console.log(`✅ Alerta enviada a: ${cliente.email}`);
        } catch (emailError) {
          console.error(`❌ Error enviando alerta a ${cliente.email}:`, emailError);
        }
      }
    } catch (error: any) {
      console.error('Error enviando alertas de stock:', error.message);
    }
  }

  /**
   * Genera el HTML para el correo de alerta
   */
  private generarHTMLAlerta(alerta: AlertaStock): string {
    return `
      <!DOCTYPE html>
      <html>
      <head>
        <style>
          body { font-family: Arial, sans-serif; margin: 20px; }
          .alert { border-left: 4px solid #ff4444; background: #fff8f8; padding: 15px; margin: 10px 0; }
          .product-info { background: #f9f9f9; padding: 10px; border-radius: 5px; }
          .stock-critical { color: #ff4444; font-weight: bold; }
          .stock-warning { color: #ff8800; }
        </style>
      </head>
      <body>
        <h2>🚨 Alerta de Stock Bajo</h2>
        
        <div class="alert">
          <h3>El producto <strong>"${alerta.producto_nombre}"</strong> tiene stock crítico</h3>
          
          <div class="product-info">
            <p><strong>Stock actual:</strong> <span class="stock-critical">${alerta.stock_actual} unidades</span></p>
            <p><strong>Stock mínimo requerido:</strong> ${alerta.stock_minimo} unidades</p>
            <p><strong>Diferencia:</strong> <span class="stock-critical">Faltan ${alerta.diferencia} unidades</span></p>
            <p><strong>Producto ID:</strong> ${alerta.producto_id}</p>
          </div>
          
          <p><strong>Acción recomendada:</strong> Realizar pedido de reposición inmediata.</p>
          <p><em>Este es un mensaje automático, por favor no responder.</em></p>
        </div>
        
        <hr>
        <p style="color: #666; font-size: 12px;">
          Sistema de Gestión de Inventario - ${new Date().toLocaleDateString()}
        </p>
      </body>
      </html>
    `;
  }

  /**
   * Verifica todos los productos con stock bajo y envía alertas
   */
  async verificarStockBajoGeneral(): Promise<AlertaStock[]> {
    try {
      const productosBajoStock = await this.pool.query(`
        SELECT 
          p.id_producto as producto_id,
          p.nombre as producto_nombre,
          p.stock_actual,
          p.stock_minimo,
          (p.stock_minimo - p.stock_actual) as diferencia
        FROM productos p
        WHERE p.stock_actual < p.stock_minimo
        ORDER BY diferencia DESC
      `);

      const alertas: AlertaStock[] = productosBajoStock.rows;

      if (alertas.length > 0) {
        console.log(`📊 Encontrados ${alertas.length} productos con stock bajo`);

        // Enviar alerta resumen
        await this.enviarAlertaResumen(alertas);
      }

      return alertas;
    } catch (error: any) {
      console.error('Error verificando stock bajo general:', error.message);
      return [];
    }
  }

  /**
   * Envía un resumen de todos los productos con stock bajo
   */
  private async enviarAlertaResumen(alertas: AlertaStock[]): Promise<void> {
    try {
      const clientesResult = await this.pool.query(`
        SELECT nombre, contacto as email 
        FROM clientes 
        WHERE contacto IS NOT NULL AND contacto != ''
      `);

      if (clientesResult.rows.length === 0) return;

      const subject = `📊 Resumen: ${alertas.length} productos con stock bajo`;
      const html = this.generarHTMLResumen(alertas);

      for (const cliente of clientesResult.rows) {
        try {
          await sendEmail(cliente.email, subject, html);
          console.log(`✅ Resumen enviado a: ${cliente.email}`);
        } catch (emailError) {
          console.error(`❌ Error enviando resumen a ${cliente.email}:`, emailError);
        }
      }
    } catch (error: any) {
      console.error('Error enviando resumen de alertas:', error.message);
    }
  }

  /**
   * Genera el HTML para el resumen de alertas
   */
  private generarHTMLResumen(alertas: AlertaStock[]): string {
    const productosHTML = alertas
      .map(
        (alerta) => `
      <tr>
        <td>${alerta.producto_nombre}</td>
        <td style="color: #ff4444; font-weight: bold;">${alerta.stock_actual}</td>
        <td>${alerta.stock_minimo}</td>
        <td style="color: #ff4444; font-weight: bold;">${alerta.diferencia}</td>
      </tr>
    `
      )
      .join('');

    return `
      <!DOCTYPE html>
      <html>
      <head>
        <style>
          body { font-family: Arial, sans-serif; margin: 20px; }
          table { width: 100%; border-collapse: collapse; margin: 15px 0; }
          th, td { border: 1px solid #ddd; padding: 10px; text-align: left; }
          th { background: #f5f5f5; }
          .critical { background: #fff8f8; }
        </style>
      </head>
      <body>
        <h2>📊 Resumen de Stock Bajo</h2>
        <p>Se han detectado <strong>${alertas.length} productos</strong> con stock por debajo del mínimo requerido.</p>
        
        <table>
          <thead>
            <tr>
              <th>Producto</th>
              <th>Stock Actual</th>
              <th>Stock Mínimo</th>
              <th>Faltante</th>
            </tr>
          </thead>
          <tbody>
            ${productosHTML}
          </tbody>
        </table>
        
        <p><strong>Acción recomendada:</strong> Realizar pedidos de reposición para los productos listados.</p>
        <p><em>Este es un mensaje automático, por favor no responder.</em></p>
        
        <hr>
        <p style="color: #666; font-size: 12px;">
          Sistema de Gestión de Inventario - ${new Date().toLocaleDateString()}
        </p>
      </body>
      </html>
    `;
  }
}
