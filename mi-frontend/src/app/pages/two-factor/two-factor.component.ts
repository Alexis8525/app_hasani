// two-factor.component.ts
import { Component, EventEmitter, Output, Input, inject } from '@angular/core';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-two-factor',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  template: `
    <div class="twofa-container">
      <div class="twofa-card">
        <h3>Verificación en Dos Pasos</h3>
        <p>Se ha enviado un código de verificación a tu correo y/o teléfono.</p>
        
        <form [formGroup]="otpForm" (ngSubmit)="onSubmit()">
          <div class="form-group">
            <label for="otp">Código de Verificación</label>
            <input
              id="otp"
              type="text"
              formControlName="otp"
              class="form-control"
              placeholder="Ingresa el código de 6 dígitos"
              maxlength="6"
              [class.is-invalid]="otpForm.get('otp')?.invalid && otpForm.get('otp')?.touched"
            />
            <div *ngIf="otpForm.get('otp')?.invalid && otpForm.get('otp')?.touched" class="error-message">
              El código debe tener 6 dígitos.
            </div>
          </div>

          <div class="alert-info" *ngIf="offlinePin">
            <p><strong>PIN de respaldo:</strong> {{ offlinePin }}</p>
            <small>Usa este PIN si no recibes el código</small>
          </div>

          <div *ngIf="errorMessage" class="alert-error">
            {{ errorMessage }}
          </div>

          <button type="submit" class="btn btn-primary" [disabled]="isLoading || otpForm.invalid">
            {{ isLoading ? 'Verificando...' : 'Verificar' }}
          </button>

          <button type="button" class="btn btn-secondary" (click)="useOfflinePin()" [disabled]="isLoading || !offlinePin">
            Usar PIN de respaldo
          </button>

          <button type="button" class="btn btn-link" (click)="goBack.emit()">
            ← Volver al login
          </button>
        </form>
      </div>
    </div>
  `,
  styles: [`
    .twofa-container {
      display: flex;
      justify-content: center;
      align-items: center;
      width: 100%;
    }
    
    .twofa-card {
      background: white;
      padding: 0;
      border-radius: 0;
      box-shadow: none;
      width: 100%;
    }
    
    .twofa-card h3 {
      text-align: center;
      margin-bottom: 1rem;
      color: #333;
    }
    
    .twofa-card p {
      text-align: center;
      margin-bottom: 1.5rem;
      color: #666;
    }
    
    .alert-info {
      background-color: #d1ecf1;
      color: #0c5460;
      padding: 0.75rem;
      border-radius: 5px;
      margin-bottom: 1rem;
      border: 1px solid #bee5eb;
    }
    
    .btn-secondary {
      background-color: #6c757d;
      color: white;
      width: 100%;
      margin-top: 0.5rem;
    }
    
    .btn-secondary:hover:not(:disabled) {
      background-color: #5a6268;
    }
    
    .btn-link {
      background: none;
      border: none;
      color: #667eea;
      text-decoration: underline;
      cursor: pointer;
      width: 100%;
      margin-top: 0.5rem;
      padding: 0.5rem;
    }
    
    .btn-link:hover {
      color: #5a6fd8;
    }
  `]
})
export class TwoFactorComponent {
  private fb = inject(FormBuilder);

  @Input() tempToken!: string;
  @Input() offlinePin!: string;
  @Input() email!: string;
  @Input() isLoading = false;
  @Input() errorMessage = '';
  
  @Output() verify2FA = new EventEmitter<{tempToken: string, otp: string}>();
  @Output() verifyOffline = new EventEmitter<{email: string, offlinePin: string}>();
  @Output() goBack = new EventEmitter<void>();

  otpForm: FormGroup;
  showTokenInfo = false;
  resendCooldown = 0;
  canResend = true;

  constructor() {
    this.otpForm = this.fb.group({
      otp: ['', [Validators.required, Validators.minLength(6), Validators.maxLength(6), Validators.pattern('^[0-9]*$')]]
    });
  }

  onSubmit() {
    if (this.otpForm.valid) {
      this.verify2FA.emit({
        tempToken: this.tempToken,
        otp: this.otpForm.value.otp
      });
    }
  }

  useOfflinePin() {
    if (this.offlinePin) {
      this.verifyOffline.emit({
        email: this.email,
        offlinePin: this.offlinePin
      });
    }
  }
  ngOnInit() {
    this.startResendCooldown();
  }

  startResendCooldown() {
    this.resendCooldown = 30; // 30 segundos
    this.canResend = false;
    
    const interval = setInterval(() => {
      this.resendCooldown--;
      if (this.resendCooldown <= 0) {
        this.canResend = true;
        clearInterval(interval);
      }
    }, 1000);
  }

  toggleTokenInfo() {
    this.showTokenInfo = !this.showTokenInfo;
  }

  // Método para reenviar código (si tu backend lo soporta)
  resendCode() {
    if (this.canResend) {
      // Aquí podrías llamar a un método del AuthService para reenviar el código
      this.startResendCooldown();
    }
  }
}
