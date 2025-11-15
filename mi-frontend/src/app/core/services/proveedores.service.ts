// services/proveedores.service.ts
import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

export interface Proveedor {
  id_proveedor: number;
  nombre: string;
  telefono?: string;
  contacto?: string;
}

export interface ApiResponse<T> {
  code: number;
  message: string;
  data?: T;
}

@Injectable({
  providedIn: 'root'
})
export class ProveedoresService {
  private http = inject(HttpClient);
  private apiUrl = 'http://localhost:3000/api/proveedores';

  // Obtener todos los proveedores
  getAll(): Observable<ApiResponse<Proveedor[]>> {
    return this.http.get<ApiResponse<Proveedor[]>>(this.apiUrl);
  }

  // Buscar proveedor por nombre
  getByNombre(nombre: string): Observable<ApiResponse<Proveedor[]>> {
    return this.http.post<ApiResponse<Proveedor[]>>(`${this.apiUrl}/buscar`, { nombre });
  }

  // Crear nuevo proveedor
  create(proveedor: Omit<Proveedor, 'id_proveedor'>): Observable<ApiResponse<Proveedor>> {
    return this.http.post<ApiResponse<Proveedor>>(this.apiUrl, proveedor);
  }

  // Actualizar proveedor
  update(nombre: string, proveedor: Partial<Omit<Proveedor, 'id_proveedor'>>): Observable<ApiResponse<Proveedor>> {
    return this.http.put<ApiResponse<Proveedor>>(this.apiUrl, { nombre, ...proveedor });
  }

  // Eliminar proveedor
  delete(nombre: string): Observable<ApiResponse<void>> {
    return this.http.delete<ApiResponse<void>>(this.apiUrl, { body: { nombre } });
  }
}