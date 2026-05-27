import React from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import {
  Home, Anchor, Map, Ticket, LogOut, Ship, Calendar, Users, 
  ChevronLeft, BarChart3, DollarSign, Briefcase, RouteIcon, ShieldAlert
} from 'lucide-react';
import { logout, getCurrentUser } from '../services/authService';
import logoImg from '../assets/logo.png';
import { obtenerCajaActiva } from '../services/cajaService';
import { notificarError } from '../services/feedbackService';

interface SidebarProps {
  isMobile: boolean;
  closeMobileMenu?: () => void;
}

const MENU_CONFIG = {
  ADMIN: [
    { section: 'Administración', items: [
        { label: 'Panel de control', path: '/admin/dashboard', icon: BarChart3 },
    ]},
    { section: 'Gestión', items: [
        { label: 'Gestión del Personal', path: '/admin/usuarios', icon: Briefcase },
    ]},
    { section: 'Supervisión Operativa', items: [
        { label: 'Ríos', path: '/admin/config/rios', icon: RouteIcon },
        { label: 'Puertos', path: '/admin/config/puertos', icon: Anchor },
        { label: 'Embarcaciones', path: '/admin/config/embarcaciones', icon: Ship },
        { label: 'Rutas y Tarifas', path: '/admin/config/rutas', icon: Map },
    ]},
    { section: 'Gestión Comercial', items: [
        { label: 'Programación de Viajes', path: '/admin/programacion', icon: Calendar },
        { label: 'Historial de Ventas', path: '/admin/historial', icon: Ticket },
        { label: 'Reporte de Ventas', path: '/admin/finanzas', icon: DollarSign },
    ]}
  ],
  ASESOR: [
    { section: 'Principal', items: [
        { label: 'Mi Panel', path: '/asesor/dashboard', icon: Home },
    ]},
    { section: 'Operaciones', items: [
        { label: 'Venta de Pasajes', path: '/asesor/ventas', icon: Ticket },
        { label: 'Manifiestos', path: '/asesor/pasajeros', icon: Users },
        { label: 'Gestión de Caja', path: '/caja', icon: DollarSign },
    ]}
  ]
};

