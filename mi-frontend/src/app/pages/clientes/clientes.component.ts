// clientes.component.ts
import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { ClientesService } from '../../core/services/clientes.service';
import { ModalComponent } from '../../layout/modal/modal.component';

@Component({
  selector: 'app-clientes',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, ModalComponent],
  templateUrl: './clientes.component.html',
  styleUrls: ['./clientes.component.css']
})
export class ClientesComponent implements OnInit {
  private clientesService = inject(ClientesService);
  private fb = inject(FormBuilder);

  // Listas y estados
  clientes: any[] = [];
  filteredClientes: Cliente[] = [];
  
  // Formularios
  clienteForm: FormGroup;
  searchForm: FormGroup;
  
  // Estados de UI
  isLoading = false;
  errorMessage = '';
  successMessage = '';
  searchMode: 'all' | 'user' | 'nombre' = 'all';
  
  // Estados de modales
  showCreateModal = false;
  showEditModal = false;
  showDeleteModal = false;
  
  // Datos seleccionados
  selectedCliente: any = null;

  // Usuario actual (debería venir de tu servicio de autenticación)
  currentUserId: number = 1;

  constructor() {
    // Formulario para crear/editar clientes
    this.clienteForm = this.fb.group({
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
    this.loadClientes();
  }

  // Cargar todos los clientes
  loadClientes() {
    this.isLoading = true;
    this.errorMessage = '';
    this.searchMode = 'all';
    
    this.clientesService.getAll().subscribe({
      next: (response) => {
        this.isLoading = false;
        if (response.code === 0 && response.data) {
          this.clientes = response.data;
          this.filteredClientes = response.data;
        } else {
          this.errorMessage = response.message || 'Error al cargar clientes';
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
          this.errorMessage = response.message || 'No se encontraron clientes';
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
    this.isLoading = true;
    this.clientesService.getByUserId(this.currentUserId).subscribe({
      next: (response) => {
        this.isLoading = false;
        if (response.code === 0 && response.data) {
          this.filteredClientes = response.data;
          this.searchMode = 'user';
        } else {
          this.errorMessage = response.message || 'No tienes clientes asignados';
        }
      },
      error: (error) => {
        this.isLoading = false;
        this.errorMessage = 'Error al buscar clientes del usuario';
        console.error('Error searching user clients:', error);
      }
    });
  }

  // Métodos para abrir modales
  openCreateModal() {
    this.clienteForm.reset();
    this.showCreateModal = true;
  }

  openEditModal(cliente: Cliente) {
    this.selectedCliente = cliente;
    this.clienteForm.patchValue({
      nombre: cliente.nombre,
      telefono: cliente.telefono || '',
      contacto: cliente.contacto || ''
    });
    this.showEditModal = true;
  }

  openDeleteModal(cliente: Cliente) {
    this.selectedCliente = cliente;
    this.showDeleteModal = true;
  }

  // Métodos para cerrar modales
  closeCreateModal() {
    this.showCreateModal = false;
    this.clienteForm.reset();
  }

  closeEditModal() {
    this.showEditModal = false;
    this.selectedCliente = null;
  }

  closeDeleteModal() {
    this.showDeleteModal = false;
    this.selectedCliente = null;
  }

  // Acciones CRUD
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
            this.closeCreateModal();
            this.loadClientes();
            this.clearMessagesAfterDelay();
          } else {
            this.errorMessage = response.message || 'Error al crear cliente';
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

  onUpdate() {
    if (this.clienteForm.valid && this.selectedCliente) {
      this.isLoading = true;
      const nombreOriginal = this.selectedCliente.nombre;
      const updateData = {
        telefono: this.clienteForm.get('telefono')?.value,
        contacto: this.clienteForm.get('contacto')?.value
      };

      this.clientesService.update(nombreOriginal, updateData).subscribe({
        next: (response) => {
          this.isLoading = false;
          if (response.code === 0) {
            this.successMessage = 'Cliente actualizado exitosamente';
            this.closeEditModal();
            this.loadClientes();
            this.clearMessagesAfterDelay();
          } else {
            this.errorMessage = response.message || 'Error al actualizar cliente';
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

  onDelete() {
    if (this.selectedCliente) {
      this.isLoading = true;
      this.clientesService.delete(this.selectedCliente.nombre).subscribe({
        next: (response) => {
          this.isLoading = false;
          if (response.code === 0) {
            this.successMessage = 'Cliente eliminado exitosamente';
            this.closeDeleteModal();
            this.loadClientes();
            this.clearMessagesAfterDelay();
          } else {
            this.errorMessage = response.message || 'Error al eliminar cliente';
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

  // Resetear búsqueda
  resetSearch() {
    this.searchForm.get('searchTerm')?.setValue('');
    this.loadClientes();
  }

  // Métodos auxiliares
  private clearMessagesAfterDelay() {
    setTimeout(() => {
      this.errorMessage = '';
      this.successMessage = '';
    }, 5000);
  }

  isFieldInvalid(fieldName: string): boolean {
    const field = this.clienteForm.get(fieldName);
    return !!(field && field.invalid && (field.dirty || field.touched));
  }

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

// Tipo local mínimo para compilar; reemplaza con la definición real si la exportas desde el servicio.
interface Cliente {
  id?: number;
  nombre?: string;
  email?: string;
  [k: string]: any;
}
