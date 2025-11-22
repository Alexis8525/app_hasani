import { Injectable, inject, PLATFORM_ID } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { tap } from 'rxjs/operators';
import { Router } from '@angular/router';
import { environment } from '../../../environments/environment';

@Injectable({
  providedIn: 'root'
})
export class AuthService {
  private http = inject(HttpClient);
  private platformId = inject(PLATFORM_ID);
  private apiUrl = `${environment.apiUrl}/auth`; // << CORREGIDO
  private router = inject(Router);

  login(email: string, password: string, deviceInfo?: string, ipAddress?: string, lat?: number, lng?: number): Observable<any> {
    return this.http.post<any>(`${this.apiUrl}/login`, {
      email,
      password,
      device_info: deviceInfo || (isPlatformBrowser(this.platformId) ? navigator.userAgent : ''),
      ip_address: ipAddress,
      lat,
      lng
    });
  }

  forceLogin(email: string, password: string, deviceInfo?: string, ipAddress?: string, lat?: number, lng?: number): Observable<any> {
    return this.http.post<any>(`${this.apiUrl}/force-login`, {
      email,
      password,
      device_info: deviceInfo || (isPlatformBrowser(this.platformId) ? navigator.userAgent : ''),
      ip_address: ipAddress,
      lat,
      lng
    });
  }

  verify2FA(tempToken: string, otp: string, deviceInfo?: string, ipAddress?: string, lat?: number, lng?: number): Observable<any> {
    return this.http.post<any>(`${this.apiUrl}/2fa/verify`, {
      tempToken,
      otp,
      device_info: deviceInfo || (isPlatformBrowser(this.platformId) ? navigator.userAgent : ''),
      ip_address: ipAddress,
      lat,
      lng
    });
  }

  verifyOffline(email: string, offlinePin: string, deviceInfo?: string, ipAddress?: string, lat?: number, lng?: number): Observable<any> {
    return this.http.post<any>(`${this.apiUrl}/verify-offline`, {
      email,
      offlinePin,
      device_info: deviceInfo || (isPlatformBrowser(this.platformId) ? navigator.userAgent : ''),
      ip_address: ipAddress,
      lat,
      lng
    });
  }

  logout(): Observable<any> {
    const token = this.getToken();

    return this.http.post(`${this.apiUrl}/logout`, {}, {
      headers: { 'Authorization': `Bearer ${token}` }
    }).pipe(
      tap(() => {
        this.clearAuthData();
        this.router.navigate(['/login']);
      })
    );
  }

  getActiveSessions(): Observable<any> {
    return this.http.get<any>(`${this.apiUrl}/sessions`);
  }

  logoutOtherSessions(): Observable<any> {
    return this.http.post(`${this.apiUrl}/sessions/logout-others`, {});
  }

  logoutSession(sessionId: number): Observable<any> {
    return this.http.delete(`${this.apiUrl}/sessions/${sessionId}`);
  }

  // Helper: obtener token de forma segura (SSR-aware)
  private getToken(): string | null {
    return isPlatformBrowser(this.platformId) ? localStorage.getItem('auth_token') : null;
  }

  // Helper: limpiar datos de autenticación de forma segura
  private clearAuthData(): void {
    if (isPlatformBrowser(this.platformId)) {
      localStorage.removeItem('auth_token');
      // ...puedes limpiar otras claves si es necesario...
    }
  }

  // resto igual...
}
