// login.component.ts
import { Component, inject } from '@angular/core';
import { Router } from '@angular/router';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { AuthService, LoginResponse } from '../../core/services/auth.service';
import { TwoFactorComponent } from '../two-factor/two-factor.component';

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
            this.errorMessage = `
              Ya tienes una sesión activa. 
              Por seguridad, solo puedes tener una sesión a la vez.
              Cierra la sesión actual antes de iniciar una nueva.
            `;
            return;
          }
  
          if (response.requires2fa) {
            this.requires2FA = true;
            this.tempToken = response.tempToken!;
            this.offlinePin = response.offlinePin!;
            
            // Mostrar mensaje informativo
            console.log('2FA requerido. Token:', this.tempToken);
            console.log('PIN offline:', this.offlinePin);
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
          
          // Manejo específico de errores HTTP
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
    // Guardar token y datos de usuario usando los métodos existentes
    if (response.token) {
      this.authService.saveToken(response.token);
    }
    if (response.user) {
      this.authService.saveUserToStorage(response.user);
    }
    
    // Redirigir al dashboard
    this.router.navigate(['/dashboard']);
  }

  onGoBack() {
    this.requires2FA = false;
    this.tempToken = '';
    this.offlinePin = '';
    this.errorMessage = '';
  }
}
