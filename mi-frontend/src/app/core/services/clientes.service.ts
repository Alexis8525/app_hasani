import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';

@Injectable({
  providedIn: 'root'
})
export class ClientesService {
  private http = inject(HttpClient);
  private apiUrl = `${environment.apiUrl}/clientes`;

  getAll(): Observable<any> {
    return this.http.get<any>(this.apiUrl);
  }

  getByNombre(nombre: string): Observable<any> {
    return this.http.post<any>(`${this.apiUrl}/nombre`, { nombre });
  }

  getByUserId(userId: number): Observable<any> {
    return this.http.post<any>(`${this.apiUrl}/user`, { userId });
  }

  create(cliente: any): Observable<any> {
    return this.http.post<any>(this.apiUrl, cliente);
  }

  update(nombre: string, cliente: any): Observable<any> {
    return this.http.put<any>(this.apiUrl, { nombre, ...cliente });
  }

  delete(nombre: string): Observable<any> {
    return this.http.delete<any>(this.apiUrl, { body: { nombre } });
  }
}
