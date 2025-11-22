// login.component.ts - VERSION COMPLETA ACTUALIZADA
import { Component, inject } from '@angular/core';
import { Router, RouterModule } from '@angular/router';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { AuthService, LoginResponse, ActiveSession } from '../../core/services/auth.service';
import { TwoFactorComponent } from '../two-factor/two-factor.component';
import { environment } from '../../../environments/environment';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, TwoFactorComponent,RouterModule],
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
  successMessage = '';
  
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
    console.log('🚀 INICIANDO LOGIN CON RUTAS DE PRUEBA');
    console.log('🔍 Environment production:', environment.production);
    
    if (this.loginForm.valid) {
      this.isLoading = true;
      this.errorMessage = '';
      this.successMessage = '';
      this.userEmail = this.loginForm.value.email;

      console.log('📧 Credenciales:', this.loginForm.value.email);
      console.log('🌐 Backend URL: https://back-hasani.onrender.com/api/auth/test-login-simple');

      this.authService.login(
        this.loginForm.value.email,
        this.loginForm.value.password
      ).subscribe({
        next: (response: LoginResponse) => {
          console.log('✅ LOGIN EXITOSO:', response);
          this.isLoading = false;
          
          if (response.code === 'ACTIVE_SESSION_EXISTS') {
            console.log('🔍 Sesión activa detectada');
            this.handleActiveSession(response);
            return;
          }

          if (response.requires2fa) {
            console.log('🔍 Requiere 2FA');
            this.requires2FA = true;
            this.tempToken = response.tempToken!;
            this.offlinePin = response.offlinePin!;
          } 
          else if (response.token && response.user) {
            console.log('🎉 Login exitoso, redirigiendo...');
            this.handleSuccessfulLogin(response);
          } 
          else {
            console.warn('⚠️ Respuesta inesperada:', response);
            this.errorMessage = response.message || 'Error inesperado en el login';
          }
        },
        error: (error: any) => {
          console.log('❌ ERROR EN LOGIN:', error);
          console.log('🔍 Status:', error.status);
          console.log('🔍 Status Text:', error.statusText);
          console.log('🔍 Error message:', error.message);
          console.log('🔍 URL intentada:', error.url);
          
          this.isLoading = false;
          
          if (error.status === 0) {
            this.errorMessage = `No se puede conectar al backend. Verifica que esté funcionando.`;
          } else if (error.status === 404) {
            this.errorMessage = `Endpoint no encontrado. El backend no tiene la ruta solicitada.`;
          } else if (error.status === 500) {
            this.errorMessage = 'Error interno del servidor. Revisa los logs del backend.';
          } else if (error.status === 401) {
            this.errorMessage = 'Credenciales incorrectas. Verifica tu email y contraseña.';
          } else {
            this.errorMessage = `Error ${error.status}: ${error.message || 'Error de conexión'}`;
          }
        }
      });
    } else {
      console.log('⚠️ Formulario inválido');
      this.markFormGroupTouched();
    }
  }

  // 🔥 NUEVOS MÉTODOS DE DEBUG
  testBackendConnection() {
    console.log('🔍 Probando conexión al backend...');
    
    this.authService.testBackendConnection().subscribe({
      next: (response) => {
        console.log('✅ Backend RESPONDE:', response);
        this.successMessage = '✅ Backend funcionando correctamente!';
        this.clearMessagesAfterDelay();
      },
      error: (error) => {
        console.log('❌ Backend NO RESPONDE:', error);
        this.errorMessage = '❌ Error conectando al backend: ' + error.message;
        this.clearMessagesAfterDelay();
      }
    });
  }

  testDebugEndpoint() {
    console.log('🔍 Probando endpoint debug...');
    
    this.authService.debugRequest({
      test: 'debug desde frontend',
      timestamp: new Date().toISOString(),
      userAgent: navigator.userAgent,
      location: window.location.href
    }).subscribe({
      next: (response) => {
        console.log('✅ Debug endpoint funciona:', response);
        this.successMessage = '✅ Debug endpoint funcionando!';
        this.clearMessagesAfterDelay();
      },
      error: (error) => {
        console.log('❌ Debug endpoint falla:', error);
        this.errorMessage = '❌ Debug endpoint error: ' + error.message;
        this.clearMessagesAfterDelay();
      }
    });
  }

  testAllEndpoints() {
    console.log('🧪 Probando todos los endpoints...');
    
    // Probar health check
    fetch('https://back-hasani.onrender.com/health')
      .then(r => r.json())
      .then(result => console.log('✅ Health check:', result))
      .catch(err => console.log('❌ Health check error:', err));

    // Probar auth test
    fetch('https://back-hasani.onrender.com/api/auth/test')
      .then(r => r.json())
      .then(result => console.log('✅ Auth test:', result))
      .catch(err => console.log('❌ Auth test error:', err));

    // Probar login simple
    fetch('https://back-hasani.onrender.com/api/auth/test-login-simple', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'test@test.com', password: 'test' })
    })
    .then(r => r.json())
    .then(result => console.log('✅ Login simple:', result))
    .catch(err => console.log('❌ Login simple error:', err));
  }

  // Método para probar conectividad con el backend
  private testBackendConnectivity() {
    console.log('🔍 Probando conectividad con el backend...');
    
    fetch('https://back-hasani.onrender.com/health')
      .then(response => {
        console.log('🔍 Health check status:', response.status);
        return response.text();
      })
      .then(data => {
        console.log('🔍 Health check response:', data);
      })
      .catch(err => {
        console.log('🔍 Health check FAILED:', err);
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
    
    console.log('🔍 Cargando sesiones activas...');
    
    this.authService.getActiveSessions().subscribe({
      next: (sessionsResponse) => {
        console.log('✅ Sesiones activas cargadas:', sessionsResponse);
        this.activeSessions = sessionsResponse.sessions;
      },
      error: (error) => {
        console.error('❌ Error cargando sesiones activas:', error);
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
    console.log('🔍 Forzando login...');
    
    this.forceLoginLoading = true;
    this.errorMessage = '';

    this.authService.forceLogin(
      this.loginForm.value.email,
      this.loginForm.value.password
    ).subscribe({
      next: (response: LoginResponse) => {
        console.log('✅ Force login response:', response);
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
        console.error('❌ Force login error:', error);
        this.forceLoginLoading = false;
        this.errorMessage = error.error?.message || 'Error en login forzado';
      }
    });
  }

  // Cancelar y volver al formulario normal
  cancelForceLogin() {
    console.log('🔍 Cancelando force login');
    this.showSessionConflict = false;
    this.activeSessions = [];
  }

  onVerify2FA(data: {tempToken: string, otp: string}) {
    console.log('🔍 Verificando 2FA...');
    
    this.isLoading = true;
    this.errorMessage = '';

    this.authService.verify2FA(data.tempToken, data.otp).subscribe({
      next: (response) => {
        console.log('✅ 2FA verification success:', response);
        this.isLoading = false;
        this.handleSuccessfulLogin(response);
      },
      error: (error: any) => {
        console.error('❌ 2FA verification error:', error);
        this.isLoading = false;
        this.errorMessage = error.error?.message || 'Error verificando el código 2FA';
      }
    });
  }

  onVerifyOffline(data: {email: string, offlinePin: string}) {
    console.log('🔍 Verificando PIN offline...');
    
    this.isLoading = true;
    this.errorMessage = '';

    this.authService.verifyOffline(data.email, data.offlinePin).subscribe({
      next: (response) => {
        console.log('✅ Offline verification success:', response);
        this.isLoading = false;
        this.handleSuccessfulLogin(response);
      },
      error: (error: any) => {
        console.error('❌ Offline verification error:', error);
        this.isLoading = false;
        this.errorMessage = error.error?.message || 'Error verificando el PIN offline';
      }
    });
  }

  private handleSuccessfulLogin(response: any) {
    console.log('🎉 Procesando login exitoso...');
    
    if (response.token) {
      this.authService.saveToken(response.token);
      console.log('✅ Token guardado');
    }
    if (response.user) {
      this.authService.saveUserToStorage(response.user);
      console.log('✅ Usuario guardado:', response.user);
    }
    
    console.log('🔄 Redirigiendo a dashboard...');
    this.router.navigate(['/dashboard']);
  }

  onGoBack() {
    console.log('🔙 Volviendo al formulario principal');
    this.requires2FA = false;
    this.tempToken = '';
    this.offlinePin = '';
    this.errorMessage = '';
    this.successMessage = '';
    this.showSessionConflict = false;
    this.activeSessions = [];
  }

  // Método para probar manualmente la conexión
  testConnection() {
    console.log('🔍 Test manual de conexión');
    this.testBackendConnectivity();
  }

  private clearMessagesAfterDelay() {
    setTimeout(() => {
      this.errorMessage = '';
      this.successMessage = '';
    }, 5000);
  }

  // Verificar el estado actual del environment
  checkEnvironment() {
    console.log('🔍 Environment actual:', environment);
    console.log('🔍 API URL:', environment.apiUrl);
    console.log('🔍 Production:', environment.production);
    this.successMessage = `Environment: ${environment.production ? 'PRODUCCIÓN' : 'DESARROLLO'} - URL: ${environment.apiUrl}`;
    this.clearMessagesAfterDelay();
  }
}