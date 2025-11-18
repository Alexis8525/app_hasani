// login.component.ts
import { Component, inject } from '@angular/core';
import { Router } from '@angular/router';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { AuthService, LoginResponse, ActiveSession } from '../../core/services/auth.service';
import { TwoFactorComponent } from '../two-factor/two-factor.component';
import { environment } from '../../../environments/environment';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, TwoFactorComponent],
  templateUrl: './login.component.html',
  styleUrls: ['./login.component.css']
})
export class LoginComponent {
  private fb = inject(FormBuilder);
  private authService = inject(AuthService);
  private router = inject(Router);

  loginForm: FormGroup;
  isLoading = false;
  errorMessage = '';
  
  // Estados para el flujo de autenticación
  requires2FA = false;
  tempToken = '';
  offlinePin = '';
  userEmail = '';

  // Estados para manejo de sesiones activas
  showSessionConflict = false;
  activeSessions: ActiveSession[] = [];
  forceLoginLoading = false;

  constructor() {
    this.loginForm = this.fb.group({
      email: ['', [Validators.required, Validators.email]],
      password: ['', [Validators.required, Validators.minLength(6)]]
    });
  }

  onSubmit() {
    console.log('🔍 DEBUG - Iniciando login...');
    console.log('🔍 DEBUG - Backend URL:', environment.apiUrl);
    console.log('🔍 DEBUG - Environment production:', environment.production);
    
    if (this.loginForm.valid) {
      this.isLoading = true;
      this.errorMessage = '';
      this.userEmail = this.loginForm.value.email;

      // Debug: mostrar qué se está enviando
      console.log('🔍 DEBUG - Credenciales:', {
        email: this.loginForm.value.email,
        backend: `${environment.apiUrl}/auth/login`,
        timestamp: new Date().toISOString()
      });

      // Debug: verificar connectivity
      this.testBackendConnectivity();

      this.authService.login(
        this.loginForm.value.email,
        this.loginForm.value.password
      ).subscribe({
        next: (response: LoginResponse) => {
          console.log('🔍 DEBUG - Respuesta EXITOSA del backend:', response);
          this.isLoading = false;
          
          if (response.code === 'ACTIVE_SESSION_EXISTS') {
            console.log('🔍 DEBUG - Sesión activa detectada');
            this.handleActiveSession(response);
            return;
          }

          if (response.requires2fa) {
            console.log('🔍 DEBUG - Requiere 2FA');
            this.requires2FA = true;
            this.tempToken = response.tempToken!;
            this.offlinePin = response.offlinePin!;
          } 
          else if (response.token && response.user) {
            console.log('🔍 DEBUG - Login exitoso, redirigiendo...');
            this.handleSuccessfulLogin(response);
          } 
          else {
            console.warn('🔍 DEBUG - Respuesta inesperada:', response);
            this.errorMessage = response.message || 'Error inesperado en el login';
          }
        },
        error: (error: any) => {
          console.log('🔍 DEBUG - Error completo:', error);
          console.log('🔍 DEBUG - Status:', error.status);
          console.log('🔍 DEBUG - Status Text:', error.statusText);
          console.log('🔍 DEBUG - Error message:', error.message);
          console.log('🔍 DEBUG - Error name:', error.name);
          console.log('🔍 DEBUG - URL intentada:', error.url);
          console.log('🔍 DEBUG - Timestamp:', new Date().toISOString());
          
          this.isLoading = false;
          
          if (error.status === 0) {
            this.errorMessage = `No se puede conectar al backend en: ${environment.apiUrl}. 
            Posibles causas:
            - El backend no está funcionando
            - Error de CORS
            - Timeout de conexión`;
          } else if (error.status === 404) {
            this.errorMessage = `Endpoint no encontrado. Verifica que el backend tenga la ruta: ${environment.apiUrl}/auth/login`;
          } else if (error.status === 500) {
            this.errorMessage = 'Error interno del servidor. Revisa los logs del backend.';
          } else if (error.status === 401) {
            this.errorMessage = 'Credenciales incorrectas. Verifica tu email y contraseña.';
          } else {
            this.errorMessage = `Error ${error.status}: ${error.message || 'Error de conexión'}`;
          }
          
          console.error('Login error:', error);
        }
      });
    } else {
      console.log('🔍 DEBUG - Formulario inválido');
      this.markFormGroupTouched();
    }
  }

  // Método para probar conectividad con el backend
  private testBackendConnectivity() {
    console.log('🔍 DEBUG - Probando conectividad con el backend...');
    
    // Intentar hacer un health check simple
    fetch(`${environment.apiUrl.replace('/api', '')}/health`)
      .then(response => {
        console.log('🔍 DEBUG - Health check status:', response.status);
        return response.text();
      })
      .then(data => {
        console.log('🔍 DEBUG - Health check response:', data);
      })
      .catch(err => {
        console.log('🔍 DEBUG - Health check FAILED:', err);
      });
  }

  // Marcar todos los campos como touched para mostrar errores
  private markFormGroupTouched() {
    Object.keys(this.loginForm.controls).forEach(key => {
      const control = this.loginForm.get(key);
      control?.markAsTouched();
    });
  }

