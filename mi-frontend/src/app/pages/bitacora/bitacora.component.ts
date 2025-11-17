// bitacora.component.ts
import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { BitacoraService } from '../../core/services/bitacora.service';
import { ModalComponent } from '../../layout/modal/modal.component';

@Component({
  selector: 'app-bitacora',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, ModalComponent],
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
  
  // Estados de modales
  showCreateModal = false;
  showSearchModal = false;

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
    this.searchMode = 'all';
    
    this.bitacoraService.getAll().subscribe({
      next: (response) => {
        this.isLoading = false;
        if (response.code === 0 && response.data) {
          this.bitacora = response.data;
          this.filteredBitacora = response.data;
        } else {
          this.errorMessage = response.message || 'Error al cargar la bitácora';
        }
      },
      error: (error) => {
        this.isLoading = false;
        this.errorMessage = 'Error al cargar la bitácora';
        console.error('Error loading log:', error);
      }
    });
  }

  // Métodos para abrir modales
  openCreateModal() {
    this.bitacoraForm.reset();
    this.showCreateModal = true;
  }

  openSearchModal() {
    this.searchForm.reset({
      searchType: 'movimiento',
      searchId: ''
    });
    this.showSearchModal = true;
  }

  // Métodos para cerrar modales
  closeCreateModal() {
    this.showCreateModal = false;
    this.bitacoraForm.reset();
  }

  closeSearchModal() {
    this.showSearchModal = false;
    this.searchForm.reset({
      searchType: 'movimiento',
      searchId: ''
    });
  }

  // Acciones CRUD
  onCreate() {
    if (this.bitacoraForm.valid) {
      this.isLoading = true;
      const bitacoraData = this.bitacoraForm.value;

      this.bitacoraService.create(bitacoraData).subscribe({
        next: (response) => {
          this.isLoading = false;
          if (response.code === 0) {
            this.successMessage = 'Registro de bitácora creado exitosamente';
            this.closeCreateModal();
            this.loadBitacora();
            this.clearMessagesAfterDelay();
          } else {
            this.errorMessage = response.message || 'Error al crear registro';
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
          this.closeSearchModal();
          this.successMessage = `Se encontraron ${this.filteredBitacora.length} registros para el movimiento ID ${movimientoId}`;
          this.clearMessagesAfterDelay();
        } else {
          this.errorMessage = response.message || 'No se encontraron registros para este movimiento';
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
          this.closeSearchModal();
          this.successMessage = `Se encontraron ${this.filteredBitacora.length} registros para el proveedor ID ${proveedorId}`;
          this.clearMessagesAfterDelay();
        } else {
          this.errorMessage = response.message || 'No se encontraron registros para este proveedor';
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
    this.closeSearchModal();
    this.loadBitacora();
  }

  // Métodos auxiliares
  private clearMessagesAfterDelay() {
    setTimeout(() => {
      this.errorMessage = '';
      this.successMessage = '';
    }, 5000);
  }

  isFieldInvalid(form: FormGroup, fieldName: string): boolean {
    const field = form.get(fieldName);
    return !!(field && field.invalid && (field.dirty || field.touched));
  }

  getFieldError(form: FormGroup, fieldName: string): string {
    const field = form.get(fieldName);
    if (field?.errors) {
      if (field.errors['required']) return 'Este campo es requerido';
      if (field.errors['min']) return 'El valor debe ser mayor a 0';
      if (field.errors['max']) return 'El valor es demasiado grande';
    }
    return '';
  }

  formatDate(date: string | Date): string {
    return new Date(date).toLocaleDateString('es-ES', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit'
    });
  }

  getTipoClass(tipo: string): string {
    return tipo === 'Entrada' ? 'tipo-entrada' : 'tipo-salida';
  }

  getTipoIcon(tipo: string): string {
    return tipo === 'Entrada' ? '📥' : '📤';
  }

  getTipoText(tipo: string): string {
    return tipo === 'Entrada' ? 'Entrada' : 'Salida';
  }

  getSearchModeText(): string {
    switch (this.searchMode) {
      case 'movimiento': return 'por Movimiento';
      case 'proveedor': return 'por Proveedor';
      default: return 'Completa';
    }
  }
}

// Tipo local mínimo para compilar; reemplaza con la definición real si la exportas desde el servicio.
interface Bitacora {
  id?: number;
  usuario?: string;
  accion?: string;
  fecha?: string;
  [k: string]: any;
}
