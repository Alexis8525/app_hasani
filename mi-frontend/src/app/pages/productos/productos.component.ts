// productos.component.ts
import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { ProductosService, Producto, StockAlerta } from '../../core/services/productos.service';

@Component({
  selector: 'app-productos',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './productos.component.html',
  styleUrls: ['./productos.component.css']
})
export class ProductosComponent implements OnInit {
  private productosService = inject(ProductosService);
  private fb = inject(FormBuilder);

  // Listas y estados
  productos: Producto[] = [];
  filteredProductos: Producto[] = [];
  stockAlertas: StockAlerta[] = [];
  
  // Formularios
  productoForm: FormGroup;
  searchForm: FormGroup;
  
  // Estados de UI
  isLoading = false;
  isEditing = false;
  errorMessage = '';
  successMessage = '';
  searchMode: 'all' | 'search' | 'low-stock' = 'all';
  showStockAlerts = false;
  searchOriginalTerm = '';

  constructor() {
    // Formulario para crear/editar productos
    this.productoForm = this.fb.group({
      codigo: ['', [Validators.required, Validators.maxLength(50)]],
      nombre: ['', [Validators.required, Validators.maxLength(100)]],
      descripcion: ['', [Validators.maxLength(500)]],
      categoria: ['', [Validators.maxLength(100)]],
      unidad: ['', [Validators.required, Validators.maxLength(20)]],
      stock_minimo: [0, [Validators.required, Validators.min(0)]],
      stock_actual: [0, [Validators.required, Validators.min(0)]],
      id_proveedor: [null]
    });

    // Formulario para búsqueda
    this.searchForm = this.fb.group({
      searchTerm: ['']
    });
  }

  ngOnInit() {
    this.loadProductos();
  }

  // Cargar todos los productos
  loadProductos() {
    this.isLoading = true;
    this.errorMessage = '';
    
    this.productosService.getAll().subscribe({
      next: (response) => {
        this.isLoading = false;
        if (response.code === 0 && response.data) {
          this.productos = response.data;
          this.filteredProductos = response.data;
          this.searchMode = 'all';
          this.searchOriginalTerm = '';
        } else {
          this.errorMessage = response.message;
        }
      },
      error: (error) => {
        this.isLoading = false;
        this.errorMessage = 'Error al cargar los productos';
        console.error('Error loading products:', error);
      }
    });
  }

  // Buscar por nombre
  searchByNombre() {
    const nombre = this.searchForm.get('searchTerm')?.value?.trim();
    if (!nombre) {
      this.loadProductos();
      return;
    }

    this.isLoading = true;
    this.productosService.getByNombre(nombre).subscribe({
      next: (response) => {
        this.isLoading = false;
        if (response.code === 0 && response.data) {
          this.filteredProductos = response.data;
          this.searchMode = 'search';
          this.searchOriginalTerm = response.busquedaOriginal || nombre;
        } else {
          this.errorMessage = response.message;
        }
      },
      error: (error) => {
        this.isLoading = false;
        this.errorMessage = 'Error al buscar productos';
        console.error('Error searching products:', error);
      }
    });
  }

  // Cargar productos con stock bajo
  loadLowStock() {
    this.isLoading = true;
    this.productosService.getLowStock().subscribe({
      next: (response) => {
        this.isLoading = false;
        if (response.code === 0 && response.data) {
          this.filteredProductos = response.data;
          this.searchMode = 'low-stock';
          this.searchOriginalTerm = '';
        } else {
          this.errorMessage = response.message;
        }
      },
      error: (error) => {
        this.isLoading = false;
        this.errorMessage = 'Error al cargar productos con stock bajo';
        console.error('Error loading low stock products:', error);
      }
    });
  }

  // Verificar alertas de stock
  checkStockAlerts() {
    this.isLoading = true;
    this.productosService.checkStockAlerts().subscribe({
      next: (response) => {
        this.isLoading = false;
        if (response.code === 0 && response.data) {
          this.stockAlertas = response.data;
          this.showStockAlerts = true;
          this.successMessage = response.message;
          this.clearMessagesAfterDelay();
        } else {
          this.errorMessage = response.message;
        }
      },
      error: (error) => {
        this.isLoading = false;
        this.errorMessage = 'Error al verificar alertas de stock';
        console.error('Error checking stock alerts:', error);
      }
    });
  }

  // Crear nuevo producto
  onCreate() {
    if (this.productoForm.valid) {
      this.isLoading = true;
      const productoData = this.productoForm.value;

      this.productosService.create(productoData).subscribe({
        next: (response) => {
          this.isLoading = false;
          if (response.code === 0) {
            this.successMessage = 'Producto creado exitosamente';
            this.productoForm.reset({
              stock_minimo: 0,
              stock_actual: 0
            });
            this.loadProductos(); // Recargar la lista
            this.clearMessagesAfterDelay();
          } else {
            this.errorMessage = response.message;
          }
        },
        error: (error) => {
          this.isLoading = false;
          this.errorMessage = 'Error al crear el producto';
          console.error('Error creating product:', error);
        }
      });
    }
  }

