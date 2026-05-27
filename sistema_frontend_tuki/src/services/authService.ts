import axios from 'axios';
import { jwtDecode } from "jwt-decode";
import type { User } from '../types/auth.types'; 

const API_URL = `${import.meta.env.VITE_API_URL}/auth`;

interface LoginResponse {
    accessToken: string;
    tokenType: string;
    idUsuario: number;
    email: string;
    nombreCompleto: string;
    rol: string;
}

export const login = async (email: string, password: string): Promise<LoginResponse> => {
    const response = await axios.post<LoginResponse>(`${API_URL}/login`, { email, password });
    if (response.data.accessToken) {
        localStorage.setItem('user', JSON.stringify(response.data));
    }
    return response.data;
};

export const logout = (): void => {
    localStorage.clear();   // Elimina tokens e IDs residuales
    sessionStorage.clear(); // Limpia memoria volátil
    window.location.href = '/login'; // Fuerza la recarga al login
};

export const getCurrentUser = (): any => {
    const userStr = localStorage.getItem('user');
    if (userStr) {
        const userData = JSON.parse(userStr);
        
        userData.idUsuario = userData.idUsuario 
                          || userData.id 
                          || userData.usuario?.idUsuario 
                          || userData.usuario?.id;
        if (!userData.idUsuario && userData.accessToken) {
            try {
                const decoded: any = jwtDecode(userData.accessToken);
                userData.idUsuario = decoded.idUsuario || decoded.id;
            } catch (error) {
                console.error("Error al decodificar el token para rescatar el ID", error);
            }
        }
        
        return userData;
    }
    return null;
};

export const getUserFromToken = (): User | null => {
    const authData = getCurrentUser();
    if (!authData?.accessToken) return null;
    try {
        const decoded: any = jwtDecode(authData.accessToken);
        return {
            email: decoded.sub,
            idUsuario: decoded.idUsuario, 
            rol: decoded.rol,
            exp: decoded.exp
        };
    } catch (error) {
        return null;
    }
};

export const solicitarRecuperacion = async (email: string) => {
    const res = await axios.post(`${API_URL}/olvide-password`, { email });
    return res.data;
};

export const verificarCodigoRecuperacion = async (email: string, codigo: string) => {
    const res = await axios.post(`${API_URL}/verificar-codigo`, { email, codigo });
    return res.data;
};

export const restablecerPassword = async (email: string, codigo: string, nuevaPassword: string) => {
    const res = await axios.post(`${API_URL}/restablecer-password`, { email, codigo, nuevaPassword });
    return res.data;
};