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

export interface RegisterRequest {
  email: string;
  password: string;
  role: string;
  phone: string;
  nombre?: string; // Nuevo campo opcional
}

export interface RegisterResponse {
  message: string;
  user: {
    id: number;
    email: string;
    role: string;
    phone: string;
    created_at: string;
  };
  offlinePin: string;
  qrCodeUrl: string;
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
  private apiUrl = 'http://localhost:3000/api/auth';
  private router = inject(Router);

  register(userData: RegisterRequest): Observable<RegisterResponse> {
    return this.http.post<RegisterResponse>(`${this.apiUrl}/register`, userData);
  }

  login(email: string, password: string, deviceInfo?: string, ipAddress?: string, lat?: number, lng?: number): Observable<LoginResponse> {
    return this.http.post<LoginResponse>(`${this.apiUrl}/login`, {
      email,
      password,
      device_info: deviceInfo || (isPlatformBrowser(this.platformId) ? navigator.userAgent : ''),
      ip_address: ipAddress,
      lat,
      lng
    });
  }

  // Nuevo método para forzar login destruyendo sesiones anteriores
  forceLogin(email: string, password: string, deviceInfo?: string, ipAddress?: string, lat?: number, lng?: number): Observable<LoginResponse> {
    return this.http.post<LoginResponse>(`${this.apiUrl}/force-login`, {
      email,
      password,
      device_info: deviceInfo || (isPlatformBrowser(this.platformId) ? navigator.userAgent : ''),
      ip_address: ipAddress,
      lat,
      lng
    });
  }

  verify2FA(tempToken: string, otp: string, deviceInfo?: string, ipAddress?: string, lat?: number, lng?: number): Observable<Verify2FAResponse> {
    return this.http.post<Verify2FAResponse>(`${this.apiUrl}/2fa/verify`, {
      tempToken,
      otp,
      device_info: deviceInfo || (isPlatformBrowser(this.platformId) ? navigator.userAgent : ''),
      ip_address: ipAddress,
      lat,
      lng
    });
  }

  verifyOffline(email: string, offlinePin: string, deviceInfo?: string, ipAddress?: string, lat?: number, lng?: number): Observable<Verify2FAResponse> {
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
    }
  }

  saveToken(token: string): void {
    if (isPlatformBrowser(this.platformId)) {
      localStorage.setItem('auth_token', token);
    }
  }

  loadUserFromStorage(): any {
    if (isPlatformBrowser(this.platformId)) {
      const user = localStorage.getItem('user');
      return user ? JSON.parse(user) : null;
    }
    return null;
  }

  // Logout mejorado que elimina la sesión del backend
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
    }
  }

  // Método para logout forzado (sin llamar al backend)
  forceLogout(): void {
    this.clearAuthData();
    this.router.navigate(['/login']);
  }

  // Obtener sesiones activas
  getActiveSessions(): Observable<{ sessions: ActiveSession[], total: number }> {
    return this.http.get<{ sessions: ActiveSession[], total: number }>(`${this.apiUrl}/sessions`);
  }

  // Cerrar otras sesiones
  logoutOtherSessions(): Observable<any> {
    return this.http.post(`${this.apiUrl}/sessions/logout-others`, {});
  }

  // Cerrar sesión específica
  logoutSession(sessionId: number): Observable<any> {
    return this.http.delete(`${this.apiUrl}/sessions/${sessionId}`);
  }

  // Verificar si el usuario está autenticado
  isAuthenticated(): boolean {
    if (isPlatformBrowser(this.platformId)) {
      const token = localStorage.getItem('auth_token');
      const user = localStorage.getItem('user');
      return !!(token && user && !this.isTokenExpired());
    }
    return false;
  }

  // Verificar si el token está expirado
  private isTokenExpired(): boolean {
    const token = this.getToken();
    if (!token) return true;

    try {
      const payload = JSON.parse(atob(token.split('.')[1]));
      return Date.now() >= payload.exp * 1000;
    } catch {
      return true;
    }
  }

  // Obtener token
  getToken(): string | null {
    if (isPlatformBrowser(this.platformId)) {
      return localStorage.getItem('auth_token');
    }
    return null;
  }

  isLoggedIn(): boolean {
    if (isPlatformBrowser(this.platformId)) {
      return !!localStorage.getItem('user') && !!localStorage.getItem('auth_token');
    }
    return false;
  }

  // Obtener datos del usuario actual
  getCurrentUser() {
    return this.loadUserFromStorage();
  }

  // Obtener rol del usuario actual
  getCurrentUserRole(): string | null {
    const user = this.loadUserFromStorage();
    return user ? user.role : null;
  }
}
