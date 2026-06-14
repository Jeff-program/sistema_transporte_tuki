import { useState, useRef, useEffect, type ReactNode } from 'react';
import { Menu, Bell, ChevronDown, LogOut, Settings } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import Sidebar from '../components/Sidebar';
import { getCurrentUser, logout } from '../services/authService';
import { obtenerCajaActiva } from '../services/cajaService';
import { confirmarAccion, notificarError, notificarExito } from '../services/feedbackService';

interface MainLayoutProps {
  children: ReactNode;
}

const baseUrl = import.meta.env.VITE_API_URL.replace('/api', '');

const MainLayout = ({ children }: MainLayoutProps) => {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const [user, setUser] = useState<any>(getCurrentUser());
  const [fotoError, setFotoError] = useState(false);

  const navigate = useNavigate();

  const getIniciales = (nombre: string) => {
    return nombre
      ? nombre
          .split(' ')
          .map((n: string) => n[0])
          .join('')
          .substring(0, 2)
          .toUpperCase()
      : 'US';
  };

  const formatRol = (rol: string) => {
    if (!rol) return 'Invitado';
    return rol
      .replace(/_/g, ' ')
      .toLowerCase()
      .replace(/\b\w/g, l => l.toUpperCase());
  };

  const handleLogout = async () => {
    const userId = user?.idUsuario || user?.id;
    if (userId) {
        try {
            const resCaja = await obtenerCajaActiva(userId);
            if (resCaja && resCaja.estado === 'ABIERTO') {
                notificarError("ACCIÓN BLOQUEADA: Tienes un turno de caja activo. Realiza tu Arqueo y Cierre antes de salir.");
                setIsProfileOpen(false);
                return;
            }
        } catch (error) {
            console.error("Error verificando caja", error);
        }
    }
    const confirmado = await confirmarAccion(
        'Cerrar sesión',
        '¿Desea cerrar sesión del sistema de forma segura?',
        'Sí, cerrar sesión',
        'info'
    );
    if (confirmado) {
        logout();
        notificarExito('Sesión cerrada correctamente.');
        navigate('/login');
    }
  };

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsProfileOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  useEffect(() => {
    const handleStorageChange = () => {
      setUser(getCurrentUser());
      setFotoError(false); 
    };
    
    window.addEventListener('storage', handleStorageChange);
    return () => window.removeEventListener('storage', handleStorageChange);
  }, []);

  return (
    <div className="flex h-screen bg-gray-100 overflow-hidden font-sans">

      {/* SIDEBAR DESKTOP */}
      <aside className="hidden md:flex md:w-64 flex-col fixed inset-y-0 z-50">
        <Sidebar isMobile={false} />
      </aside>

      {/* SIDEBAR MOBILE */}
      {isSidebarOpen && (
        <div className="fixed inset-0 z-50 md:hidden">
          <div
            className="fixed inset-0 bg-[#2A3F54]/80 backdrop-blur-sm"
            onClick={() => setIsSidebarOpen(false)}
          />
          <div className="fixed inset-y-0 left-0 w-72 shadow-2xl animate-in slide-in-from-left duration-300">
            <Sidebar isMobile closeMobileMenu={() => setIsSidebarOpen(false)} />
          </div>
        </div>
      )}

      {/* CONTENIDO PRINCIPAL */}
      <div className="flex-1 flex flex-col md:ml-64 w-full min-h-screen">

        {/* HEADER */}
        <header className="bg-white/80 backdrop-blur-md shadow-sm border-b border-gray-200 h-16 flex items-center justify-between px-4 sm:px-6 sticky top-0 z-40">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setIsSidebarOpen(true)}
              className="p-2 rounded-lg text-gray-600 hover:bg-gray-100 md:hidden"
            >
              <Menu size={24} />
            </button>

            <h2 className="text-sm sm:text-lg font-bold text-[#2A3F54]">
              Sistema de Gestión <span className="text-[#1ABB9C]">Fluvial</span>
            </h2>
          </div>

          <div className="flex items-center gap-2 sm:gap-4">

            <div className="h-8 w-[1px] bg-gray-200 hidden sm:block" />

            {/* PERFIL */}
            <div className="relative" ref={dropdownRef}>
              <button
                onClick={() => setIsProfileOpen(!isProfileOpen)}
                className="flex items-center gap-2 sm:gap-3 hover:bg-gray-50 p-2 rounded-lg transition-colors"
              >
                {/* NOMBRE Y ROL */}
                <div className="text-right leading-tight">
                  <p className="text-xs sm:text-sm font-bold text-[#2A3F54] max-w-[120px] sm:max-w-none truncate">
                    {user?.nombreCompleto || 'Usuario'}
                  </p>
                  <p className="text-[9px] sm:text-[10px] font-bold text-[#1ABB9C] uppercase tracking-wider">
                    {formatRol(user?.rol)}
                  </p>
                </div>

                {/* AVATAR CON FOTO */}
                <div className="h-9 w-9 sm:h-10 sm:w-10 rounded-full overflow-hidden bg-gradient-to-tr from-[#2A3F54] to-[#3E5367] flex items-center justify-center text-white font-bold text-xs sm:text-sm shadow-md border-2 border-white">
                  {user?.fotoUrl && !fotoError ? (
                      <img 
                          src={user.fotoUrl?.startsWith('http') ? user.fotoUrl : `${baseUrl}${user.fotoUrl}`} 
                          alt="Perfil" 
                          className="h-full w-full object-cover bg-white"
                          onError={() => setFotoError(true)} 
                      />
                  ) : (
                      getIniciales(user?.nombreCompleto)
                  )}
                </div>

                <ChevronDown
                  size={16}
                  className={`text-gray-400 transition-transform ${
                    isProfileOpen ? 'rotate-180' : ''
                  }`}
                />
              </button>

              {/* DROPDOWN */}
              {isProfileOpen && (
                <div className="absolute right-0 mt-2 w-56 bg-white rounded-xl shadow-2xl border border-gray-100 py-2">
                  <div className="px-4 py-3 border-b border-gray-100 sm:hidden">
                    <p className="text-sm font-bold text-[#2A3F54]">
                      {user?.nombreCompleto}
                    </p>
                    <p className="text-xs text-gray-500">{user?.email}</p>
                  </div>

                  <Link
                    to={user?.rol === 'ADMIN' ? '/admin/perfil' : '/asesor/perfil'}
                    className="flex items-center gap-3 px-4 py-3 text-sm text-gray-600 hover:bg-blue-50"
                    onClick={() => setIsProfileOpen(false)}
                  >
                    <Settings size={18} className="text-[#1ABB9C]" />
                    Mi Perfil
                  </Link>

                  <div className="h-[1px] bg-gray-100 my-1" />

                  <button
                    onClick={handleLogout}
                    className="w-full flex items-center gap-3 px-4 py-3 text-sm text-red-500 hover:bg-red-50 text-left font-medium"
                  >
                    <LogOut size={18} />
                    Cerrar Sesión
                  </button>
                </div>
              )}
            </div>
          </div>
        </header>

        {/* MAIN */}
        <main className="flex-1 overflow-y-auto bg-slate-50 p-4 sm:p-6 md:p-8">
          <div className="max-w-7xl mx-auto">{children}</div>
        </main>
      </div>
    </div>
  );
};

export default MainLayout;
