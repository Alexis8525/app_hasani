// services/productos.service.ts
import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

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

export interface ApiResponse<T> {
  code: number;
  message: string;
  data?: T;
  total?: number;
  busquedaOriginal?: string;
}

export interface StockAlerta {
  id_producto: number;
  nombre: string;
  stock_actual: number;
  stock_minimo: number;
  diferencia: number;
  nivel_alerta: string;
}

@Injectable({
  providedIn: 'root'
})
export class ProductosService {
  private http = inject(HttpClient);
  private apiUrl = 'http://localhost:3000/api/productos';

  // Obtener todos los productos
  getAll(): Observable<ApiResponse<Producto[]>> {
    return this.http.get<ApiResponse<Producto[]>>(this.apiUrl);
  }

  // Buscar producto por nombre
  getByNombre(nombre: string): Observable<ApiResponse<Producto[]>> {
    return this.http.post<ApiResponse<Producto[]>>(`${this.apiUrl}/buscar`, { nombre });
  }

  // Crear nuevo producto
  create(producto: Omit<Producto, 'id_producto' | 'created_at' | 'updated_at' | 'nombre_proveedor'>): Observable<ApiResponse<Producto>> {
    return this.http.post<ApiResponse<Producto>>(this.apiUrl, producto);
  }

  // Actualizar producto
  update(nombre: string, producto: Partial<Omit<Producto, 'id_producto' | 'created_at' | 'updated_at' | 'nombre_proveedor'>>): Observable<ApiResponse<Producto>> {
    return this.http.put<ApiResponse<Producto>>(this.apiUrl, { nombre, ...producto });
  }

  // Eliminar producto
  delete(nombre: string): Observable<ApiResponse<void>> {
    return this.http.delete<ApiResponse<void>>(this.apiUrl, { body: { nombre } });
  }

  // Obtener productos con stock bajo
  getLowStock(): Observable<ApiResponse<Producto[]>> {
    return this.http.get<ApiResponse<Producto[]>>(`${this.apiUrl}/inventory/low-stock`);
  }

  // Verificar alertas de stock
  checkStockAlerts(): Observable<ApiResponse<StockAlerta[]>> {
    return this.http.get<ApiResponse<StockAlerta[]>>(`${this.apiUrl}/alertas-stock`);
  }
}
