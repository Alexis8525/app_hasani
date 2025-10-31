// auth.service.ts
import { Injectable, inject, PLATFORM_ID } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

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

@Injectable({
  providedIn: 'root'
})
export class AuthService {
  private http = inject(HttpClient);
  private platformId = inject(PLATFORM_ID);
  private apiUrl = 'http://localhost:3000/api/auth';

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

  getToken(): string | null {
    if (isPlatformBrowser(this.platformId)) {
      return localStorage.getItem('auth_token');
    }
    return null;
  }

  loadUserFromStorage(): any {
    if (isPlatformBrowser(this.platformId)) {
      const user = localStorage.getItem('user');
      return user ? JSON.parse(user) : null;
    }
    return null;
  }

  logout(): void {
    if (isPlatformBrowser(this.platformId)) {
      localStorage.removeItem('user');
      localStorage.removeItem('auth_token');
    }
  }

  isLoggedIn(): boolean {
    if (isPlatformBrowser(this.platformId)) {
      return !!localStorage.getItem('user') && !!localStorage.getItem('auth_token');
    }
    return false;
  }

  isAuthenticated(): boolean {
    return this.isLoggedIn() && !this.isTokenExpired();
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
