// services/movimientos.service.ts
import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

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
  producto_nombre?: string;
  responsable_nombre?: string;
  cliente_nombre?: string;
}

export interface ProductoStockBajo {
  id_producto: number;
  nombre: string;
  codigo?: string; // Hacerla opcional
  stock_actual: number;
  stock_minimo: number;
  diferencia: number;
  nivel_alerta: string;
}

export interface ApiResponse<T> {
  code: number;
  message: string;
  data?: T;
  total?: number;
  busquedaOriginal?: string;
}

@Injectable({
  providedIn: 'root'
})
export class MovimientosService {
  private http = inject(HttpClient);
  private apiUrl = 'http://localhost:3000/api/movimientos';

  // Obtener todos los movimientos
  getAll(): Observable<ApiResponse<Movimiento[]>> {
    return this.http.get<ApiResponse<Movimiento[]>>(this.apiUrl);
  }

  // Buscar movimiento por ID
  getById(id: number): Observable<ApiResponse<Movimiento>> {
    return this.http.post<ApiResponse<Movimiento>>(`${this.apiUrl}/buscar`, { id });
  }

  // Crear nuevo movimiento
  create(movimiento: Omit<Movimiento, 'id_movimiento' | 'fecha' | 'created_at' | 'producto_nombre' | 'responsable_nombre' | 'cliente_nombre'>): Observable<ApiResponse<Movimiento>> {
    return this.http.post<ApiResponse<Movimiento>>(this.apiUrl, movimiento);
  }

  // Buscar movimientos por producto
  getByProducto(nombreProducto: string): Observable<ApiResponse<Movimiento[]>> {
    return this.http.post<ApiResponse<Movimiento[]>>(`${this.apiUrl}/producto`, { nombreProducto });
  }

  // Buscar movimientos por rango de fechas
  getByDateRange(fechaInicio: string, fechaFin: string): Observable<ApiResponse<Movimiento[]>> {
    return this.http.post<ApiResponse<Movimiento[]>>(`${this.apiUrl}/report/date-range`, {
      fechaInicio,
      fechaFin
    });
  }

  // Verificar alertas de stock
  verificarAlertasStock(): Observable<ApiResponse<ProductoStockBajo[]>> {
    return this.http.post<ApiResponse<ProductoStockBajo[]>>(`${this.apiUrl}/stock/verificar-alertas`, {});
  }

  // Obtener productos con stock bajo
  getProductosStockBajo(): Observable<ApiResponse<ProductoStockBajo[]>> {
    return this.http.get<ApiResponse<ProductoStockBajo[]>>(`${this.apiUrl}/stock/bajo`);
  }
}
