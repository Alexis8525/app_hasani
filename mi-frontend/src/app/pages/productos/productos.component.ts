import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { ProductosService, Producto, StockAlerta, SearchCriteria } from '../../core/services/productos.service';
import { ModalComponent } from '../../layout/modal/modal.component';
import { debounceTime, distinctUntilChanged } from 'rxjs/operators';

@Component({
  selector: 'app-productos',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, ModalComponent],
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
  searchMode: 'all' | 'search' | 'low-stock' | 'none' = 'none';
  showStockAlerts = false;
  searchOriginalTerm = '';

  // Estados de modales
  showCreateModal = false;
  showEditModal = false;
  showDeleteModal = false;
  showAlertsModal = false;
  productoToDelete: string | null = null;
  productoToEdit: Producto | null = null;

  // Categorías disponibles
  categoriasDisponibles: string[] = [
    'Electrónica',
    'Ropa',
    'Hogar',
    'Deportes',
    'Juguetes',
    'Alimentos',
    'Bebidas',
    'Limpieza',
    'Oficina',
    'Salud',
    'Belleza',
    'Jardín',
    'Automotriz',
    'Tecnología',
    'Libros'
  ];

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

    // Formulario para búsqueda avanzada
    this.searchForm = this.fb.group({
      termino: [''],
      codigo: [''],
      categoria: [''],
      nombre: ['']
    });
  }

  ngOnInit() {
    // Configurar búsqueda en tiempo real
    this.setupRealTimeSearch();
    // Cargar categorías desde productos existentes cuando se carguen los productos
    this.loadProductos();
  }

  // Configurar búsqueda en tiempo real
  private setupRealTimeSearch() {
    // Escuchar cambios en los campos de búsqueda con debounce
    this.searchForm.valueChanges
      .pipe(
        debounceTime(400), // Esperar 400ms después de cada tecleo
        distinctUntilChanged() // Solo emitir si el valor cambió
      )
      .subscribe(value => {
        // Solo buscar si hay al menos un campo con valor
        const hasSearchValue = Object.values(value).some(val => 
          val && val.toString().trim().length > 0
        );
        
        if (hasSearchValue) {
          this.searchAdvanced();
        } else if (this.searchMode === 'search') {
          // Si se limpió la búsqueda, volver a mostrar todos los productos
          this.loadProductos();
        }
      });
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
          // Actualizar categorías disponibles desde los productos
          this.updateCategoriasFromProducts();
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

  // Actualizar categorías desde productos existentes
  private updateCategoriasFromProducts() {
    const categoriasSet = new Set<string>();
    
    // Agregar categorías predefinidas
    this.categoriasDisponibles.forEach(cat => categoriasSet.add(cat));
    
    // Agregar categorías de productos existentes
    this.productos.forEach(producto => {
      if (producto.categoria && producto.categoria.trim().length > 0) {
        categoriasSet.add(producto.categoria);
      }
    });
    
    this.categoriasDisponibles = Array.from(categoriasSet).sort();
  }

  // Búsqueda avanzada
  searchAdvanced() {
    const criteria: SearchCriteria = {
      termino: this.searchForm.get('termino')?.value?.trim() || undefined,
      codigo: this.searchForm.get('codigo')?.value?.trim() || undefined,
      categoria: this.searchForm.get('categoria')?.value?.trim() || undefined,
      nombre: this.searchForm.get('nombre')?.value?.trim() || undefined
    };

    // Si no hay criterios, no hacer nada
    if (!Object.values(criteria).some(val => val !== undefined)) {
      return;
    }

    this.isLoading = true;
    this.productosService.searchAdvanced(criteria).subscribe({
      next: (response) => {
        this.isLoading = false;
        if (response.code === 0 && response.data) {
          this.filteredProductos = response.data;
          this.searchMode = 'search';
          this.searchOriginalTerm = this.buildSearchDescription(criteria);
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

  // Construir descripción de búsqueda
  private buildSearchDescription(criteria: SearchCriteria): string {
    const parts: string[] = [];
    
    if (criteria.termino) parts.push(`"${criteria.termino}"`);
    if (criteria.nombre) parts.push(`nombre: "${criteria.nombre}"`);
    if (criteria.codigo) parts.push(`código: "${criteria.codigo}"`);
    if (criteria.categoria) parts.push(`categoría: "${criteria.categoria}"`);
    
    return parts.join(' | ');
  }

  // Búsqueda por nombre (mantener para compatibilidad)
  searchByNombre() {
    const nombre = this.searchForm.get('termino')?.value?.trim();
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
          this.showAlertsModal = true;
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

  // Abrir modal de creación
  openCreateModal() {
    this.showCreateModal = true;
    this.isEditing = false;
    this.productoForm.reset({
      stock_minimo: 0,
      stock_actual: 0,
      categoria: ''
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
            this.showCreateModal = false;
            this.productoForm.reset({
              stock_minimo: 0,
              stock_actual: 0,
              categoria: ''
            });
            this.loadProductos(); // Recargar la lista para incluir el nuevo producto
            this.clearMessagesAfterDelay();
          } else {
            this.errorMessage = response.message;
          }
        },
        error: (error) => {
          this.isLoading = false;
          this.errorMessage = error.error?.message || 'Error al crear el producto';
          console.error('Error creating product:', error);
        }
      });
    } else {
      // Marcar todos los campos como touched para mostrar errores
      Object.keys(this.productoForm.controls).forEach(key => {
        this.productoForm.get(key)?.markAsTouched();
      });
    }
  }

  // Abrir modal de edición
  openEditModal(producto: Producto) {
    this.productoToEdit = producto;
    this.showEditModal = true;
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
    if (this.productoForm.valid && this.productoToEdit) {
      this.isLoading = true;
      const nombreOriginal = this.productoToEdit.nombre;
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
            this.showEditModal = false;
            this.productoToEdit = null;
            this.loadProductos(); // Recargar la lista para reflejar cambios
            this.clearMessagesAfterDelay();
          } else {
            this.errorMessage = response.message;
          }
        },
        error: (error) => {
          this.isLoading = false;
          this.errorMessage = error.error?.message || 'Error al actualizar el producto';
          console.error('Error updating product:', error);
        }
      });
    } else {
      // Marcar todos los campos como touched para mostrar errores
      Object.keys(this.productoForm.controls).forEach(key => {
        this.productoForm.get(key)?.markAsTouched();
      });
    }
  }

  // Abrir modal de eliminación
  openDeleteModal(nombre: string) {
    this.productoToDelete = nombre;
    this.showDeleteModal = true;
  }

  // Eliminar producto
  onDelete() {
    if (this.productoToDelete) {
      this.isLoading = true;
      this.productosService.delete(this.productoToDelete).subscribe({
        next: (response) => {
          this.isLoading = false;
          if (response.code === 0) {
            this.successMessage = 'Producto eliminado exitosamente';
            this.showDeleteModal = false;
            this.productoToDelete = null;
            this.loadProductos(); // Recargar la lista
            this.clearMessagesAfterDelay();
          } else {
            this.errorMessage = response.message;
          }
        },
        error: (error) => {
          this.isLoading = false;
          this.errorMessage = error.error?.message || 'Error al eliminar el producto';
          console.error('Error deleting product:', error);
        }
      });
    }
  }

  // Cerrar modales
  closeCreateModal() {
    this.showCreateModal = false;
    this.productoForm.reset({
      stock_minimo: 0,
      stock_actual: 0,
      categoria: ''
    });
  }

  closeEditModal() {
    this.showEditModal = false;
    this.productoToEdit = null;
    this.productoForm.reset({
      stock_minimo: 0,
      stock_actual: 0,
      categoria: ''
    });
  }

  closeDeleteModal() {
    this.showDeleteModal = false;
    this.productoToDelete = null;
  }

  closeAlertsModal() {
    this.showAlertsModal = false;
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
    this.searchForm.reset({
      termino: '',
      codigo: '',
      categoria: '',
      nombre: ''
    });
    this.searchMode = 'none';
    this.searchOriginalTerm = '';
    this.filteredProductos = [];
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

  // Agregar nueva categoría
  agregarNuevaCategoria(event: any) {
    const nuevaCategoria = event.target.value.trim();
    if (nuevaCategoria && !this.categoriasDisponibles.includes(nuevaCategoria)) {
      this.categoriasDisponibles.push(nuevaCategoria);
      this.categoriasDisponibles.sort();
    }
  }
}
