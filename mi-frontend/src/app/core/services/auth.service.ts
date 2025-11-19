// auth.service.ts - VERSION COMPLETA COMPATIBLE CON RUTAS DE PRUEBA
import { Injectable, inject, PLATFORM_ID } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { Observable, tap } from 'rxjs';
import { Router } from '@angular/router';

export interface LoginResponse {
  code?: number;
  message: string;
  requires2fa?: boolean;
  tempToken?: string;
  offlinePin?: string;
  token?: string;
  user?: {
    id: number;
    email: string;
    name?: string;
    role: string;
  };
  session?: {
    id: number;
    created_at: string;
    expires_at: string;
  };
}

@Injectable({
  providedIn: 'root'
})
export class AuthService {
  private http = inject(HttpClient);
  private platformId = inject(PLATFORM_ID);
  private router = inject(Router);

  // 🔥 Backend
  private apiUrl = 'https://back-hasani.onrender.com/api/auth';

  // -----------------------------------------------------------------------
  // 🧪 LOGIN DE PRUEBA PARA TU BACKEND (test-login-simple)
  // -----------------------------------------------------------------------
  loginTest(email: string, password: string): Observable<LoginResponse> {
    const url = `${this.apiUrl}/test-login-simple`;

    console.log('🚀 LOGIN TEST URL:', url);

    return this.http.post<LoginResponse>(url, {
      email,
      password
    });
  }

  // -----------------------------------------------------------------------
  // 🔥 LOGIN NORMAL (ruta real)
  // -----------------------------------------------------------------------
  login(
    email: string,
    password: string,
    deviceInfo?: string,
    ipAddress?: string,
    lat?: number,
    lng?: number
  ): Observable<LoginResponse> {
    const url = `${this.apiUrl}/login`;
    console.log('🚀 LOGIN URL:', url);

    return this.http.post<LoginResponse>(url, {
      email,
      password,
      device_info: deviceInfo || (isPlatformBrowser(this.platformId) ? navigator.userAgent : ''),
      ip_address: ipAddress,
      lat,
      lng
    });
  }

  // -----------------------------------------------------------------------
  // 🧪 FORCE LOGIN (pruebas)
  // -----------------------------------------------------------------------
  forceLoginTest(email: string, password: string): Observable<LoginResponse> {
    const url = `${this.apiUrl}/test-login-force`;
    console.log('🚀 FORCE LOGIN TEST URL:', url);

    return this.http.post<LoginResponse>(url, {
      email,
      password
    });
  }

  // -----------------------------------------------------------------------
  // 🔥 2FA REAL
  // -----------------------------------------------------------------------
  verify2FA(tempToken: string, otp: string): Observable<any> {
    return this.http.post(`${this.apiUrl}/2fa/verify`, {
      tempToken,
      otp
    });
  }

  // -----------------------------------------------------------------------
  // UTILIDADES
  // -----------------------------------------------------------------------
  saveToken(token: string): void {
    if (isPlatformBrowser(this.platformId)) {
      localStorage.setItem('auth_token', token);
    }
  }

  saveUser(user: any): void {
    if (isPlatformBrowser(this.platformId)) {
      localStorage.setItem('user', JSON.stringify(user));
    }
  }

  logout(): void {
    this.clearAuthData();
    this.router.navigate(['/login']);
  }

  clearAuthData(): void {
    localStorage.removeItem('auth_token');
    localStorage.removeItem('user');
  }

  getToken(): string | null {
    return isPlatformBrowser(this.platformId)
      ? localStorage.getItem('auth_token')
      : null;
  }

  isLoggedIn(): boolean {
    return !!this.getToken();
  }
}
