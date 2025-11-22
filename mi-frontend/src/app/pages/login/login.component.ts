import { Component, inject } from '@angular/core';
import { Router, RouterModule } from '@angular/router';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { AuthService, LoginResponse, ActiveSession } from '../../core/services/auth.service';
import { TwoFactorComponent } from '../two-factor/two-factor.component';

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
    if (this.loginForm.valid) {
      this.isLoading = true;
      this.errorMessage = '';
      this.userEmail = this.loginForm.value.email;
  
      this.authService.login(
        this.loginForm.value.email,
        this.loginForm.value.password
      ).subscribe({
        next: (response: LoginResponse) => {
          this.isLoading = false;
          
          if (response.code === 'ACTIVE_SESSION_EXISTS') {
            this.handleActiveSession(response);
            return;
          }
  
          if (response.requires2fa) {
            this.requires2FA = true;
            this.tempToken = response.tempToken!;
            this.offlinePin = response.offlinePin!;
          } 
          else if (response.token && response.user) {
            this.handleSuccessfulLogin(response);
          } 
          else {
            this.errorMessage = response.message || 'Error inesperado en el login';
          }
        },
        error: (error: any) => {
          this.isLoading = false;
          
          if (error.status === 0) {
            this.errorMessage = 'Error de conexión. Verifica tu internet.';
          } else if (error.status === 401) {
            this.errorMessage = 'Credenciales incorrectas. Verifica tu email y contraseña.';
          } else if (error.status === 500) {
            this.errorMessage = 'Error del servidor. Intenta nuevamente.';
          } else {
            this.errorMessage = error.error?.message || 'Error de conexión';
          }
          
          console.error('Login error:', error);
        }
      });
    }
  }

  // Manejar sesión activa existente
  private handleActiveSession(response: LoginResponse) {
    this.showSessionConflict = true;
    
    // Cargar sesiones activas para mostrar información
    this.authService.getActiveSessions().subscribe({
      next: (sessionsResponse) => {
        this.activeSessions = sessionsResponse.sessions;
      },
      error: (error) => {
        console.error('Error cargando sesiones activas:', error);
      }
    });
  }

  // Forzar login cerrando sesiones anteriores
  forceLogin() {
    this.forceLoginLoading = true;
    this.errorMessage = '';

    this.authService.forceLogin(
      this.loginForm.value.email,
      this.loginForm.value.password
    ).subscribe({
      next: (response: LoginResponse) => {
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
        this.forceLoginLoading = false;
        this.errorMessage = error.error?.message || 'Error en login forzado';
        console.error('Force login error:', error);
      }
    });
  }

  // Cancelar y volver al formulario normal
  cancelForceLogin() {
    this.showSessionConflict = false;
    this.activeSessions = [];
  }

  onVerify2FA(data: {tempToken: string, otp: string}) {
    this.isLoading = true;
    this.errorMessage = '';

    this.authService.verify2FA(data.tempToken, data.otp).subscribe({
      next: (response) => {
        this.isLoading = false;
        this.handleSuccessfulLogin(response);
      },
      error: (error: any) => {
        this.isLoading = false;
        this.errorMessage = error.error?.message || 'Error verificando el código 2FA';
        console.error('2FA verification error:', error);
      }
    });
  }

  onVerifyOffline(data: {email: string, offlinePin: string}) {
    this.isLoading = true;
    this.errorMessage = '';

    this.authService.verifyOffline(data.email, data.offlinePin).subscribe({
      next: (response) => {
        this.isLoading = false;
        this.handleSuccessfulLogin(response);
      },
      error: (error: any) => {
        this.isLoading = false;
        this.errorMessage = error.error?.message || 'Error verificando el PIN offline';
        console.error('Offline verification error:', error);
      }
    });
  }

  private handleSuccessfulLogin(response: any) {
    if (response.token) {
      this.authService.saveToken(response.token);
    }
    if (response.user) {
      this.authService.saveUserToStorage(response.user);
    }
    
    this.router.navigate(['/dashboard']);
  }

  onGoBack() {
    this.requires2FA = false;
    this.tempToken = '';
    this.offlinePin = '';
    this.errorMessage = '';
    this.showSessionConflict = false;
    this.activeSessions = [];
  }
}
