// movimientos.component.ts
import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { MovimientosService, Movimiento, ProductoStockBajo } from '../../core/services/movimentos.service';
import { ModalComponent } from '../../layout/modal/modal.component';
import { RouterLink, RouterLinkActive } from '@angular/router';

@Component({
  selector: 'app-movimientos',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, ModalComponent, RouterLink, RouterLinkActive],
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
  searchMode: 'all' | 'producto' | 'date-range' = 'all';
  searchOriginalTerm = '';
  
  // Estados de modales
  showCreateModal = false;
  showSearchModal = false;
  showStockAlertsModal = false;
  
  // Usuario actual (debería venir del servicio de autenticación)
  currentResponsableId: number = 1;

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
    this.searchMode = 'all';
    
    this.movimientosService.getAll().subscribe({
      next: (response) => {
        this.isLoading = false;
        if (response.code === 0 && response.data) {
          this.movimientos = response.data;
          this.filteredMovimientos = response.data;
          this.searchOriginalTerm = '';
        } else {
          this.errorMessage = response.message || 'Error al cargar movimientos';
        }
      },
      error: (error) => {
        this.isLoading = false;
        this.errorMessage = 'Error al cargar los movimientos';
        console.error('Error loading movements:', error);
      }
    });
  }

  // Métodos para abrir modales
  openCreateModal() {
    this.movimientoForm.reset({
      tipo: 'Entrada',
      cantidad: 1,
      id_cliente: null
    });
    this.showCreateModal = true;
  }

  openSearchModal() {
    this.searchForm.reset();
    this.dateRangeForm.reset();
    this.showSearchModal = true;
  }

  openStockAlertsModal() {
    this.showStockAlertsModal = true;
    this.loadProductosStockBajo();
  }

  // Métodos para cerrar modales
  closeCreateModal() {
    this.showCreateModal = false;
    this.movimientoForm.reset({
      tipo: 'Entrada',
      cantidad: 1,
      id_cliente: null
    });
  }

  closeSearchModal() {
    this.showSearchModal = false;
    this.searchForm.reset();
    this.dateRangeForm.reset();
  }

  closeStockAlertsModal() {
    this.showStockAlertsModal = false;
    this.productosStockBajo = [];
  }

  // Acciones CRUD
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
            this.successMessage = 'Movimiento registrado exitosamente';
            this.closeCreateModal();
            this.loadMovimientos();
            this.clearMessagesAfterDelay();
          } else {
            this.errorMessage = response.message || 'Error al registrar movimiento';
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

  // Búsquedas
  searchByProducto() {
    const nombreProducto = this.searchForm.get('searchTerm')?.value?.trim();
    if (!nombreProducto) {
      this.errorMessage = 'Por favor ingrese un término de búsqueda';
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
          this.closeSearchModal();
          this.successMessage = `Se encontraron ${this.filteredMovimientos.length} movimientos`;
          this.clearMessagesAfterDelay();
        } else {
          this.errorMessage = response.message || 'No se encontraron movimientos';
        }
      },
      error: (error) => {
        this.isLoading = false;
        this.errorMessage = 'Error al buscar movimientos del producto';
        console.error('Error searching product movements:', error);
      }
    });
  }

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
            this.closeSearchModal();
            this.successMessage = `Se encontraron ${this.filteredMovimientos.length} movimientos en el rango de fechas`;
            this.clearMessagesAfterDelay();
          } else {
            this.errorMessage = response.message || 'No se encontraron movimientos en el rango de fechas';
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

  // Alertas de stock
  loadProductosStockBajo() {
    this.isLoading = true;
    this.movimientosService.getProductosStockBajo().subscribe({
      next: (response) => {
        this.isLoading = false;
        if (response.code === 0 && response.data) {
          this.productosStockBajo = response.data;
          this.successMessage = `Se encontraron ${this.productosStockBajo.length} productos con stock bajo`;
          this.clearMessagesAfterDelay();
        } else {
          this.errorMessage = response.message || 'No se encontraron productos con stock bajo';
        }
      },
      error: (error) => {
        this.isLoading = false;
        this.errorMessage = 'Error al cargar productos con stock bajo';
        console.error('Error loading low stock products:', error);
      }
    });
  }

  // Resetear búsqueda
  resetSearch() {
    this.searchForm.reset();
    this.dateRangeForm.reset();
    this.closeSearchModal();
    this.loadMovimientos();
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
      if (field.errors['maxlength']) {
        const max = field.errors['maxlength'].requiredLength;
        return `Máximo ${max} caracteres`;
      }
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

  getCurrentDateTime(): string {
    return new Date().toLocaleString('es-ES');
  }

  getTipoClass(tipo: string): string {
    return tipo === 'Entrada' ? 'tipo-entrada' : 'tipo-salida';
  }

  getTipoIcon(tipo: string): string {
    return tipo === 'Entrada' ? '📥' : '📤';
  }

  getTipoText(tipo: string): string {
    return tipo === 'Entrada' ? 'Entrada de Inventario' : 'Salida de Inventario';
  }

  getAlertLevelClass(alerta: ProductoStockBajo): string {
    switch (alerta.nivel_alerta) {
      case 'CRÍTICO': return 'critico';
      case 'ALTO': return 'alto';
      case 'MEDIO': return 'medio';
      default: return 'bajo';
    }
  }

  getAlertIcon(nivel: string): string {
    switch (nivel) {
      case 'CRÍTICO': return '🚨';
      case 'ALTO': return '⚠️';
      case 'MEDIO': return '🔶';
      default: return 'ℹ️';
    }
  }
}
