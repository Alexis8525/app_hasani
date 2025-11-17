import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';

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
  private apiUrl = `${environment.apiUrl}/proveedores`;

  getAll(): Observable<ApiResponse<Proveedor[]>> {
    return this.http.get<ApiResponse<Proveedor[]>>(this.apiUrl);
  }

  getByNombre(nombre: string): Observable<ApiResponse<Proveedor[]>> {
    return this.http.post<ApiResponse<Proveedor[]>>(`${this.apiUrl}/buscar`, { nombre });
  }

  create(proveedor: Omit<Proveedor, 'id_proveedor'>): Observable<ApiResponse<Proveedor>> {
    return this.http.post<ApiResponse<Proveedor>>(this.apiUrl, proveedor);
  }

  update(nombre: string, proveedor: Partial<Omit<Proveedor, 'id_proveedor'>>): Observable<ApiResponse<Proveedor>> {
    return this.http.put<ApiResponse<Proveedor>>(this.apiUrl, { nombre, ...proveedor });
  }

  delete(nombre: string): Observable<ApiResponse<void>> {
    return this.http.delete<ApiResponse<void>>(this.apiUrl, { body: { nombre } });
  }
}
