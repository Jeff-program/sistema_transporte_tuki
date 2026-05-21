import { Navigate, Outlet } from 'react-router-dom';
import { getUserFromToken } from '../services/authService';

interface ProtectedRouteProps {
    allowedRoles: string[];
}

const ProtectedRoute = ({ allowedRoles }: ProtectedRouteProps) => {
    const user = getUserFromToken();

    // 1. Si no hay usuario logueado, lo manda al login
    if (!user) {
        return <Navigate to="/login" replace />;
    }

    // 2. Si el usuario no tiene el rol permitido para esta ruta
    if (!allowedRoles.includes(user.rol)) {
        
        // Lo redirigimos a su pantalla principal correspondiente según su rol
        if (user.rol === 'SUPER_ADMIN') {
            return <Navigate to="/superadmin/panel" replace />;
        }
        
        if (user.rol === 'ASESOR' || user.rol === 'AGENCIA') {
            return <Navigate to="/asesor/dashboard" replace />;
        }
        
        // Por defecto (si es ADMIN o ADMINISTRADOR) lo manda al dashboard de admin
        return <Navigate to="/admin/dashboard" replace />;
    }

    // 3. Si tiene permiso, lo deja pasar a la ruta solicitada
    return <Outlet />;
};

export default ProtectedRoute;