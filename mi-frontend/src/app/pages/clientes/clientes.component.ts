// clientes.component.ts
import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { ClientesService, Cliente } from '../../core/services/clientes.service';

@Component({
  selector: 'app-clientes',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './clientes.component.html',
  styleUrls: ['./clientes.component.css']
})
export class ClientesComponent implements OnInit {
  private clientesService = inject(ClientesService);
  private fb = inject(FormBuilder);

  // Listas y estados
  clientes: Cliente[] = [];
  filteredClientes: Cliente[] = [];
  
  // Formularios
  clienteForm: FormGroup;
  searchForm: FormGroup;
  
  // Estados de UI
  isLoading = false;
  isEditing = false;
  errorMessage = '';
  successMessage = '';
  searchMode: 'all' | 'user' | 'nombre' = 'all';
  currentUserId: number = 1; // Esto debería venir de tu servicio de autenticación

  constructor() {
    // Formulario para crear/editar clientes
    this.clienteForm = this.fb.group({
      nombre: ['', [Validators.required, Validators.maxLength(100)]],
      telefono: ['', [Validators.pattern('^[0-9]{10}$')]],
      contacto: ['', [Validators.maxLength(100)]]
    });

    // Formulario para búsqueda
    this.searchForm = this.fb.group({
      searchTerm: [''],
      userId: [this.currentUserId]
    });
  }

  ngOnInit() {
    this.loadClientes();
  }

  // Cargar todos los clientes
  loadClientes() {
    this.isLoading = true;
    this.errorMessage = '';
    
    this.clientesService.getAll().subscribe({
      next: (response) => {
        this.isLoading = false;
        if (response.code === 0 && response.data) {
          this.clientes = response.data;
          this.filteredClientes = response.data;
        } else {
          this.errorMessage = response.message;
        }
      },
      error: (error) => {
        this.isLoading = false;
        this.errorMessage = 'Error al cargar los clientes';
        console.error('Error loading clients:', error);
      }
    });
  }

  // Buscar por nombre
  searchByNombre() {
    const nombre = this.searchForm.get('searchTerm')?.value?.trim();
    if (!nombre) {
      this.loadClientes();
      return;
    }

    this.isLoading = true;
    this.clientesService.getByNombre(nombre).subscribe({
      next: (response) => {
        this.isLoading = false;
        if (response.code === 0 && response.data) {
          this.filteredClientes = response.data;
          this.searchMode = 'nombre';
        } else {
          this.errorMessage = response.message;
        }
      },
      error: (error) => {
        this.isLoading = false;
        this.errorMessage = 'Error al buscar clientes';
        console.error('Error searching clients:', error);
      }
    });
  }

  // Buscar por usuario
  searchByUser() {
    const userId = this.searchForm.get('userId')?.value;
    if (!userId) {
      this.errorMessage = 'ID de usuario requerido';
      return;
    }

    this.isLoading = true;
    this.clientesService.getByUserId(userId).subscribe({
      next: (response) => {
        this.isLoading = false;
        if (response.code === 0 && response.data) {
          this.filteredClientes = response.data;
          this.searchMode = 'user';
        } else {
          this.errorMessage = response.message;
        }
      },
      error: (error) => {
        this.isLoading = false;
        this.errorMessage = 'Error al buscar clientes del usuario';
        console.error('Error searching user clients:', error);
      }
    });
  }

  // Crear nuevo cliente
  onCreate() {
    if (this.clienteForm.valid) {
      this.isLoading = true;
      const clienteData = {
        ...this.clienteForm.value,
        id_user: this.currentUserId
      };

      this.clientesService.create(clienteData).subscribe({
        next: (response) => {
          this.isLoading = false;
          if (response.code === 0) {
            this.successMessage = 'Cliente creado exitosamente';
            this.clienteForm.reset();
            this.loadClientes(); // Recargar la lista
            this.clearMessagesAfterDelay();
          } else {
            this.errorMessage = response.message;
          }
        },
        error: (error) => {
          this.isLoading = false;
          this.errorMessage = 'Error al crear el cliente';
          console.error('Error creating client:', error);
        }
      });
    }
  }

  // Preparar formulario para edición
  onEdit(cliente: Cliente) {
    this.isEditing = true;
    this.clienteForm.patchValue({
      nombre: cliente.nombre,
      telefono: cliente.telefono || '',
      contacto: cliente.contacto || ''
    });
  }

  // Actualizar cliente
  onUpdate() {
    if (this.clienteForm.valid) {
      this.isLoading = true;
      const nombreOriginal = this.clienteForm.get('nombre')?.value;
      const updateData = {
        telefono: this.clienteForm.get('telefono')?.value,
        contacto: this.clienteForm.get('contacto')?.value
      };

      this.clientesService.update(nombreOriginal, updateData).subscribe({
        next: (response) => {
          this.isLoading = false;
          if (response.code === 0) {
            this.successMessage = 'Cliente actualizado exitosamente';
            this.cancelEdit();
            this.loadClientes();
            this.clearMessagesAfterDelay();
          } else {
            this.errorMessage = response.message;
          }
        },
        error: (error) => {
          this.isLoading = false;
          this.errorMessage = 'Error al actualizar el cliente';
          console.error('Error updating client:', error);
        }
      });
    }
  }

  // Eliminar cliente
  onDelete(nombre: string) {
    if (confirm(`¿Estás seguro de que quieres eliminar al cliente ${nombre}?`)) {
      this.isLoading = true;
      this.clientesService.delete(nombre).subscribe({
        next: (response) => {
          this.isLoading = false;
          if (response.code === 0) {
            this.successMessage = 'Cliente eliminado exitosamente';
            this.loadClientes();
            this.clearMessagesAfterDelay();
          } else {
            this.errorMessage = response.message;
          }
        },
        error: (error) => {
          this.isLoading = false;
          this.errorMessage = 'Error al eliminar el cliente';
          console.error('Error deleting client:', error);
        }
      });
    }
  }

  // Cancelar edición
  cancelEdit() {
    this.isEditing = false;
    this.clienteForm.reset();
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
    this.loadClientes();
  }

  // Validar campo del formulario
  isFieldInvalid(fieldName: string): boolean {
    const field = this.clienteForm.get(fieldName);
    return !!(field && field.invalid && (field.dirty || field.touched));
  }

  // Obtener mensaje de error para campo
  getFieldError(fieldName: string): string {
    const field = this.clienteForm.get(fieldName);
    if (field?.errors) {
      if (field.errors['required']) return 'Este campo es requerido';
      if (field.errors['maxlength']) return 'Máximo 100 caracteres';
      if (field.errors['pattern']) return 'El teléfono debe tener 10 dígitos';
    }
    return '';
  }
}
