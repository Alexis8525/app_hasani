// auth.service.ts - VERSION CORREGIDA
import { Injectable, inject, PLATFORM_ID } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { Observable, tap } from 'rxjs';
import { Router } from '@angular/router';

export interface LoginResponse {
  message: string;
  requires2fa?: boolean;
  tempToken?: string;
  offlinePin?: string;
  token?: string;
  user?: {
    id: number;
    email: string;
    role: string;
  };
  session?: {
    id: number;
    created_at: string;
    expires_at: string;
  };
  code?: string;
  existing_session?: any;
}

export interface Verify2FAResponse {
  message: string;
  token: string;
  user: {
    id: number;
    email: string;
    role: string;
  };
  session: {
    id: number;
    created_at: string;
    expires_at: string;
  };
}

export interface ActiveSession {
  id: number;
  device_info: string;
  ip_address: string;
  created_at: string;
  last_activity: string;
  expires_at: string;
  location?: {
    lat: number;
    lng: number;
  };
}

@Injectable({
  providedIn: 'root'
})
export class AuthService {
  private http = inject(HttpClient);
  private platformId = inject(PLATFORM_ID);
  private router = inject(Router);

  // 🔥🔥🔥 SOLUCIÓN DEFINITIVA - URL FIJA DE PRODUCCIÓN
  private apiUrl = 'https://back-hasani.onrender.com/api/auth';

  login(
    email: string,
    password: string,
    deviceInfo?: string,
    ipAddress?: string,
    lat?: number,
    lng?: number
  ): Observable<LoginResponse> {
    console.log('🚀 URL REAL del backend:', this.apiUrl);
    console.log('📧 Email del login:', email);
    
    return this.http.post<LoginResponse>(`${this.apiUrl}/login`, {
      email,
      password,
      device_info: deviceInfo || (isPlatformBrowser(this.platformId) ? navigator.userAgent : ''),
      ip_address: ipAddress,
      lat,
      lng
    });
  }

  forceLogin(
    email: string,
    password: string,
    deviceInfo?: string,
    ipAddress?: string,
    lat?: number,
    lng?: number
  ): Observable<LoginResponse> {
    console.log('🚀 Force login - URL:', this.apiUrl);
    
    return this.http.post<LoginResponse>(`${this.apiUrl}/force-login`, {
      email,
      password,
      device_info: deviceInfo || (isPlatformBrowser(this.platformId) ? navigator.userAgent : ''),
      ip_address: ipAddress,
      lat,
      lng
    });
  }

  verify2FA(
    tempToken: string,
    otp: string,
    deviceInfo?: string,
    ipAddress?: string,
    lat?: number,
    lng?: number
  ): Observable<Verify2FAResponse> {
    console.log('🚀 2FA verification - URL:', this.apiUrl);
    
    return this.http.post<Verify2FAResponse>(`${this.apiUrl}/2fa/verify`, {
      tempToken,
      otp,
      device_info: deviceInfo || (isPlatformBrowser(this.platformId) ? navigator.userAgent : ''),
      ip_address: ipAddress,
      lat,
      lng
    });
  }

  verifyOffline(
    email: string,
    offlinePin: string,
    deviceInfo?: string,
    ipAddress?: string,
    lat?: number,
    lng?: number
  ): Observable<Verify2FAResponse> {
    console.log('🚀 Offline verification - URL:', this.apiUrl);
    
    return this.http.post<Verify2FAResponse>(`${this.apiUrl}/verify-offline`, {
      email,
      offlinePin,
      device_info: deviceInfo || (isPlatformBrowser(this.platformId) ? navigator.userAgent : ''),
      ip_address: ipAddress,
      lat,
      lng
    });
  }

  saveUserToStorage(user: any): void {
    if (isPlatformBrowser(this.platformId)) {
      localStorage.setItem('user', JSON.stringify(user));
      console.log('✅ Usuario guardado en localStorage');
    }
  }

  saveToken(token: string): void {
    if (isPlatformBrowser(this.platformId)) {
      localStorage.setItem('auth_token', token);
      console.log('✅ Token guardado en localStorage');
    }
  }

  loadUserFromStorage(): any {
    if (isPlatformBrowser(this.platformId)) {
      const user = localStorage.getItem('user');
      return user ? JSON.parse(user) : null;
    }
    return null;
  }

  logout(): Observable<any> {
    const token = this.getToken();

    return this.http.post(`${this.apiUrl}/logout`, {}, {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    }).pipe(
      tap(() => {
        this.clearAuthData();
        this.router.navigate(['/login']);
      })
    );
  }

  clearAuthData(): void {
    if (isPlatformBrowser(this.platformId)) {
      localStorage.removeItem('auth_token');
      localStorage.removeItem('user');
      localStorage.removeItem('user_data');
      console.log('✅ Datos de autenticación limpiados');
    }
  }

  forceLogout(): void {
    this.clearAuthData();
    this.router.navigate(['/login']);
  }

  getActiveSessions(): Observable<{ sessions: ActiveSession[], total: number }> {
    return this.http.get<{ sessions: ActiveSession[], total: number }>(`${this.apiUrl}/sessions`);
  }

  logoutOtherSessions(): Observable<any> {
    return this.http.post(`${this.apiUrl}/sessions/logout-others`, {});
  }

  logoutSession(sessionId: number): Observable<any> {
    return this.http.delete(`${this.apiUrl}/sessions/${sessionId}`);
  }

  isAuthenticated(): boolean {
    if (isPlatformBrowser(this.platformId)) {
      const token = localStorage.getItem('auth_token');
      const user = localStorage.getItem('user');
      const isAuth = !!(token && user && !this.isTokenExpired());
      console.log('🔐 Estado autenticación:', isAuth);
      return isAuth;
    }
    return false;
  }

  private isTokenExpired(): boolean {
    const token = this.getToken();
    if (!token) return true;

    try {
      const payload = JSON.parse(atob(token.split('.')[1]));
      const isExpired = Date.now() >= payload.exp * 1000;
      if (isExpired) {
        console.log('⚠️ Token expirado');
      }
      return isExpired;
    } catch {
      console.log('⚠️ Error verificando token');
      return true;
    }
  }

  getToken(): string | null {
    if (isPlatformBrowser(this.platformId)) {
      return localStorage.getItem('auth_token');
    }
    return null;
  }

  isLoggedIn(): boolean {
    if (isPlatformBrowser(this.platformId)) {
      const isLogged = !!localStorage.getItem('user') && !!localStorage.getItem('auth_token');
      console.log('🔐 Usuario logueado:', isLogged);
      return isLogged;
    }
    return false;
  }

  getCurrentUser() {
    return this.loadUserFromStorage();
  }

  getCurrentUserRole(): string | null {
    const user = this.loadUserFromStorage();
    return user ? user.role : null;
  }

  // 🔥 MÉTODO PARA PROBAR LA CONEXIÓN AL BACKEND
  testBackendConnection(): Observable<any> {
    console.log('🔍 Probando conexión con:', this.apiUrl);
    return this.http.get('https://back-hasani.onrender.com/health');
  }
}