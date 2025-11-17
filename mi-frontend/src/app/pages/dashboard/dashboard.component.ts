// dashboard.component.ts
import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { MovimientosService } from '../../core/services/movimentos.service';
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
  imports: [CommonModule],
  templateUrl: './dashboard.component.html',
  styleUrls: ['./dashboard.component.css']
})
export class DashboardComponent implements OnInit {
  private movimientosService = inject(MovimientosService);
  private productosService = inject(ProductosService);
  private proveedoresService = inject(ProveedoresService);
  private router = inject(Router);

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

  private async cargarMetricas() {
    try {
      // Cargar productos
      const productosResponse = await this.productosService.getAll().toPromise();
      if (productosResponse?.code === 0 && productosResponse.data) {
        this.metrics.totalProductos = productosResponse.data.length;
      }

      // Cargar productos con stock bajo
      const stockBajoResponse = await this.movimientosService.getProductosStockBajo().toPromise();
      if (stockBajoResponse?.code === 0 && stockBajoResponse.data) {
        this.metrics.productosStockBajo = stockBajoResponse.data.length;
      }

      // Cargar proveedores
      const proveedoresResponse = await this.proveedoresService.getAll().toPromise();
      if (proveedoresResponse?.code === 0 && proveedoresResponse.data) {
        this.metrics.totalProveedores = proveedoresResponse.data.length;
      }

      // Cargar movimientos para calcular movimientos de hoy
      const movimientosResponse = await this.movimientosService.getAll().toPromise();
      if (movimientosResponse?.code === 0 && movimientosResponse.data) {
        const hoy = new Date().toDateString();
        this.metrics.movimientosHoy = movimientosResponse.data.filter((mov: any) =>
          new Date((mov as any).fecha).toDateString() === hoy
        ).length;
      }

    } catch (error) {
      console.error('Error cargando métricas:', error);
    }
  }

  private async cargarAlertas() {
    try {
      const alertasResponse = await this.movimientosService.getProductosStockBajo().toPromise();
      
      if (alertasResponse?.code === 0 && alertasResponse.data) {
        this.alertasUrgentes = alertasResponse.data.map((producto: ProductoStockBajo, index: number) => {
          let nivel: 'critico' | 'alto' | 'medio' = 'medio';
          
          if (producto.nivel_alerta === 'CRÍTICO') nivel = 'critico';
          else if (producto.nivel_alerta === 'ALTO') nivel = 'alto';
          
          return {
            id: index + 1,
            titulo: `Stock ${producto.nivel_alerta.toLowerCase()}`,
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
      const movimientosResponse = await this.movimientosService.getAll().toPromise();
      
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
      const movimientosResponse = await this.movimientosService.getAll().toPromise();
      
      if (movimientosResponse?.code === 0 && movimientosResponse.data) {
        this.calcularMovimientosSemana(movimientosResponse.data);
      }

      // Cargar productos para estadísticas por categoría
      const productosResponse = await this.productosService.getAll().toPromise();
      
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
    
    productos.forEach(producto => {
      const categoria = producto.categoria || 'Sin categoría';
      categoriasMap.set(categoria, (categoriasMap.get(categoria) || 0) + 1);
    });

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
