// usuarios.component.ts
import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { UsuariosService, Usuario, OfflinePin, PinResponse, ApiResponse } from '../../core/services/usuarios.service';

@Component({
  selector: 'app-usuarios',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './usuarios.component.html',
  styleUrls: ['./usuarios.component.css']
})
export class UsuariosComponent implements OnInit {
  private usuariosService = inject(UsuariosService);
  private fb = inject(FormBuilder);

  // Listas y estados
  usuarios: Usuario[] = [];
  activePins: OfflinePin[] = [];
  
  // Formularios
  usuarioForm: FormGroup;
  pinForm: FormGroup;
  
  // Estados de UI
  isLoading = false;
  isEditing = false;
  errorMessage = '';
  successMessage = '';
  showPinManagement = false;
  selectedUser: Usuario | null = null;
  pinResponse: PinResponse | null = null;
  showQrCode = false;

  // Roles disponibles basados en tu esquema
  roles = ['admin', 'user'];

  constructor() {
    // Formulario para crear/editar usuarios
    this.usuarioForm = this.fb.group({
      email: ['', [Validators.required, Validators.email]],
      password: ['', [Validators.required, Validators.minLength(8)]],
      role: ['user', [Validators.required]],
      phone: ['', [Validators.required, Validators.pattern('^[0-9]{10,15}$')]],
      two_factor_enabled: [false]
    });

    // Formulario para gestión de PINs
    this.pinForm = this.fb.group({
      pinAction: ['generate']
    });
  }

  ngOnInit() {
    this.loadUsuarios();
  }

  // Cargar todos los usuarios
  loadUsuarios() {
    this.isLoading = true;
    this.errorMessage = '';
    
    this.usuariosService.getAll().subscribe({
      next: (response: any) => {
        this.isLoading = false;
        // Manejar diferentes formatos de respuesta
        if (Array.isArray(response)) {
          this.usuarios = response;
        } else if (response.data && Array.isArray(response.data)) {
          this.usuarios = response.data;
        } else if (response.code === 0 && response.data) {
          this.usuarios = response.data;
        } else {
          this.errorMessage = 'Formato de respuesta no válido';
        }
      },
      error: (error) => {
        this.isLoading = false;
        this.errorMessage = 'Error al cargar los usuarios';
        console.error('Error loading users:', error);
      }
    });
  }

