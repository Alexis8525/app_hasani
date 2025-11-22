import { Injectable } from '@angular/core';

@Injectable({
  providedIn: 'root'
})
export class ExcelService {

  constructor() { }

  // Método para exportar datos a Excel
  exportToExcel(data: any[], filename: string, headers: string[] = []) {
    // En una implementación real, usarías una librería como:
    // - xlsx (SheetJS)
    // - exceljs
    // - ngx-excel-export
    
    // Esta es una implementación básica usando CSV como alternativa
    this.exportToCSV(data, filename, headers);
  }

  private exportToCSV(data: any[], filename: string, headers: string[] = []) {
    if (!data.length) return;

    // Usar headers proporcionados o generar desde las keys del primer objeto
    const csvHeaders = headers.length > 0 ? headers : Object.keys(data[0]);
    
    // Crear contenido CSV
    const csvContent = [
      csvHeaders.join(','), // Header row
      ...data.map(row => 
        csvHeaders.map(header => {
          const value = row[header] || '';
          // Escapar comas y comillas
          return `"${String(value).replace(/"/g, '""')}"`;
        }).join(',')
      )
    ].join('\n');

    // Crear y descargar archivo
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    
    link.setAttribute('href', url);
    link.setAttribute('download', `${filename}.csv`);
    link.style.visibility = 'hidden';
    
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }
}
