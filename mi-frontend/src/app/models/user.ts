export interface User {
    id: number;
    email: string;
    role: string;
    phone: string;
    created_at?: string;
    updated_at?: string;
}
export interface UserCreateRequest {
    email: string;
    password: string;
    role: string;
    phone: string;
}
