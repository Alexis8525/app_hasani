// dashboard.component.ts
import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterLink } from '@angular/router';
import { MovimientosService, ProductoStockBajo } from '../../core/services/movimentos.service';
import { ProductosService } from '../../core/services/productos.service';
import { ProveedoresService } from '../../core/services/proveedores.service';


interface DashboardMetrics {
  totalProductos: number;
  productosStockBajo: number;
  movimientosHoy: number;
  totalProveedores: number;
  trendProductos: number;
  trendMovimientos: number;
}

interface ExcelReport {
  filename: string;
  data: any[];
  headers: string[];
  sheetName: string;
}


interface Alerta {
  id: number;
  titulo: string;
  descripcion: string;
  nivel: 'critico' | 'alto' | 'medio';
  tiempo: string;
  productoId?: number;
}

interface MovimientoReciente {
  id: number;
  producto: string;
  tipo: 'Entrada' | 'Salida';
  cantidad: number;
  fecha: string;
}

interface MovimientoDia {
  dia: string;
  entradas: number;
  salidas: number;
}

interface ProductoCategoria {
  nombre: string;
  cantidad: number;
  porcentaje: number;
}

// Tipo local mínimo
interface ProductoStockBajo {
  id_producto?: number;
  nombre?: string;
  stock_actual?: number;
  stock_minimo?: number;
  [k: string]: any;
}

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [CommonModule,RouterLink],
  templateUrl: './dashboard.component.html',
  styleUrls: ['./dashboard.component.css']
})
export class DashboardComponent implements OnInit {
  private readonly movimientosService = inject(MovimientosService);
  private readonly productosService = inject(ProductosService);
  private readonly proveedoresService = inject(ProveedoresService);
  private readonly router = inject(Router);

  private todosMovimientos: any[] = [];
  private todosProductos: any[] = [];
  private todosProveedores: any[] = [];

  // Datos del dashboard
  metrics: DashboardMetrics = {
    totalProductos: 0,
    productosStockBajo: 0,
    movimientosHoy: 0,
    totalProveedores: 0,
    trendProductos: 0,
    trendMovimientos: 0
  };

  alertasUrgentes: Alerta[] = [];
  movimientosRecientes: MovimientoReciente[] = [];
  movimientosPorDia: MovimientoDia[] = [];
  productosPorCategoria: ProductoCategoria[] = [];
  
  loading = true;
  generandoExcel = false;
  showReportModal = false;

  

  // relaxed typing for product alerts; replace with ProductoStockBajo interface later
  productosStockBajo: any[] = [];

  ngOnInit() {
    this.cargarDashboard();
  }

  cargarDashboard() {
    this.loading = true;
    
    // Cargar datos en paralelo
    Promise.all([
      this.cargarMetricas(),
      this.cargarAlertas(),
      this.cargarMovimientosRecientes(),
      this.cargarEstadisticas()
    ]).finally(() => {
      this.loading = false;
    });
  }

  generarReporteExcel() {
    this.showReportModal = true;
  }

  closeReportModal() {
    this.showReportModal = false;
  }

  async generarReporteCompleto() {
    this.generandoExcel = true;
    this.showReportModal = false;

    try {
      // Cargar todos los datos necesarios
      await this.cargarDatosCompletos();

      // Crear reporte completo
      const reporte: ExcelReport = {
        filename: `Reporte_Completo_${this.formatDateForFilename()}.xlsx`,
        data: this.prepararDatosCompleto(),
        headers: ['Tipo', 'Descripción', 'Valor', 'Fecha', 'Estado'],
        sheetName: 'Reporte Completo'
      };

      this.descargarExcel(reporte);

    } catch (error) {
      console.error('Error generando reporte completo:', error);
      alert('Error al generar el reporte. Intenta nuevamente.');
    } finally {
      this.generandoExcel = false;
    }
  }

  async generarReporteMovimientos() {
    this.generandoExcel = true;
    this.showReportModal = false;

    try {
      const movimientosResponse = await this.movimientosService.getAll().toPromise();
      
      if (movimientosResponse?.code === 0 && movimientosResponse.data) {
        const reporte: ExcelReport = {
          filename: `Reporte_Movimientos_${this.formatDateForFilename()}.xlsx`,
          data: this.prepararDatosMovimientos(movimientosResponse.data),
          headers: ['ID', 'Producto', 'Tipo', 'Cantidad', 'Fecha', 'Usuario'],
          sheetName: 'Movimientos'
        };

        this.descargarExcel(reporte);
      }

    } catch (error) {
      console.error('Error generando reporte movimientos:', error);
      alert('Error al generar el reporte de movimientos.');
    } finally {
      this.generandoExcel = false;
    }
  }

