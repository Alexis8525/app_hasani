// services/bitacora.service.ts
import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

export interface Bitacora {
  id_movimiento: number;
  id_proveedor: number;
  cantidad: number;
  id_producto: number;
  tipo?: string;
  fecha?: Date;
  producto_nombre?: string;
  proveedor_nombre?: string;
}

export interface ApiResponse<T> {
  code: number;
  message: string;
  data?: T;
}

@Injectable({
  providedIn: 'root'
})
export class BitacoraService {
  private http = inject(HttpClient);
  private apiUrl = 'http://localhost:3000/api/bitacora';

  // Obtener todos los registros de bitácora
  getAll(): Observable<ApiResponse<Bitacora[]>> {
    return this.http.get<ApiResponse<Bitacora[]>>(this.apiUrl);
  }

  // Crear nuevo registro en bitácora
  create(bitacora: Bitacora): Observable<ApiResponse<Bitacora>> {
    return this.http.post<ApiResponse<Bitacora>>(this.apiUrl, bitacora);
  }

  // Buscar registros por movimiento
  getByMovimiento(movimientoId: number): Observable<ApiResponse<Bitacora[]>> {
    return this.http.post<ApiResponse<Bitacora[]>>(`${this.apiUrl}/movimiento`, { movimientoId });
  }

  // Buscar registros por proveedor
  getByProveedor(proveedorId: number): Observable<ApiResponse<Bitacora[]>> {
    return this.http.post<ApiResponse<Bitacora[]>>(`${this.apiUrl}/proveedor`, { proveedorId });
  }
}
