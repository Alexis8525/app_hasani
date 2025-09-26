// helpers/dateFormatter.ts
export function toUTCString(date: Date): string {
    return date.toISOString().replace('T', ' ').replace('Z', '');
  }
  
  export function parseDatabaseDate(dateString: string): Date {
    // Asegurar que la fecha se parsea correctamente como UTC
    return new Date(dateString + 'Z');
  }
  