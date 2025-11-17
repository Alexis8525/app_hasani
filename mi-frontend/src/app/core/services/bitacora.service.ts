import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';

@Injectable({
  providedIn: 'root'
})
export class BitacoraService {
  private http = inject(HttpClient);
  private apiUrl = `${environment.apiUrl}/bitacora`;

  getAll(): Observable<any> {
    return this.http.get<any>(this.apiUrl);
  }

  create(bitacora: any): Observable<any> {
    return this.http.post<any>(this.apiUrl, bitacora);
  }

  getByMovimiento(movimientoId: number): Observable<any> {
    return this.http.post<any>(`${this.apiUrl}/movimiento`, { movimientoId });
  }

  getByProveedor(proveedorId: number): Observable<any> {
    return this.http.post<any>(`${this.apiUrl}/proveedor`, { proveedorId });
  }
}
