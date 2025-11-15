// services/clientes.service.ts
import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

export interface Cliente {
  id_cliente: number;
  id_user: number;
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
export class ClientesService {
  private http = inject(HttpClient);
  private apiUrl = 'http://localhost:3000/api/clientes';

  // Obtener todos los clientes
  getAll(): Observable<ApiResponse<Cliente[]>> {
    return this.http.get<ApiResponse<Cliente[]>>(this.apiUrl);
  }

  // Buscar cliente por nombre
  getByNombre(nombre: string): Observable<ApiResponse<Cliente[]>> {
    return this.http.post<ApiResponse<Cliente[]>>(`${this.apiUrl}/nombre`, { nombre });
  }

  // Obtener clientes por usuario
  getByUserId(userId: number): Observable<ApiResponse<Cliente[]>> {
    return this.http.post<ApiResponse<Cliente[]>>(`${this.apiUrl}/user`, { userId });
  }

  // Crear nuevo cliente
  create(cliente: Omit<Cliente, 'id_cliente'>): Observable<ApiResponse<Cliente>> {
    return this.http.post<ApiResponse<Cliente>>(this.apiUrl, cliente);
  }

  // Actualizar cliente
  update(nombre: string, cliente: Partial<Omit<Cliente, 'id_cliente'>>): Observable<ApiResponse<Cliente>> {
    return this.http.put<ApiResponse<Cliente>>(this.apiUrl, { nombre, ...cliente });
  }

  // Eliminar cliente
  delete(nombre: string): Observable<ApiResponse<void>> {
    return this.http.delete<ApiResponse<void>>(this.apiUrl, { body: { nombre } });
  }
}
