import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';

@Injectable({
  providedIn: 'root'
})
export class MovimientosService {
  private http = inject(HttpClient);
  private apiUrl = `${environment.apiUrl}/movimientos`;

  getAll(): Observable<any> {
    return this.http.get<any>(this.apiUrl);
  }

  getById(id: number): Observable<any> {
    return this.http.post<any>(`${this.apiUrl}/buscar`, { id });
  }

  create(movimiento: any): Observable<any> {
    return this.http.post<any>(this.apiUrl, movimiento);
  }

  getByProducto(nombreProducto: string): Observable<any> {
    return this.http.post<any>(`${this.apiUrl}/producto`, { nombreProducto });
  }

  getByDateRange(fechaInicio: string, fechaFin: string): Observable<any> {
    return this.http.post<any>(`${this.apiUrl}/report/date-range`, {
      fechaInicio,
      fechaFin
    });
  }

  verificarAlertasStock(): Observable<any> {
    return this.http.post<any>(`${this.apiUrl}/stock/verificar-alertas`, {});
  }

  getProductosStockBajo(): Observable<any> {
    return this.http.get<any>(`${this.apiUrl}/stock/bajo`);
  }
}
