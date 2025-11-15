// proveedores.component.ts
import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { ProveedoresService, Proveedor } from '../../core/services/proveedores.service';
import { ModalComponent } from '../../layout/modal/modal.component';

@Component({
  selector: 'app-proveedores',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, ModalComponent],
  templateUrl: './proveedores.component.html',
  styleUrls: ['./proveedores.component.css']
})
export class ProveedoresComponent implements OnInit {
  private proveedoresService = inject(ProveedoresService);
  private fb = inject(FormBuilder);

  // Listas y estados
  proveedores: Proveedor[] = [];
  filteredProveedores: Proveedor[] = [];
  
  // Formularios
  proveedorForm: FormGroup;
  searchForm: FormGroup;
  
  // Estados de UI
  isLoading = false;
  errorMessage = '';
  successMessage = '';
  searchMode: 'all' | 'search' = 'all';
  
  // Estados de modales
  showCreateModal = false;
  showEditModal = false;
  showDeleteModal = false;
  
  // Datos seleccionados
  selectedProveedor: Proveedor | null = null;

  constructor() {
    // Formulario para crear/editar proveedores
    this.proveedorForm = this.fb.group({
      nombre: ['', [Validators.required, Validators.maxLength(100)]],
      telefono: ['', [Validators.pattern('^[0-9]{10}$')]],
      contacto: ['', [Validators.maxLength(100)]]
    });

    // Formulario para búsqueda
    this.searchForm = this.fb.group({
      searchTerm: ['']
    });
  }

  ngOnInit() {
    this.loadProveedores();
  }

  // Cargar todos los proveedores
  loadProveedores() {
    this.isLoading = true;
    this.errorMessage = '';
    this.searchMode = 'all';
    
    this.proveedoresService.getAll().subscribe({
      next: (response) => {
        this.isLoading = false;
        if (response.code === 0 && response.data) {
          this.proveedores = response.data;
          this.filteredProveedores = response.data;
        } else {
          this.errorMessage = response.message || 'Error al cargar proveedores';
        }
      },
      error: (error) => {
        this.isLoading = false;
        this.errorMessage = 'Error al cargar los proveedores';
        console.error('Error loading providers:', error);
      }
    });
  }

  // Buscar por nombre
  searchByNombre() {
    const nombre = this.searchForm.get('searchTerm')?.value?.trim();
    if (!nombre) {
      this.loadProveedores();
      return;
    }

    this.isLoading = true;
    this.proveedoresService.getByNombre(nombre).subscribe({
      next: (response) => {
        this.isLoading = false;
        if (response.code === 0 && response.data) {
          this.filteredProveedores = response.data;
          this.searchMode = 'search';
        } else {
          this.errorMessage = response.message || 'No se encontraron proveedores';
        }
      },
      error: (error) => {
        this.isLoading = false;
        this.errorMessage = 'Error al buscar proveedores';
        console.error('Error searching providers:', error);
      }
    });
  }

  // Métodos para abrir modales
  openCreateModal() {
    this.proveedorForm.reset();
    this.showCreateModal = true;
  }

  openEditModal(proveedor: Proveedor) {
    this.selectedProveedor = proveedor;
    this.proveedorForm.patchValue({
      nombre: proveedor.nombre,
      telefono: proveedor.telefono || '',
      contacto: proveedor.contacto || ''
    });
    this.showEditModal = true;
  }

  openDeleteModal(proveedor: Proveedor) {
    this.selectedProveedor = proveedor;
    this.showDeleteModal = true;
  }

  // Métodos para cerrar modales
  closeCreateModal() {
    this.showCreateModal = false;
    this.proveedorForm.reset();
  }

  closeEditModal() {
    this.showEditModal = false;
    this.selectedProveedor = null;
  }

  closeDeleteModal() {
    this.showDeleteModal = false;
    this.selectedProveedor = null;
  }

  // Acciones CRUD
  onCreate() {
    if (this.proveedorForm.valid) {
      this.isLoading = true;
      const proveedorData = this.proveedorForm.value;

      this.proveedoresService.create(proveedorData).subscribe({
        next: (response) => {
          this.isLoading = false;
          if (response.code === 0) {
            this.successMessage = 'Proveedor creado exitosamente';
            this.closeCreateModal();
            this.loadProveedores();
            this.clearMessagesAfterDelay();
          } else {
            this.errorMessage = response.message || 'Error al crear proveedor';
          }
        },
        error: (error) => {
          this.isLoading = false;
          this.errorMessage = 'Error al crear el proveedor';
          console.error('Error creating provider:', error);
        }
      });
    }
  }

  onUpdate() {
    if (this.proveedorForm.valid && this.selectedProveedor) {
      this.isLoading = true;
      const nombreOriginal = this.selectedProveedor.nombre;
      const updateData = {
        telefono: this.proveedorForm.get('telefono')?.value,
        contacto: this.proveedorForm.get('contacto')?.value
      };

      this.proveedoresService.update(nombreOriginal, updateData).subscribe({
        next: (response) => {
          this.isLoading = false;
          if (response.code === 0) {
            this.successMessage = 'Proveedor actualizado exitosamente';
            this.closeEditModal();
            this.loadProveedores();
            this.clearMessagesAfterDelay();
          } else {
            this.errorMessage = response.message || 'Error al actualizar proveedor';
          }
        },
        error: (error) => {
          this.isLoading = false;
          this.errorMessage = 'Error al actualizar el proveedor';
          console.error('Error updating provider:', error);
        }
      });
    }
  }

  onDelete() {
    if (this.selectedProveedor) {
      this.isLoading = true;
      this.proveedoresService.delete(this.selectedProveedor.nombre).subscribe({
        next: (response) => {
          this.isLoading = false;
          if (response.code === 0) {
            this.successMessage = 'Proveedor eliminado exitosamente';
            this.closeDeleteModal();
            this.loadProveedores();
            this.clearMessagesAfterDelay();
          } else {
            this.errorMessage = response.message || 'Error al eliminar proveedor';
          }
        },
        error: (error) => {
          this.isLoading = false;
          this.errorMessage = 'Error al eliminar el proveedor';
          console.error('Error deleting provider:', error);
        }
      });
    }
  }

  // Resetear búsqueda
  resetSearch() {
    this.searchForm.get('searchTerm')?.setValue('');
    this.loadProveedores();
  }

  // Métodos auxiliares
  private clearMessagesAfterDelay() {
    setTimeout(() => {
      this.errorMessage = '';
      this.successMessage = '';
    }, 5000);
  }

  isFieldInvalid(fieldName: string): boolean {
    const field = this.proveedorForm.get(fieldName);
    return !!(field && field.invalid && (field.dirty || field.touched));
  }

  getFieldError(fieldName: string): string {
    const field = this.proveedorForm.get(fieldName);
    if (field?.errors) {
      if (field.errors['required']) return 'Este campo es requerido';
      if (field.errors['maxlength']) return 'Máximo 100 caracteres';
      if (field.errors['pattern']) return 'El teléfono debe tener 10 dígitos';
    }
    return '';
  }
}