  // Manejar sesión activa existente
  private handleActiveSession(response: LoginResponse) {
    this.showSessionConflict = true;
    
    console.log('🔍 DEBUG - Cargando sesiones activas...');
    
    // Cargar sesiones activas para mostrar información
    this.authService.getActiveSessions().subscribe({
      next: (sessionsResponse) => {
        console.log('🔍 DEBUG - Sesiones activas cargadas:', sessionsResponse);
        this.activeSessions = sessionsResponse.sessions;
      },
      error: (error) => {
        console.error('🔍 DEBUG - Error cargando sesiones activas:', error);
        // Si falla, mostrar mensaje genérico
        this.activeSessions = [{
          id: 1,
          device_info: 'Dispositivo desconocido',
          ip_address: 'IP no disponible',
          created_at: new Date().toISOString(),
          last_activity: new Date().toISOString(),
          expires_at: new Date(Date.now() + 3600000).toISOString()
        }];
      }
    });
  }

  // Forzar login cerrando sesiones anteriores
  forceLogin() {
    console.log('🔍 DEBUG - Forzando login...');
    
    this.forceLoginLoading = true;
    this.errorMessage = '';

    this.authService.forceLogin(
      this.loginForm.value.email,
      this.loginForm.value.password
    ).subscribe({
      next: (response: LoginResponse) => {
        console.log('🔍 DEBUG - Force login response:', response);
        this.forceLoginLoading = false;
        
        if (response.requires2fa) {
          this.showSessionConflict = false;
          this.requires2FA = true;
          this.tempToken = response.tempToken!;
          this.offlinePin = response.offlinePin!;
        } 
        else if (response.token && response.user) {
          this.handleSuccessfulLogin(response);
        } 
        else {
          this.errorMessage = response.message || 'Error inesperado en el login forzado';
        }
      },
      error: (error: any) => {
        console.error('🔍 DEBUG - Force login error:', error);
        this.forceLoginLoading = false;
        this.errorMessage = error.error?.message || 'Error en login forzado';
      }
    });
  }

  // Cancelar y volver al formulario normal
  cancelForceLogin() {
    console.log('🔍 DEBUG - Cancelando force login');
    this.showSessionConflict = false;
    this.activeSessions = [];
  }

  onVerify2FA(data: {tempToken: string, otp: string}) {
    console.log('🔍 DEBUG - Verificando 2FA...');
    
    this.isLoading = true;
    this.errorMessage = '';

    this.authService.verify2FA(data.tempToken, data.otp).subscribe({
      next: (response) => {
        console.log('🔍 DEBUG - 2FA verification success:', response);
        this.isLoading = false;
        this.handleSuccessfulLogin(response);
      },
      error: (error: any) => {
        console.error('🔍 DEBUG - 2FA verification error:', error);
        this.isLoading = false;
        this.errorMessage = error.error?.message || 'Error verificando el código 2FA';
      }
    });
  }

  onVerifyOffline(data: {email: string, offlinePin: string}) {
    console.log('🔍 DEBUG - Verificando PIN offline...');
    
    this.isLoading = true;
    this.errorMessage = '';

    this.authService.verifyOffline(data.email, data.offlinePin).subscribe({
      next: (response) => {
        console.log('🔍 DEBUG - Offline verification success:', response);
        this.isLoading = false;
        this.handleSuccessfulLogin(response);
      },
      error: (error: any) => {
        console.error('🔍 DEBUG - Offline verification error:', error);
        this.isLoading = false;
        this.errorMessage = error.error?.message || 'Error verificando el PIN offline';
      }
    });
  }

  private handleSuccessfulLogin(response: any) {
    console.log('🔍 DEBUG - Procesando login exitoso...');
    
    if (response.token) {
      this.authService.saveToken(response.token);
      console.log('🔍 DEBUG - Token guardado');
    }
    if (response.user) {
      this.authService.saveUserToStorage(response.user);
      console.log('🔍 DEBUG - Usuario guardado:', response.user);
    }
    
    console.log('🔍 DEBUG - Redirigiendo a dashboard...');
    this.router.navigate(['/dashboard']);
  }

  onGoBack() {
    console.log('🔍 DEBUG - Volviendo al formulario principal');
    this.requires2FA = false;
    this.tempToken = '';
    this.offlinePin = '';
    this.errorMessage = '';
    this.showSessionConflict = false;
    this.activeSessions = [];
  }

  // Método para probar manualmente la conexión
  testConnection() {
    console.log('🔍 DEBUG - Test manual de conexión');
    this.testBackendConnectivity();
    
    // También probar el endpoint específico de auth
    fetch(`${environment.apiUrl}/auth/login`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        email: 'test@test.com',
        password: 'test123'
      })
    })
    .then(response => {
      console.log('🔍 DEBUG - Test auth endpoint status:', response.status);
      return response.text();
    })
    .then(data => {
      console.log('🔍 DEBUG - Test auth endpoint response:', data);
    })
    .catch(err => {
      console.log('🔍 DEBUG - Test auth endpoint FAILED:', err);
    });
  }
}