  async generarReporteStock() {
    this.generandoExcel = true;
    this.showReportModal = false;

    try {
      const [productosResponse, stockBajoResponse] = await Promise.all([
        this.productosService.getAll().toPromise(),
        this.movimientosService.getProductosStockBajo().toPromise()
      ]);

      const reporte: ExcelReport = {
        filename: `Reporte_Stock_${this.formatDateForFilename()}.xlsx`,
        data: this.prepararDatosStock(
          productosResponse?.data || [],
          stockBajoResponse?.data || []
        ),
        headers: ['Producto', 'Categoría', 'Stock Actual', 'Stock Mínimo', 'Estado', 'Última Actualización'],
        sheetName: 'Estado de Stock'
      };

      this.descargarExcel(reporte);

    } catch (error) {
      console.error('Error generando reporte stock:', error);
      alert('Error al generar el reporte de stock.');
    } finally {
      this.generandoExcel = false;
    }
  }

  private async cargarDatosCompletos() {
    const [movimientos, productos, proveedores, stockBajo] = await Promise.all([
      this.movimientosService.getAll().toPromise(),
      this.productosService.getAll().toPromise(),
      this.proveedoresService.getAll().toPromise(),
      this.movimientosService.getProductosStockBajo().toPromise()
    ]);

    this.todosMovimientos = movimientos?.data || [];
    this.todosProductos = productos?.data || [];
    this.todosProveedores = proveedores?.data || [];
  }

  private prepararDatosCompleto(): any[] {
    const datos = [];

    // Métricas generales
    datos.push({
      Tipo: 'Métrica',
      Descripción: 'Total de Productos',
      Valor: this.metrics.totalProductos,
      Fecha: new Date().toLocaleDateString(),
      Estado: 'ACTIVO'
    });

    datos.push({
      Tipo: 'Métrica',
      Descripción: 'Productos con Stock Bajo',
      Valor: this.metrics.productosStockBajo,
      Fecha: new Date().toLocaleDateString(),
      Estado: this.metrics.productosStockBajo > 0 ? 'ALERTA' : 'NORMAL'
    });

    datos.push({
      Tipo: 'Métrica',
      Descripción: 'Movimientos Hoy',
      Valor: this.metrics.movimientosHoy,
      Fecha: new Date().toLocaleDateString(),
      Estado: 'ACTIVO'
    });

    datos.push({
      Tipo: 'Métrica',
      Descripción: 'Total Proveedores',
      Valor: this.metrics.totalProveedores,
      Fecha: new Date().toLocaleDateString(),
      Estado: 'ACTIVO'
    });

    // Alertas
    this.alertasUrgentes.forEach(alerta => {
      datos.push({
        Tipo: 'Alerta',
        Descripción: alerta.descripcion,
        Valor: alerta.nivel.toUpperCase(),
        Fecha: new Date().toLocaleDateString(),
        Estado: 'PENDIENTE'
      });
    });

    // Movimientos recientes
    this.movimientosRecientes.forEach(mov => {
      datos.push({
        Tipo: 'Movimiento',
        Descripción: `${mov.tipo} - ${mov.producto}`,
        Valor: mov.cantidad,
        Fecha: mov.fecha,
        Estado: 'COMPLETADO'
      });
    });

    return datos;
  }

  private prepararDatosMovimientos(movimientos: any[]): any[] {
    return movimientos.map(mov => ({
      ID: mov.id_movimiento,
      Producto: mov.producto_nombre || 'N/A',
      Tipo: mov.tipo,
      Cantidad: mov.cantidad,
      Fecha: new Date(mov.fecha).toLocaleDateString('es-ES'),
      Usuario: mov.usuario_nombre || 'Sistema'
    }));
  }

  private prepararDatosStock(productos: any[], stockBajo: any[]): any[] {
    return productos.map(producto => {
      const stockBajoInfo = stockBajo.find(sb => sb.id_producto === producto.id_producto);
      
      return {
        Producto: producto.nombre,
        Categoría: producto.categoria || 'Sin categoría',
        'Stock Actual': producto.stock_actual || 0,
        'Stock Mínimo': producto.stock_minimo || 0,
        Estado: stockBajoInfo ? 'STOCK BAJO' : 'NORMAL',
        'Última Actualización': new Date().toLocaleDateString('es-ES')
      };
    });
  }

  private descargarExcel(reporte: ExcelReport) {
    // Crear workbook
    const workbook = this.crearWorkbook(reporte);
    
    // Convertir a blob y descargar
    const blob = new Blob([this.workbookToArrayBuffer(workbook)], {
      type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
    });
    
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = reporte.filename;
    link.click();
    
    window.URL.revokeObjectURL(url);
  }

