import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import ProtectedRoute from './components/ProtectedRoute';

import LoginPage from './pages/auth/LoginPage'; 
import DashboardAsesor from './pages/asesor/DashboardAsesor'; 
import VentaPage from './pages/asesor/VentaPage';
import PasajerosPage from './pages/asesor/PasajerosPage';
import PerfilPage from './pages/asesor/PerfilPage';
import DashboardAdmin from './pages/admin/DashboardAdmin';
import UsuariosPage from './pages/admin/UsuariosPage';
import PuertosPage from './pages/admin/config/PuertosPage';
import EmbarcacionesPage from './pages/admin/config/EmbarcacionesPage';
import RutasPage from './pages/admin/config/RutasPage';
import ProgramacionPage from './pages/admin/ProgramacionPage';
import ReporteIngresosPage from './pages/admin/ReporteIngresosPage';
import HistorialVentasPage from './pages/admin/HistorialVentasPage';
import RecuperarPasswordPage from './pages/auth/RecuperarPasswordPage';
import PerfilAdminPage from './pages/admin/PerfilAdminPage';
import ControlCajaPage from './pages/admin/ControlCajaPage';
import RiosPage from './pages/admin/config/RiosPage';
import SuperAdminPage from './pages/superadmin/SuperAdminPage';
import MantenimientoPage from './pages/MantenimientoPage';
import Caja from './pages/Caja'; // Importamos la nueva página corporativa

const RedirectInicial = () => {
  const userStr = localStorage.getItem('user');
  if (!userStr) return <Navigate to="/login" replace />;
  try {
    const user = JSON.parse(userStr);
    
    if (user.rol === 'SUPER_ADMIN') return <Navigate to="/superadmin/panel" replace />;
    if (user.rol === 'ADMIN' || user.rol === 'ADMINISTRADOR') return <Navigate to="/admin/dashboard" replace />;
    
    return <Navigate to="/asesor/dashboard" replace />;
  } catch (e) {
    return <Navigate to="/login" replace />;
  }
};

function App() {
  return (
    <>
      <Toaster position="top-right" reverseOrder={false} />
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<RedirectInicial />} />
          
          <Route path="/login" element={<LoginPage />} />
          <Route path="/recuperar-password" element={<RecuperarPasswordPage />} />
          <Route path="/mantenimiento" element={<MantenimientoPage />} />

          {/* RUTAS EXCLUSIVAS DEL SUPERADMIN */}
          <Route element={<ProtectedRoute allowedRoles={['SUPER_ADMIN']} />}>
             <Route path="/superadmin/panel" element={<SuperAdminPage />} />
          </Route>

          {/* RUTAS ADMIN */}
          <Route element={<ProtectedRoute allowedRoles={['ADMIN', 'ADMINISTRADOR', 'SUPER_ADMIN']} />}>
            <Route path="/admin/dashboard" element={<DashboardAdmin />} />
            <Route path="/admin/usuarios" element={<UsuariosPage />} />
            <Route path="/admin/config/puertos" element={<PuertosPage />} />
            <Route path="/admin/config/embarcaciones" element={<EmbarcacionesPage />} />
            <Route path="/admin/config/rutas" element={<RutasPage />} />
            <Route path='/admin/programacion' element={<ProgramacionPage />} />
            <Route path="/admin/finanzas" element={<ReporteIngresosPage />} />
            <Route path="/admin/historial" element={<HistorialVentasPage />} />
            <Route path="/admin/perfil" element={<PerfilAdminPage />} />
            <Route path="/admin/control-caja" element={<ControlCajaPage />} />
            <Route path='/admin/config/rios' element={<RiosPage />} /> 
          </Route>

          {/* RUTAS ASESOR*/}
          <Route element={<ProtectedRoute allowedRoles={['ASESOR', 'ADMIN', 'ADMINISTRADOR', 'AGENCIA', 'SUPER_ADMIN']} />}>
            <Route path="/asesor/dashboard" element={<DashboardAsesor />} />
            <Route path='/asesor/ventas' element={<VentaPage />} />
            <Route path="/asesor/pasajeros" element={<PasajerosPage />} />
            <Route path="/asesor/perfil" element={<PerfilPage />} />
          </Route>

          {/* NUEVA RUTA: EXCLUSIVA SOLO PARA ASESORES Y SUPER ADMIN */}
          <Route element={<ProtectedRoute allowedRoles={['ASESOR', 'SUPER_ADMIN']} />}>
            <Route path="/caja" element={<Caja />} />
          </Route>

          <Route path="*" element={<Navigate to="/" />} />
        </Routes>
      </BrowserRouter>
    </>
  );
}

export default App;