const Sidebar = ({ isMobile, closeMobileMenu }: SidebarProps) => {
  const location = useLocation();
  const navigate = useNavigate();

  const user = getCurrentUser();
  const userRole = (user?.rol || 'ASESOR').toUpperCase(); 
  
  const isSuperAdmin = userRole === 'SUPER_ADMIN';
  const isAdmin = userRole === 'ADMIN' || userRole === 'ADMINISTRADOR';
  
  let menuActual: any[] = [];
  if (isSuperAdmin) {
      menuActual = [...MENU_CONFIG.ADMIN, ...MENU_CONFIG.ASESOR];
  } else if (isAdmin) {
      menuActual = MENU_CONFIG.ADMIN;
  } else {
      menuActual = MENU_CONFIG.ASESOR;
  }

  const handleLogout = async () => {
    const userId = user?.idUsuario || user?.id;
    if (userId) {
        try {
            const resCaja = await obtenerCajaActiva(userId);
            if (resCaja && resCaja.estado === 'ABIERTO') {
                notificarError("⚠️ ACCIÓN BLOQUEADA: Tienes un turno de caja activo. Realiza tu Arqueo y Cierre antes de salir.");
                return;
            }
        } catch (error) {
            console.error("Error verificando caja", error);
        }
    }

    if (window.confirm('¿Desea cerrar sesión del sistema de forma segura?')) {
        logout();
        navigate('/login');
    }
  };

  const isActive = (path: string) => location.pathname.startsWith(path);

  const linkClass = (path: string) => `
    flex items-center gap-3 px-4 py-3 text-sm font-medium transition-all duration-200 select-none
    ${
      isActive(path)
        ? 'bg-gradient-to-r from-[#189c81] to-[#18826d] text-white shadow-[inset_3px_0_0_0_#1ABB9C]'
        : 'text-gray-400 hover:text-white hover:bg-[#354859] hover:pl-5'
    }
  `;

  return (
    <>
      {/* OVERLAY MOBILE */}
      {isMobile && (
        <div
          onClick={closeMobileMenu}
          className="fixed inset-0 bg-black/40 backdrop-blur-sm z-40 lg:hidden"
        />
      )}

      {/* SIDEBAR */}
      <aside
        className={`
          fixed lg:static z-50
          h-screen w-64
          bg-[#2A3F54] text-white
          flex flex-col shadow-2xl
          transition-transform duration-300 ease-[cubic-bezier(.4,0,.2,1)]
          ${isMobile ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
        `}
      >
        {/* HEADER MOBILE */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-white/10 lg:hidden">
          <button onClick={closeMobileMenu} className="flex items-center gap-2 text-gray-300 hover:text-white transition-colors">
            <ChevronLeft size={20} /> <span className="text-sm font-medium">Volver</span>
          </button>
        </div>

        {/* LOGO */}
        <div className="py-6 px-4 flex flex-col items-center justify-center border-b border-white/10">
          <div className="w-24 h-24 bg-white rounded-full flex items-center justify-center border shadow-lg backdrop-blur-sm hover:scale-105 transition-transform duration-300">
            <img alt="tuki Logo" src={logoImg} className="w-[2000px] h-[120px] filter drop-shadow-md" />
          </div>
          <span className="mt-3 text-[10px] font-bold bg-white/10 px-2 py-0.5 rounded text-gray-300 tracking-wider">
            {isSuperAdmin ? 'PANEL SÚPER ADMIN' : isAdmin ? 'PANEL GERENCIAL' : 'PANEL OPERATIVO'}
          </span>
        </div>

        {/* MENÚ DINÁMICO */}
        <nav className="flex-1 overflow-y-auto py-2 space-y-1 custom-scrollbar">
          
          {menuActual.map((grupo: any, idx: number) => (
            <div key={idx}>
              <div className="px-4 mt-4 mb-2">
                <p className="text-[10px] font-bold text-gray-500 uppercase tracking-widest">
                  {grupo.section}
                </p>
              </div>
              
              {/* Items de la Sección */}
              {grupo.items.map((item: any, itemIdx: number) => (
                <Link 
                  key={itemIdx}
                  to={item.path} 
                  className={linkClass(item.path)} 
                  onClick={closeMobileMenu}
                >
                  <item.icon size={18} /> <span>{item.label}</span>
                </Link>
              ))}
            </div>
          ))}

          {/* BOTÓN EXCLUSIVO SUPER ADMIN */}
          {isSuperAdmin && (
            <div className="px-4 mt-8 mb-4">
               <Link 
                 to="/superadmin/panel" 
                 onClick={closeMobileMenu}
                 className={`flex items-center gap-3 p-3 rounded-xl font-bold border transition-all ${
                     isActive('/superadmin/panel') 
                     ? 'bg-red-600 text-white border-red-500 shadow-lg shadow-red-500/30' 
                     : 'text-red-400 border-red-500/30 hover:bg-red-500/10'
                 }`}
               >
                  <ShieldAlert size={20} />
                  Panel S.A.
               </Link>
            </div>
          )}

        </nav>

        {/* FOOTER */}
        <div className="p-4 border-t border-white/10">
          <button
            onClick={handleLogout}
            className="group flex items-center gap-3 text-sm w-full p-2 rounded-lg hover:bg-red-500/20 transition-all"
          >
            <div className="p-1.5 bg-gray-700 rounded-md group-hover:bg-red-500 transition-colors">
              <LogOut size={16} />
            </div>
            <span className="font-medium">Cerrar Sesión</span>
          </button>

          <p className="text-[9px] text-center text-white/60 mt-3 font-mono">
            Sistema tuki v1.0
          </p>
        </div>
      </aside>
    </>
  );
};

export default Sidebar;