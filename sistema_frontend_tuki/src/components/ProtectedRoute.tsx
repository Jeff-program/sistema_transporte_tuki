import { Navigate, Outlet } from 'react-router-dom';
import { getUserFromToken } from '../services/authService';

interface ProtectedRouteProps {
    allowedRoles: string[];
}

const ProtectedRoute = ({ allowedRoles }: ProtectedRouteProps) => {
    const user = getUserFromToken();

    if (!user) {
        return <Navigate to="/login" replace />;
    }

    if (!allowedRoles.includes(user.rol)) {
        if (user.rol === 'ASESOR' || user.rol === 'AGENCIA') {
            return <Navigate to="/asesor/dashboard" replace />;
        }
        return <Navigate to="/admin/dashboard" replace />;
    }

    return <Outlet />;
};

export default ProtectedRoute;