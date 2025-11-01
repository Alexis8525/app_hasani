// proveedores.component.ts
import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { ProveedoresService, Proveedor } from '../../core//services/proveedores.service';

@Component({
  selector: 'app-proveedores',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
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
  isEditing = false;
  errorMessage = '';
  successMessage = '';
  searchMode: 'all' | 'search' = 'all';

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
    
    this.proveedoresService.getAll().subscribe({
      next: (response) => {
        this.isLoading = false;
        if (response.code === 0 && response.data) {
          this.proveedores = response.data;
          this.filteredProveedores = response.data;
          this.searchMode = 'all';
        } else {
          this.errorMessage = response.message;
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
          this.errorMessage = response.message;
        }
      },
      error: (error) => {
        this.isLoading = false;
        this.errorMessage = 'Error al buscar proveedores';
        console.error('Error searching providers:', error);
      }
    });
  }

  // Crear nuevo proveedor
  onCreate() {
    if (this.proveedorForm.valid) {
      this.isLoading = true;
      const proveedorData = this.proveedorForm.value;

      this.proveedoresService.create(proveedorData).subscribe({
        next: (response) => {
          this.isLoading = false;
          if (response.code === 0) {
            this.successMessage = 'Proveedor creado exitosamente';
            this.proveedorForm.reset();
            this.loadProveedores(); // Recargar la lista
            this.clearMessagesAfterDelay();
          } else {
            this.errorMessage = response.message;
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

  // Preparar formulario para edición
  onEdit(proveedor: Proveedor) {
    this.isEditing = true;
    this.proveedorForm.patchValue({
      nombre: proveedor.nombre,
      telefono: proveedor.telefono || '',
      contacto: proveedor.contacto || ''
    });
  }

  // Actualizar proveedor
  onUpdate() {
    if (this.proveedorForm.valid) {
      this.isLoading = true;
      const nombreOriginal = this.proveedorForm.get('nombre')?.value;
      const updateData = {
        telefono: this.proveedorForm.get('telefono')?.value,
        contacto: this.proveedorForm.get('contacto')?.value
      };

      this.proveedoresService.update(nombreOriginal, updateData).subscribe({
        next: (response) => {
          this.isLoading = false;
          if (response.code === 0) {
            this.successMessage = 'Proveedor actualizado exitosamente';
            this.cancelEdit();
            this.loadProveedores();
            this.clearMessagesAfterDelay();
          } else {
            this.errorMessage = response.message;
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

  // Eliminar proveedor
  onDelete(nombre: string) {
    if (confirm(`¿Estás seguro de que quieres eliminar al proveedor "${nombre}"?`)) {
      this.isLoading = true;
      this.proveedoresService.delete(nombre).subscribe({
        next: (response) => {
          this.isLoading = false;
          if (response.code === 0) {
            this.successMessage = 'Proveedor eliminado exitosamente';
            this.loadProveedores();
            this.clearMessagesAfterDelay();
          } else {
            this.errorMessage = response.message;
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

  // Cancelar edición
  cancelEdit() {
    this.isEditing = false;
    this.proveedorForm.reset();
  }

  // Limpiar mensajes después de un tiempo
  private clearMessagesAfterDelay() {
    setTimeout(() => {
      this.errorMessage = '';
      this.successMessage = '';
    }, 5000);
  }

  // Resetear búsqueda
  resetSearch() {
    this.searchForm.get('searchTerm')?.setValue('');
    this.searchMode = 'all';
    this.loadProveedores();
  }

  // Validar campo del formulario
  isFieldInvalid(fieldName: string): boolean {
    const field = this.proveedorForm.get(fieldName);
    return !!(field && field.invalid && (field.dirty || field.touched));
  }

  // Obtener mensaje de error para campo
  getFieldError(fieldName: string): string {
    const field = this.proveedorForm.get(fieldName);
    if (field?.errors) {
      if (field.errors['required']) return 'Este campo es requerido';
      if (field.errors['maxlength']) return 'Máximo 100 caracteres';
      if (field.errors['pattern']) return 'El teléfono debe tener 10 dígitos';
    }
    return '';
  }

  // Verificar si se puede editar el nombre (solo en creación)
  canEditNombre(): boolean {
    return !this.isEditing;
  }
}
