// bitacora.component.ts
import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { BitacoraService, Bitacora } from '../../core/services/bitacora.service';

@Component({
  selector: 'app-bitacora',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './bitacora.component.html',
  styleUrls: ['./bitacora.component.css']
})
export class BitacoraComponent implements OnInit {
  private bitacoraService = inject(BitacoraService);
  private fb = inject(FormBuilder);

  // Listas y estados
  bitacora: Bitacora[] = [];
  filteredBitacora: Bitacora[] = [];
  
  // Formularios
  bitacoraForm: FormGroup;
  searchForm: FormGroup;
  
  // Estados de UI
  isLoading = false;
  errorMessage = '';
  successMessage = '';
  searchMode: 'all' | 'movimiento' | 'proveedor' = 'all';

  constructor() {
    // Formulario para crear registros en bitácora
    this.bitacoraForm = this.fb.group({
      id_movimiento: ['', [Validators.required, Validators.min(1)]],
      id_proveedor: ['', [Validators.required, Validators.min(1)]],
      cantidad: ['', [Validators.required, Validators.min(1), Validators.max(1000000)]],
      id_producto: ['', [Validators.required, Validators.min(1)]]
    });

    // Formulario para búsqueda
    this.searchForm = this.fb.group({
      searchType: ['movimiento'],
      searchId: ['', [Validators.required, Validators.min(1)]]
    });
  }

  ngOnInit() {
    this.loadBitacora();
  }

  // Cargar todos los registros de bitácora
  loadBitacora() {
    this.isLoading = true;
    this.errorMessage = '';
    
    this.bitacoraService.getAll().subscribe({
      next: (response) => {
        this.isLoading = false;
        if (response.code === 0 && response.data) {
          this.bitacora = response.data;
          this.filteredBitacora = response.data;
          this.searchMode = 'all';
        } else {
          this.errorMessage = response.message;
        }
      },
      error: (error) => {
        this.isLoading = false;
        this.errorMessage = 'Error al cargar la bitácora';
        console.error('Error loading log:', error);
      }
    });
  }

  // Crear nuevo registro en bitácora
  onCreate() {
    if (this.bitacoraForm.valid) {
      this.isLoading = true;
      const bitacoraData = this.bitacoraForm.value;

      this.bitacoraService.create(bitacoraData).subscribe({
        next: (response) => {
          this.isLoading = false;
          if (response.code === 0) {
            this.successMessage = 'Registro de bitácora creado exitosamente';
            this.bitacoraForm.reset();
            this.loadBitacora(); // Recargar la lista
            this.clearMessagesAfterDelay();
          } else {
            this.errorMessage = response.message;
          }
        },
        error: (error) => {
          this.isLoading = false;
          this.errorMessage = error.error?.message || 'Error al crear el registro de bitácora';
          console.error('Error creating log entry:', error);
        }
      });
    }
  }

  // Buscar registros
  onSearch() {
    if (this.searchForm.valid) {
      const { searchType, searchId } = this.searchForm.value;
      const id = parseInt(searchId);

      this.isLoading = true;

      if (searchType === 'movimiento') {
        this.searchByMovimiento(id);
      } else {
        this.searchByProveedor(id);
      }
    }
  }

  // Buscar por movimiento
  searchByMovimiento(movimientoId: number) {
    this.bitacoraService.getByMovimiento(movimientoId).subscribe({
      next: (response) => {
        this.isLoading = false;
        if (response.code === 0 && response.data) {
          this.filteredBitacora = response.data;
          this.searchMode = 'movimiento';
        } else {
          this.errorMessage = response.message;
        }
      },
      error: (error) => {
        this.isLoading = false;
        this.errorMessage = 'Error al buscar registros por movimiento';
        console.error('Error searching by movement:', error);
      }
    });
  }

  // Buscar por proveedor
  searchByProveedor(proveedorId: number) {
    this.bitacoraService.getByProveedor(proveedorId).subscribe({
      next: (response) => {
        this.isLoading = false;
        if (response.code === 0 && response.data) {
          this.filteredBitacora = response.data;
          this.searchMode = 'proveedor';
        } else {
          this.errorMessage = response.message;
        }
      },
      error: (error) => {
        this.isLoading = false;
        this.errorMessage = 'Error al buscar registros por proveedor';
        console.error('Error searching by provider:', error);
      }
    });
  }

  // Resetear búsqueda
  resetSearch() {
    this.searchForm.reset({
      searchType: 'movimiento',
      searchId: ''
    });
    this.searchMode = 'all';
    this.loadBitacora();
  }

  // Limpiar mensajes después de un tiempo
  private clearMessagesAfterDelay() {
    setTimeout(() => {
      this.errorMessage = '';
      this.successMessage = '';
    }, 5000);
  }

  // Validar campo del formulario
  isFieldInvalid(form: FormGroup, fieldName: string): boolean {
    const field = form.get(fieldName);
    return !!(field && field.invalid && (field.dirty || field.touched));
  }

  // Obtener mensaje de error para campo
  getFieldError(form: FormGroup, fieldName: string): string {
    const field = form.get(fieldName);
    if (field?.errors) {
      if (field.errors['required']) return 'Este campo es requerido';
      if (field.errors['min']) return 'El valor debe ser mayor a 0';
      if (field.errors['max']) return 'El valor es demasiado grande';
    }
    return '';
  }

  // Formatear fecha
  formatDate(date: string | Date): string {
    return new Date(date).toLocaleDateString('es-ES', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit'
    });
  }

  // Obtener clase CSS para el tipo de movimiento
  getTipoClass(tipo: string): string {
    return tipo === 'Entrada' ? 'tipo-entrada' : 'tipo-salida';
  }

  // Obtener icono para el tipo de movimiento
  getTipoIcon(tipo: string): string {
    return tipo === 'Entrada' ? '📥' : '📤';
  }

  // Obtener texto descriptivo para el tipo de movimiento
  getTipoText(tipo: string): string {
    return tipo === 'Entrada' ? 'Entrada' : 'Salida';
  }

  // Obtener texto para el modo de búsqueda actual
  getSearchModeText(): string {
    switch (this.searchMode) {
      case 'movimiento': return 'por Movimiento';
      case 'proveedor': return 'por Proveedor';
      default: return 'Completa';
    }
  }
}
