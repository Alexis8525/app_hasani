import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';

export interface Usuario {
  id: number;
  email: string;
  password?: string;
  created_at?: Date;
  role: string;
  phone: string;
  two_factor_enabled: boolean;
  offline_pin_secret?: string;
}

export interface OfflinePin {
  offline_pin: string;
  created_at: Date;
  expires_at: Date;
}

export interface PinResponse {
  offlinePin?: string;
  qrCodeUrl?: string;
  expiresAt?: Date;
}

export interface ApiResponse<T> {
  code: number;
  message: string;
  data?: T;
  user?: any;
  activePins?: OfflinePin[];
  totalActive?: number;
  offlinePin?: string;
  qrCodeUrl?: string;
  expiresAt?: Date;
}

@Injectable({
  providedIn: 'root'
})
export class UsuariosService {
  private http = inject(HttpClient);
  private apiUrl = `${environment.apiUrl}/users`;

  getAll(): Observable<Usuario[] | ApiResponse<Usuario[]>> {
    return this.http.get<Usuario[] | ApiResponse<Usuario[]>>(this.apiUrl);
  }

  create(usuario: Omit<Usuario, 'id' | 'created_at'>): Observable<ApiResponse<Usuario>> {
    return this.http.post<ApiResponse<Usuario>>(this.apiUrl, usuario);
  }

  update(email: string, usuario: Partial<Omit<Usuario, 'id' | 'created_at'>>): Observable<ApiResponse<Usuario>> {
    return this.http.put<ApiResponse<Usuario>>(`${this.apiUrl}/${email}`, usuario);
  }

  delete(email: string): Observable<ApiResponse<void>> {
    return this.http.delete<ApiResponse<void>>(`${this.apiUrl}/${email}`);
  }

  regenerateOfflinePin(email: string): Observable<ApiResponse<PinResponse>> {
    return this.http.post<ApiResponse<PinResponse>>(`${this.apiUrl}/regenerate-offline-pin`, { email });
  }

  generateOfflinePin(email: string): Observable<ApiResponse<PinResponse>> {
    return this.http.post<ApiResponse<PinResponse>>(`${this.apiUrl}/generate-offline-pin`, { email });
  }

  getActiveOfflinePins(email: string): Observable<ApiResponse<OfflinePin[]>> {
    return this.http.get<ApiResponse<OfflinePin[]>>(`${this.apiUrl}/${email}/active-offline-pins`);
  }

  revokeOfflinePin(email: string, pin: string): Observable<ApiResponse<void>> {
    return this.http.post<ApiResponse<void>>(`${this.apiUrl}/revoke-offline-pin`, { email, pin });
  }

  getQrCode(email: string, pin: string): Observable<any> {
    return this.http.get(`${this.apiUrl}/qr-code?email=${email}&pin=${pin}`);
  }
}
