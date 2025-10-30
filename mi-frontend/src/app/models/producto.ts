export interface Producto {
    id_producto: number;
    nombre: string;
    descripcion: string;
    precio: number;
    stock_actual: number;
    stock_minimo: number;
    categoria: string;
    id_proveedor: number;
    created_at?: string;
    updated_at?: string;
}

export interface ProductoCreateRequest {
    nombre: string;
    descripcion: string;
    precio: number;
    stock_actual: number;
    stock_minimo: number;
    categoria: string;
    id_proveedor: number;
}
