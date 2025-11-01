// movimientos.component.ts
import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { MovimientosService, Movimiento, ProductoStockBajo } from '../../core/services/movimentos.service';

@Component({
  selector: 'app-movimientos',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './movimientos.component.html',
  styleUrls: ['./movimientos.component.css']
})
export class MovimientosComponent implements OnInit {
  private movimientosService = inject(MovimientosService);
  private fb = inject(FormBuilder);

  // Listas y estados
  movimientos: Movimiento[] = [];
  filteredMovimientos: Movimiento[] = [];
  productosStockBajo: ProductoStockBajo[] = [];
  
  // Formularios
  movimientoForm: FormGroup;
  searchForm: FormGroup;
  dateRangeForm: FormGroup;
  
  // Estados de UI
  isLoading = false;
  errorMessage = '';
  successMessage = '';
  searchMode: 'all' | 'producto' | 'date-range' | 'stock-alerts' = 'all';
  showStockAlerts = false;
  searchOriginalTerm = '';
  currentResponsableId: number = 1; // Esto debería venir del servicio de autenticación

  constructor() {
    // Formulario para crear movimientos
    this.movimientoForm = this.fb.group({
      tipo: ['Entrada', [Validators.required]],
      nombreProducto: ['', [Validators.required, Validators.maxLength(100)]],
      cantidad: [1, [Validators.required, Validators.min(1), Validators.max(1000000)]],
      referencia: ['', [Validators.maxLength(200)]],
      id_cliente: [null]
    });

    // Formulario para búsqueda por producto
    this.searchForm = this.fb.group({
      searchTerm: ['']
    });

    // Formulario para rango de fechas
    this.dateRangeForm = this.fb.group({
      fechaInicio: ['', [Validators.required]],
      fechaFin: ['', [Validators.required]]
    });
  }

  ngOnInit() {
    this.loadMovimientos();
  }

  // Cargar todos los movimientos
  loadMovimientos() {
    this.isLoading = true;
    this.errorMessage = '';
    
    this.movimientosService.getAll().subscribe({
      next: (response) => {
        this.isLoading = false;
        if (response.code === 0 && response.data) {
          this.movimientos = response.data;
          this.filteredMovimientos = response.data;
          this.searchMode = 'all';
          this.searchOriginalTerm = '';
        } else {
          this.errorMessage = response.message;
        }
      },
      error: (error) => {
        this.isLoading = false;
        this.errorMessage = 'Error al cargar los movimientos';
        console.error('Error loading movements:', error);
      }
    });
  }

  // Crear nuevo movimiento
  onCreate() {
    if (this.movimientoForm.valid) {
      this.isLoading = true;
      const movimientoData = {
        ...this.movimientoForm.value,
        responsable: this.currentResponsableId
      };

      this.movimientosService.create(movimientoData).subscribe({
        next: (response) => {
          this.isLoading = false;
          if (response.code === 0) {
            this.successMessage = 'Movimiento creado exitosamente';
            this.movimientoForm.reset({
              tipo: 'Entrada',
              cantidad: 1,
              id_cliente: null
            });
            this.loadMovimientos(); // Recargar la lista
            this.clearMessagesAfterDelay();
          } else {
            this.errorMessage = response.message;
          }
        },
        error: (error) => {
          this.isLoading = false;
          this.errorMessage = error.error?.message || 'Error al crear el movimiento';
          console.error('Error creating movement:', error);
        }
      });
    }
  }

  // Buscar por producto
  searchByProducto() {
    const nombreProducto = this.searchForm.get('searchTerm')?.value?.trim();
    if (!nombreProducto) {
      this.loadMovimientos();
      return;
    }

    this.isLoading = true;
    this.movimientosService.getByProducto(nombreProducto).subscribe({
      next: (response) => {
        this.isLoading = false;
        if (response.code === 0 && response.data) {
          this.filteredMovimientos = response.data;
          this.searchMode = 'producto';
          this.searchOriginalTerm = response.busquedaOriginal || nombreProducto;
        } else {
          this.errorMessage = response.message;
        }
      },
      error: (error) => {
        this.isLoading = false;
        this.errorMessage = 'Error al buscar movimientos del producto';
        console.error('Error searching product movements:', error);
      }
    });
  }

  // Buscar por rango de fechas
  searchByDateRange() {
    if (this.dateRangeForm.valid) {
      const { fechaInicio, fechaFin } = this.dateRangeForm.value;

      // Validar que la fecha de inicio no sea mayor a la fecha fin
      if (new Date(fechaInicio) > new Date(fechaFin)) {
        this.errorMessage = 'La fecha de inicio no puede ser mayor a la fecha de fin';
        return;
      }

      this.isLoading = true;
      this.movimientosService.getByDateRange(fechaInicio, fechaFin).subscribe({
        next: (response) => {
          this.isLoading = false;
          if (response.code === 0 && response.data) {
            this.filteredMovimientos = response.data;
            this.searchMode = 'date-range';
            this.searchOriginalTerm = '';
          } else {
            this.errorMessage = response.message;
          }
        },
        error: (error) => {
          this.isLoading = false;
          this.errorMessage = 'Error al buscar movimientos por fecha';
          console.error('Error searching date range movements:', error);
        }
      });
    }
  }

  // Verificar alertas de stock
  checkStockAlerts() {
    this.isLoading = true;
    this.movimientosService.verificarAlertasStock().subscribe({
      next: (response) => {
        this.isLoading = false;
        if (response.code === 0 && response.data) {
          this.productosStockBajo = response.data;
          this.showStockAlerts = true;
          this.searchMode = 'stock-alerts';
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

  // Obtener productos con stock bajo
  loadProductosStockBajo() {
    this.isLoading = true;
    this.movimientosService.getProductosStockBajo().subscribe({
      next: (response) => {
        this.isLoading = false;
        if (response.code === 0 && response.data) {
          this.productosStockBajo = response.data;
          this.showStockAlerts = true;
          this.searchMode = 'stock-alerts';
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

  // Cerrar alertas de stock
  closeStockAlerts() {
    this.showStockAlerts = false;
    this.productosStockBajo = [];
  }

  // Resetear búsqueda
  resetSearch() {
    this.searchForm.get('searchTerm')?.setValue('');
    this.dateRangeForm.reset();
    this.searchMode = 'all';
    this.searchOriginalTerm = '';
    this.loadMovimientos();
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
      if (field.errors['maxlength']) {
        const max = field.errors['maxlength'].requiredLength;
        return `Máximo ${max} caracteres`;
      }
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

  // Obtener nivel de alerta para las alertas de stock
  getAlertLevelClass(alerta: ProductoStockBajo): string {
    switch (alerta.nivel_alerta) {
      case 'CRÍTICO': return 'alerta-critica';
      case 'ALTO': return 'alerta-alta';
      case 'MEDIO': return 'alerta-media';
      default: return 'alerta-baja';
    }
  }

  // Obtener texto descriptivo para el tipo de movimiento
  getTipoText(tipo: string): string {
    return tipo === 'Entrada' ? 'Entrada de Inventario' : 'Salida de Inventario';
  }
}