  // Preparar formulario para edición
  onEdit(producto: Producto) {
    this.isEditing = true;
    this.productoForm.patchValue({
      codigo: producto.codigo,
      nombre: producto.nombre,
      descripcion: producto.descripcion || '',
      categoria: producto.categoria || '',
      unidad: producto.unidad,
      stock_minimo: producto.stock_minimo,
      stock_actual: producto.stock_actual,
      id_proveedor: producto.id_proveedor || null
    });
  }

  // Actualizar producto
  onUpdate() {
    if (this.productoForm.valid) {
      this.isLoading = true;
      const nombreOriginal = this.productoForm.get('nombre')?.value;
      const updateData = {
        codigo: this.productoForm.get('codigo')?.value,
        descripcion: this.productoForm.get('descripcion')?.value,
        categoria: this.productoForm.get('categoria')?.value,
        unidad: this.productoForm.get('unidad')?.value,
        stock_minimo: this.productoForm.get('stock_minimo')?.value,
        stock_actual: this.productoForm.get('stock_actual')?.value,
        id_proveedor: this.productoForm.get('id_proveedor')?.value
      };

      this.productosService.update(nombreOriginal, updateData).subscribe({
        next: (response) => {
          this.isLoading = false;
          if (response.code === 0) {
            this.successMessage = 'Producto actualizado exitosamente';
            this.cancelEdit();
            this.loadProductos();
            this.clearMessagesAfterDelay();
          } else {
            this.errorMessage = response.message;
          }
        },
        error: (error) => {
          this.isLoading = false;
          this.errorMessage = 'Error al actualizar el producto';
          console.error('Error updating product:', error);
        }
      });
    }
  }

  // Eliminar producto
  onDelete(nombre: string) {
    if (confirm(`¿Estás seguro de que quieres eliminar el producto "${nombre}"?`)) {
      this.isLoading = true;
      this.productosService.delete(nombre).subscribe({
        next: (response) => {
          this.isLoading = false;
          if (response.code === 0) {
            this.successMessage = 'Producto eliminado exitosamente';
            this.loadProductos();
            this.clearMessagesAfterDelay();
          } else {
            this.errorMessage = response.message;
          }
        },
        error: (error) => {
          this.isLoading = false;
          this.errorMessage = 'Error al eliminar el producto';
          console.error('Error deleting product:', error);
        }
      });
    }
  }

  // Cancelar edición
  cancelEdit() {
    this.isEditing = false;
    this.productoForm.reset({
      stock_minimo: 0,
      stock_actual: 0
    });
  }

  // Cerrar alertas de stock
  closeStockAlerts() {
    this.showStockAlerts = false;
    this.stockAlertas = [];
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
    this.searchOriginalTerm = '';
    this.loadProductos();
  }

  // Validar campo del formulario
  isFieldInvalid(fieldName: string): boolean {
    const field = this.productoForm.get(fieldName);
    return !!(field && field.invalid && (field.dirty || field.touched));
  }

  // Obtener mensaje de error para campo
  getFieldError(fieldName: string): string {
    const field = this.productoForm.get(fieldName);
    if (field?.errors) {
      if (field.errors['required']) return 'Este campo es requerido';
      if (field.errors['maxlength']) {
        const max = field.errors['maxlength'].requiredLength;
        return `Máximo ${max} caracteres`;
      }
      if (field.errors['min']) return 'El valor no puede ser negativo';
      if (field.errors['pattern']) return 'Formato inválido';
    }
    return '';
  }

  // Verificar si se puede editar el nombre (solo en creación)
  canEditNombre(): boolean {
    return !this.isEditing;
  }

  // Obtener clase CSS para el nivel de stock
  getStockLevelClass(producto: Producto): string {
    if (producto.stock_actual <= producto.stock_minimo) {
      return 'stock-critico';
    } else if (producto.stock_actual <= producto.stock_minimo * 2) {
      return 'stock-bajo';
    } else {
      return 'stock-normal';
    }
  }

  // Obtener texto para el nivel de stock
  getStockLevelText(producto: Producto): string {
    if (producto.stock_actual <= producto.stock_minimo) {
      return 'CRÍTICO';
    } else if (producto.stock_actual <= producto.stock_minimo * 2) {
      return 'BAJO';
    } else {
      return 'NORMAL';
    }
  }

  // Obtener nivel de alerta para las alertas de stock
  getAlertLevelClass(alerta: StockAlerta): string {
    switch (alerta.nivel_alerta) {
      case 'CRÍTICO': return 'alerta-critica';
      case 'ALTO': return 'alerta-alta';
      case 'MEDIO': return 'alerta-media';
      default: return 'alerta-baja';
    }
  }
}