  // Crear nuevo usuario
  onCreate() {
    if (this.usuarioForm.valid) {
      this.isLoading = true;
      const usuarioData = this.usuarioForm.value;

      this.usuariosService.create(usuarioData).subscribe({
        next: (response: ApiResponse<Usuario>) => {
          this.isLoading = false;
          if (response.code === 0 || response.message) {
            this.successMessage = response.message || 'Usuario creado exitosamente';
            
            // Mostrar PIN y QR si están disponibles
            if (response.offlinePin || response.qrCodeUrl) {
              this.pinResponse = {
                offlinePin: response.offlinePin,
                qrCodeUrl: response.qrCodeUrl,
                expiresAt: response.expiresAt ? new Date(response.expiresAt) : new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)
              };
              this.showQrCode = true;
            }
            
            this.usuarioForm.reset({
              role: 'user',
              two_factor_enabled: false
            });
            this.loadUsuarios();
            this.clearMessagesAfterDelay();
          } else {
            this.errorMessage = response.message || 'Error al crear usuario';
          }
        },
        error: (error) => {
          this.isLoading = false;
          this.errorMessage = error.error?.message || 'Error al crear el usuario';
          console.error('Error creating user:', error);
        }
      });
    }
  }

  // Preparar formulario para edición
  onEdit(usuario: Usuario) {
    this.isEditing = true;
    this.selectedUser = usuario;
    this.usuarioForm.patchValue({
      email: usuario.email,
      role: usuario.role,
      phone: usuario.phone,
      two_factor_enabled: usuario.two_factor_enabled,
      password: '' // No mostrar contraseña actual
    });
    // Quitar validación requerida para password en edición
    this.usuarioForm.get('password')?.clearValidators();
    this.usuarioForm.get('password')?.updateValueAndValidity();
  }

  // Actualizar usuario
  onUpdate() {
    if (this.usuarioForm.valid && this.selectedUser) {
      this.isLoading = true;
      const updateData = this.usuarioForm.value;
      
      // Si no se proporcionó nueva contraseña, eliminar el campo
      if (!updateData.password) {
        const { password, ...dataWithoutPassword } = updateData;
        this.updateUser(dataWithoutPassword);
      } else {
        this.updateUser(updateData);
      }
    }
  }

  private updateUser(updateData: any) {
    if (this.selectedUser) {
      this.usuariosService.update(this.selectedUser.email, updateData).subscribe({
        next: (response: ApiResponse<Usuario>) => {
          this.isLoading = false;
          if (response.code === 0 || response.message) {
            this.successMessage = response.message || 'Usuario actualizado exitosamente';
            this.cancelEdit();
            this.loadUsuarios();
            this.clearMessagesAfterDelay();
          } else {
            this.errorMessage = response.message || 'Error al actualizar usuario';
          }
        },
        error: (error) => {
          this.isLoading = false;
          this.errorMessage = error.error?.message || 'Error al actualizar el usuario';
          console.error('Error updating user:', error);
        }
      });
    }
  }

  // Eliminar usuario
  onDelete(usuario: Usuario) {
    if (confirm(`¿Estás seguro de que quieres eliminar al usuario "${usuario.email}"?`)) {
      this.isLoading = true;
      this.usuariosService.delete(usuario.email).subscribe({
        next: (response: ApiResponse<void>) => {
          this.isLoading = false;
          if (response.code === 0 || response.message) {
            this.successMessage = response.message || 'Usuario eliminado exitosamente';
            this.loadUsuarios();
            this.clearMessagesAfterDelay();
          } else {
            this.errorMessage = response.message || 'Error al eliminar usuario';
          }
        },
        error: (error) => {
          this.isLoading = false;
          this.errorMessage = error.error?.message || 'Error al eliminar el usuario';
          console.error('Error deleting user:', error);
        }
      });
    }
  }

  // Gestionar PINs offline
  onManagePins(usuario: Usuario) {
    this.selectedUser = usuario;
    this.showPinManagement = true;
    this.loadActivePins();
  }

  // Cargar PINs activos
  loadActivePins() {
    if (this.selectedUser) {
      this.isLoading = true;
      this.usuariosService.getActiveOfflinePins(this.selectedUser.email).subscribe({
        next: (response: ApiResponse<OfflinePin[]>) => {
          this.isLoading = false;
          if (response.code === 0 && response.activePins) {
            this.activePins = response.activePins;
          } else if (response.activePins) {
            this.activePins = response.activePins;
          } else {
            this.errorMessage = response.message || 'No se pudieron cargar los PINs';
          }
        },
        error: (error) => {
          this.isLoading = false;
          this.errorMessage = 'Error al cargar PINs activos';
          console.error('Error loading active pins:', error);
        }
      });
    }
  }

  // Ejecutar acción de PIN
  onPinAction() {
    if (this.selectedUser && this.pinForm.valid) {
      const action = this.pinForm.get('pinAction')?.value;
      this.isLoading = true;

      if (action === 'generate') {
        this.generateOfflinePin();
      } else if (action === 'regenerate') {
        this.regenerateOfflinePin();
      }
    }
  }

  // Generar PIN offline
  generateOfflinePin() {
    if (this.selectedUser) {
      this.usuariosService.generateOfflinePin(this.selectedUser.email).subscribe({
        next: (response: ApiResponse<PinResponse>) => {
          this.isLoading = false;
          if (response.code === 0 || response.offlinePin) {
            this.pinResponse = {
              offlinePin: response.offlinePin,
              qrCodeUrl: response.qrCodeUrl,
              expiresAt: response.expiresAt ? new Date(response.expiresAt) : new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)
            };
            this.showQrCode = true;
            this.successMessage = response.message || 'PIN offline generado exitosamente';
            this.loadActivePins();
            this.clearMessagesAfterDelay();
          } else {
            this.errorMessage = response.message || 'Error al generar PIN';
          }
        },
        error: (error) => {
          this.isLoading = false;
          this.errorMessage = error.error?.message || 'Error al generar PIN offline';
          console.error('Error generating offline pin:', error);
        }
      });
    }
  }

  // Regenerar PIN offline
  regenerateOfflinePin() {
    if (this.selectedUser) {
      this.usuariosService.regenerateOfflinePin(this.selectedUser.email).subscribe({
        next: (response: ApiResponse<PinResponse>) => {
          this.isLoading = false;
          if (response.code === 0 || response.offlinePin) {
            this.pinResponse = {
              offlinePin: response.offlinePin,
              qrCodeUrl: response.qrCodeUrl,
              expiresAt: response.expiresAt ? new Date(response.expiresAt) : new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)
            };
            this.showQrCode = true;
            this.successMessage = response.message || 'PIN offline regenerado exitosamente';
            this.loadActivePins();
            this.clearMessagesAfterDelay();
          } else {
            this.errorMessage = response.message || 'Error al regenerar PIN';
          }
        },
        error: (error) => {
          this.isLoading = false;
          this.errorMessage = error.error?.message || 'Error al regenerar PIN offline';
          console.error('Error regenerating offline pin:', error);
        }
      });
    }
  }

  // Revocar PIN offline
  onRevokePin(pin: string) {
    if (this.selectedUser && confirm(`¿Estás seguro de que quieres revocar el PIN ${pin}?`)) {
      this.isLoading = true;
      this.usuariosService.revokeOfflinePin(this.selectedUser.email, pin).subscribe({
        next: (response: ApiResponse<void>) => {
          this.isLoading = false;
          if (response.code === 0 || response.message) {
            this.successMessage = response.message || 'PIN revocado exitosamente';
            this.loadActivePins();
            this.clearMessagesAfterDelay();
          } else {
            this.errorMessage = response.message || 'Error al revocar PIN';
          }
        },
        error: (error) => {
          this.isLoading = false;
          this.errorMessage = error.error?.message || 'Error al revocar el PIN';
          console.error('Error revoking pin:', error);
        }
      });
    }
  }

  // Cerrar gestión de PINs
  closePinManagement() {
    this.showPinManagement = false;
    this.selectedUser = null;
    this.activePins = [];
    this.pinResponse = null;
    this.showQrCode = false;
  }

  // Cerrar QR code
  closeQrCode() {
    this.showQrCode = false;
    this.pinResponse = null;
  }

  // Cancelar edición
  cancelEdit() {
    this.isEditing = false;
    this.selectedUser = null;
    this.usuarioForm.reset({
      role: 'user',
      two_factor_enabled: false
    });
    // Restaurar validación requerida para password
    this.usuarioForm.get('password')?.setValidators([Validators.required, Validators.minLength(8)]);
    this.usuarioForm.get('password')?.updateValueAndValidity();
  }

  // Limpiar mensajes después de un tiempo
  private clearMessagesAfterDelay() {
    setTimeout(() => {
      this.errorMessage = '';
      this.successMessage = '';
    }, 5000);
  }

  // Validar campo del formulario
  isFieldInvalid(fieldName: string): boolean {
    const field = this.usuarioForm.get(fieldName);
    return !!(field && field.invalid && (field.dirty || field.touched));
  }

  // Obtener mensaje de error para campo
  getFieldError(fieldName: string): string {
    const field = this.usuarioForm.get(fieldName);
    if (field?.errors) {
      if (field.errors['required']) return 'Este campo es requerido';
      if (field.errors['email']) return 'Formato de correo inválido';
      if (field.errors['minlength']) return 'Mínimo 8 caracteres';
      if (field.errors['pattern']) return 'Teléfono inválido (10-15 dígitos)';
    }
    return '';
  }

  // Formatear fecha
  formatDate(date: string | Date | undefined): string {
    if (!date) return 'N/A';
    return new Date(date).toLocaleDateString('es-ES', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit'
    });
  }

  // Verificar si un PIN está próximo a expirar
  isPinExpiring(expiresAt: Date): boolean {
    const now = new Date();
    const expiration = new Date(expiresAt);
    const daysUntilExpiration = (expiration.getTime() - now.getTime()) / (1000 * 60 * 60 * 24);
    return daysUntilExpiration <= 7; // Expira en 7 días o menos
  }

  // Obtener texto del rol
  getRoleText(role: string): string {
    const roleTexts: { [key: string]: string } = {
      'admin': '👑 Administrador',
      'user': '👤 Usuario'
    };
    return roleTexts[role] || role;
  }

  // Obtener estado del 2FA
  get2FAStatus(two_factor_enabled: boolean): string {
    return two_factor_enabled ? '✅ Activado' : '❌ Desactivado';
  }
}
