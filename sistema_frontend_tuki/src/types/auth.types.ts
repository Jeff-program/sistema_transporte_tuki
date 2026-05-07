export interface AuthResponse {
    accessToken: string;
    tokenType: string;
}

export interface User {
    email: string;
    idUsuario: number; 
    rol: string;       
    exp?: number;
}

export interface LoginDTO {
    email: string;
    password: string;
}