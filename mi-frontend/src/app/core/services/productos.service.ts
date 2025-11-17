import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';

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

export interface SearchCriteria {
  termino?: string;
  codigo?: string;
  categoria?: string;
  nombre?: string;
}

@Injectable({
  providedIn: 'root'
})
export class ProductosService {
  private http = inject(HttpClient);
  private apiUrl = `${environment.apiUrl}/productos`;

  getAll(): Observable<ApiResponse<Producto[]>> {
    return this.http.get<ApiResponse<Producto[]>>(this.apiUrl);
  }

  getByNombre(nombre: string): Observable<ApiResponse<Producto[]>> {
    return this.http.post<ApiResponse<Producto[]>>(`${this.apiUrl}/buscar`, { nombre });
  }

  searchAdvanced(criteria: SearchCriteria): Observable<ApiResponse<Producto[]>> {
    return this.http.post<ApiResponse<Producto[]>>(`${this.apiUrl}/buscar-avanzado`, criteria);
  }

  create(producto: Omit<Producto, 'id_producto' | 'created_at' | 'updated_at' | 'nombre_proveedor'>): Observable<ApiResponse<Producto>> {
    return this.http.post<ApiResponse<Producto>>(this.apiUrl, producto);
  }

  update(nombre: string, producto: Partial<Omit<Producto, 'id_producto' | 'created_at' | 'updated_at' | 'nombre_proveedor'>>): Observable<ApiResponse<Producto>> {
    return this.http.put<ApiResponse<Producto>>(this.apiUrl, { nombre, ...producto });
  }

  delete(nombre: string): Observable<ApiResponse<void>> {
    return this.http.delete<ApiResponse<void>>(this.apiUrl, { body: { nombre } });
  }

  getLowStock(): Observable<ApiResponse<Producto[]>> {
    return this.http.get<ApiResponse<Producto[]>>(`${this.apiUrl}/inventory/low-stock`);
  }

  checkStockAlerts(): Observable<ApiResponse<StockAlerta[]>> {
    return this.http.get<ApiResponse<StockAlerta[]>>(`${this.apiUrl}/alertas-stock`);
  }
}