  private crearWorkbook(reporte: ExcelReport): any {
    // Esta es una implementación básica - en una app real usarías una librería como xlsx
    const workbook = {
      SheetNames: [reporte.sheetName],
      Sheets: {
        [reporte.sheetName]: this.crearHojaCalculo(reporte)
      }
    };
    
    return workbook;
  }

  private crearHojaCalculo(reporte: ExcelReport): any {
    // Crear estructura básica de hoja de cálculo
    const ws: { [key: string]: any } = {};
    
    // Agregar headers
    reporte.headers.forEach((header: string, index: number) => {

      const cellRef = this.numToCol(index) + '1';
      ws[cellRef] = { v: header, t: 's' };
    });
    
    // Agregar datos
    reporte.data.forEach((fila: any, rowIndex: number) => {
      Object.values(fila).forEach((valor: any, colIndex: number) => {
    
        const cellRef = this.numToCol(colIndex) + (rowIndex + 2);
        ws[cellRef] = { v: valor, t: typeof valor === 'number' ? 'n' : 's' };
      });
    });
    
    return ws;
  }

  private workbookToArrayBuffer(workbook: any): ArrayBuffer {
    // En una implementación real, usarías xlsx.write(workbook, { type: 'array' })
    // Esta es una simulación básica
    return new ArrayBuffer(1024);
  }

  private numToCol(num: number): string {
    let col = '';
    while (num >= 0) {
      col = String.fromCharCode(65 + (num % 26)) + col;
      num = Math.floor(num / 26) - 1;
    }
    return col;
  }

  private formatDateForFilename(): string {
    const now = new Date();
    return now.toISOString()
      .replace(/[:.]/g, '-')
      .replace('T', '_')
      .split('Z')[0];
  }

  private async cargarMetricas() {
    try {
      // Cargar productos
      const productosResponse = await firstValueFrom(this.productosService.getAll());
      if (productosResponse?.code === 0 && productosResponse.data) {
        this.metrics.totalProductos = productosResponse.data.length;
      }

      // Cargar productos con stock bajo
      const stockBajoResponse = await firstValueFrom(this.movimientosService.getProductosStockBajo());
      if (stockBajoResponse?.code === 0 && stockBajoResponse.data) {
        this.metrics.productosStockBajo = stockBajoResponse.data.length;
      }

      // Cargar proveedores
      const proveedoresResponse = await firstValueFrom(this.proveedoresService.getAll());
      if (proveedoresResponse?.code === 0 && proveedoresResponse.data) {
        this.metrics.totalProveedores = proveedoresResponse.data.length;
      }

      // Cargar movimientos para calcular movimientos de hoy
      const movimientosResponse = await firstValueFrom(this.movimientosService.getAll());
      if (movimientosResponse?.code === 0 && movimientosResponse.data) {
        const hoy = new Date().toDateString();
        this.metrics.movimientosHoy = movimientosResponse.data.filter((mov) =>
          new Date(mov.fecha).toDateString() === hoy
        ).length;
      }

    } catch (error) {
      console.error('Error cargando métricas:', error);
    }
  }

  private async cargarAlertas() {
    try {
      const alertasResponse = await firstValueFrom(this.movimientosService.getProductosStockBajo());
      
      if (alertasResponse?.code === 0 && alertasResponse.data) {
        this.alertasUrgentes = alertasResponse.data.map((producto: ProductoStockBajo, index: number) => {
          let nivel: 'critico' | 'alto' | 'medio' = 'medio';
          
          if (producto['nivel_alerta'] === 'CRÍTICO') nivel = 'critico';
          else if (producto['nivel_alerta'] === 'ALTO') nivel = 'alto';
          
          return {
            id: index + 1,
            titulo: `Stock ${producto['nivel_alerta'].toLowerCase()}`,
            descripcion: `Producto "${producto.nombre}" por debajo del mínimo (Stock: ${producto.stock_actual}, Mínimo: ${producto.stock_minimo})`,
            nivel: nivel,
            tiempo: 'Reciente',
            productoId: producto.id_producto
          };
        }).slice(0, 5); // Mostrar solo las 5 alertas más críticas
      }
    } catch (error) {
      console.error('Error cargando alertas:', error);
    }
  }

  private async cargarMovimientosRecientes() {
    try {
      const movimientosResponse = await firstValueFrom(this.movimientosService.getAll());
      
      if (movimientosResponse?.code === 0 && movimientosResponse.data) {
        // Ordenar por fecha más reciente y tomar los últimos 5
        const movimientosOrdenados = (movimientosResponse.data as any[]).sort((a: any, b: any) => new Date(b.fecha).getTime() - new Date(a.fecha).getTime()).slice(0, 5);

        this.movimientosRecientes = movimientosOrdenados.map((mov: any) => ({
          id: mov.id_movimiento,
          producto: mov.producto_nombre || 'Producto sin nombre',
          tipo: mov.tipo,
          cantidad: mov.cantidad,
          fecha: this.formatRelativeTime(mov.fecha)
        }));
      }
    } catch (error) {
      console.error('Error cargando movimientos recientes:', error);
    }
  }

