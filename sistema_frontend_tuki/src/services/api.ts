import axios from 'axios';
import { getCurrentUser, logout } from '../services/authService';

const api = axios.create({
    baseURL: import.meta.env.VITE_API_URL,
    headers: {
        'Content-Type': 'application/json',
    },
});

api.interceptors.request.use(
    (config) => {
        const user = getCurrentUser();
        if (user && user.accessToken) {
            config.headers.Authorization = `Bearer ${user.accessToken}`;
        }
        return config;
    },
    (error) => Promise.reject(error)
);

api.interceptors.response.use(
    (response) => response,
    (error) => {
        if (error.response && error.response.status === 401) {
            logout();
            window.location.href = '/login';
        }
        return Promise.reject(error);
    }
);

api.interceptors.response.use(
  (response) => response,
  (error) => {
    // Si el servidor responde con 503 MANTENIMIENTO
    if (error.response && error.response.status === 503 && error.response.data.error === "MANTENIMIENTO") {
      // Limpiamos la sesión (opcional, o solo los redirigimos)
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      
      // Redirigir a la pantalla de mantenimiento
      window.location.href = '/mantenimiento';
    }
    return Promise.reject(error);
  }
);

export default api;