  private async cargarEstadisticas() {
    try {
      // Cargar movimientos para estadísticas de la semana
      const movimientosResponse = await firstValueFrom(this.movimientosService.getAll());
      
      if (movimientosResponse?.code === 0 && movimientosResponse.data) {
        this.calcularMovimientosSemana(movimientosResponse.data);
      }

      // Cargar productos para estadísticas por categoría
      const productosResponse = await firstValueFrom(this.productosService.getAll());
      
      if (productosResponse?.code === 0 && productosResponse.data) {
        this.calcularProductosPorCategoria(productosResponse.data);
      }

    } catch (error) {
      console.error('Error cargando estadísticas:', error);
    }
  }

  private calcularMovimientosSemana(movimientos: any[]) {
    const ultimos7Dias = this.getUltimos7Dias();
    
    this.movimientosPorDia = ultimos7Dias.map(dia => {
      const movimientosDia = movimientos.filter(mov => 
        new Date(mov.fecha).toDateString() === dia.fecha.toDateString()
      );
      
      return {
        dia: dia.nombre,
        entradas: movimientosDia.filter(m => m.tipo === 'Entrada').length,
        salidas: movimientosDia.filter(m => m.tipo === 'Salida').length
      };
    });
  }

  private calcularProductosPorCategoria(productos: any[]) {
    const categoriasMap = new Map<string, number>();
    
    for (const producto of productos) {
      const categoria = producto.categoria || 'Sin categoría';
      categoriasMap.set(categoria, (categoriasMap.get(categoria) || 0) + 1);
    }

    const total = productos.length;
    
    this.productosPorCategoria = Array.from(categoriasMap.entries()).map(([nombre, cantidad]) => ({
      nombre,
      cantidad,
      porcentaje: Math.round((cantidad / total) * 100)
    })).sort((a, b) => b.cantidad - a.cantidad).slice(0, 5); // Top 5 categorías
  }

  private getUltimos7Dias() {
    const dias = [];
    for (let i = 6; i >= 0; i--) {
      const fecha = new Date();
      fecha.setDate(fecha.getDate() - i);
      dias.push({
        fecha,
        nombre: fecha.toLocaleDateString('es-ES', { weekday: 'short' })
      });
    }
    return dias;
  }

  private formatRelativeTime(fecha: string | Date): string {
    const ahora = new Date();
    const fechaMov = new Date(fecha);
    const diffMs = ahora.getTime() - fechaMov.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 60) {
      return `Hace ${diffMins} min`;
    } else if (diffHours < 24) {
      return `Hace ${diffHours} h`;
    } else if (diffDays === 1) {
      return 'Ayer';
    } else {
      return `Hace ${diffDays} días`;
    }
  }

  // Métodos para el template - AGREGADOS
  getBarHeight(value: number): number {
    const maxValue = Math.max(...this.movimientosPorDia.map(d => d.entradas + d.salidas));
    return maxValue > 0 ? (value / maxValue) * 100 : 0;
  }

  getTotalEntradas(): number {
    return this.movimientosPorDia.reduce((sum, day) => sum + day.entradas, 0);
  }

  getTotalSalidas(): number {
    return this.movimientosPorDia.reduce((sum, day) => sum + day.salidas, 0);
  }

  // Métodos de utilidad
  getAlertaIcon(nivel: string): string {
    switch (nivel) {
      case 'critico': return '🚨';
      case 'alto': return '⚠️';
      case 'medio': return '🔶';
      default: return 'ℹ️';
    }
  }

  // Navegación
  verTodasAlertas() {
    this.router.navigate(['/movimientos']);
  }

  verTodosMovimientos() {
    this.router.navigate(['/movimientos']);
  }

  registrarMovimiento() {
    this.router.navigate(['/movimientos'], { queryParams: { action: 'create' } });
  }

  registrarSalida() {
    this.router.navigate(['/movimientos'], { queryParams: { action: 'create', tipo: 'salida' } });
  }

  gestionarProductos() {
    this.router.navigate(['/productos']);
  }

  verReportes() {
    this.router.navigate(['/movimientos'], { queryParams: { view: 'reports' } });
  }

  gestionarProveedores() {
    this.router.navigate(['/proveedores']);
  }

  resolverAlerta(alerta: Alerta) {
    // Filtrar la alerta resuelta
    this.alertasUrgentes = this.alertasUrgentes.filter(a => a.id !== alerta.id);
    
    // Opcional: Navegar al producto específico
    if (alerta.productoId) {
      this.router.navigate(['/productos']);
    }
  }
}