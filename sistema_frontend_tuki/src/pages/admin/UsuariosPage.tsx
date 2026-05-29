import React, { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import MainLayout from '../../layouts/MainLayout';
import { 
    Users, UserPlus, Search, Edit, Lock, Shield, 
    ToggleLeft, ToggleRight, Save, Mail, ChevronLeft, ChevronRight, List, AlertCircle, Building2, Phone,
    Loader,
    IdCardIcon,
    Eye, EyeOff,
    Trash2,
    X
} from 'lucide-react';
import { getUsuarios, saveUsuario, toggleEstadoUsuario, saveAgenciaConUsuario } from '../../services/userService';
import { getPuertos } from '../../services/configService'; 
import { confirmarAccion, notificarExito, notificarError, notificarCarga, cerrarNotificacion } from '../../services/feedbackService';
import api from '../../services/api'; 
import { getCurrentUser } from '../../services/authService';

const UsuariosPage = () => {
    const usuarioLogueado = getCurrentUser() as any;

    const { register, handleSubmit, reset, setValue, watch, formState: { errors, isSubmitting } } = useForm<any>({
        defaultValues: { rol: 'ASESOR', idAgencia: '' } 
    });

    const [usuarios, setUsuarios] = useState<any[]>([]);
    const [puertos, setPuertos] = useState<any[]>([]); 
    const [agenciasDisponibles, setAgenciasDisponibles] = useState<any[]>([]); // 🔥 Nuevo estado para cargar Agencias
    const [loading, setLoading] = useState(true);
    const [busqueda, setBusqueda] = useState('');
    
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editando, setEditando] = useState(false);
    const [usuarioEditar, setUsuarioEditar] = useState<any>(null);

    const rolSeleccionado = watch('rol');

    const [currentPage, setCurrentPage] = useState(1);
    const [itemsPerPage, setItemsPerPage] = useState(10);

    const [mostrarPassword, setMostrarPassword] = useState(false);

    useEffect(() => {
        const handleResize = () => setItemsPerPage(window.innerWidth < 1024 ? 4 : 6);
        window.addEventListener('resize', handleResize);
        handleResize();
        return () => window.removeEventListener('resize', handleResize);
    }, []);

    const cargarDatos = async () => {
        setLoading(true);
        try {
            const data = await getUsuarios();
            const dataPuertos = await getPuertos(); 
            const dataAgencias = await api.get('/agencias');
            
            const usuariosActivos = data.filter((u: any) => u.estado !== 'ELIMINADO');

            if (Array.isArray(usuariosActivos)) {
                usuariosActivos.sort((a: any, b: any) => b.idUsuario - a.idUsuario);
            }
            setUsuarios(usuariosActivos);
            setPuertos(dataPuertos.filter((p:any) => p.estado === 'ACTIVO'));
            setAgenciasDisponibles(dataAgencias.data.filter((a: any) => a.estado === 'ACTIVO'));
        } catch (e) {
            notificarError('Error cargando personal');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => { cargarDatos(); }, []);
    useEffect(() => { setCurrentPage(1); }, [busqueda]);

    const onError = (errors: any) => {
        notificarError('Verifique los campos requeridos.');
    };

    const onSubmit = async (data: any) => {
        const toastId = notificarCarga('Guardando usuario...');
        try {
            if (data.rol === 'AGENCIA') {
                if (!editando) {
                    const agenciaData = {
                        nombreAgencia: data.nombreAgencia,
                        direccion: data.direccionAgencia,
                        telefono: data.telefonoAgencia,
                        puerto: { idPuerto: parseInt(data.idPuerto) }
                    };
                    const usuarioData = {
                        nombreCompleto: data.nombreCompleto,
                        email: data.email,
                        password: data.password,
                        rol: data.rol
                    };
                    await saveAgenciaConUsuario(agenciaData, usuarioData);
                } else {
                    let payload = { ...data };
                    if (!data.password) delete payload.password;
                    await saveUsuario(payload);

                    if (data.idAgencia) {
                        await api.put(`/agencias/${data.idAgencia}`, {
                            nombreAgencia: data.nombreAgencia,
                            direccion: data.direccionAgencia,
                            telefono: data.telefonoAgencia,
                            idPuerto: parseInt(data.idPuerto)
                        });
                    }
                }
            } else {
                let payload = { ...data };
                if (!data.password) delete payload.password;
                if (!payload.idUsuario) delete payload.idUsuario;
                if (data.rol !== 'ASESOR' || !data.idAgencia) {
                    payload.idAgencia = ''; 
                }
                
                await saveUsuario(payload);
            }
            
            cerrarNotificacion(toastId);
            notificarExito(editando ? 'Usuario y Agencia actualizados' : 'Usuario registrado');
            
            handleCerrarModal();
            cargarDatos();
        } catch (error: any) {
            cerrarNotificacion(toastId);
            const msj = error.response?.data?.mensaje || error.response?.data || "Error al guardar el usuario";
            notificarError(msj);
        }
    };

    const abrirModalNuevo = () => {
        reset({ idUsuario: null, idAgencia: '', nombreCompleto: '', email: '', password: '', rol: 'ASESOR', idPuerto: '', nombreAgencia: '', direccionAgencia: '', telefonoAgencia: '' });
        setEditando(false);
        setUsuarioEditar(null);
        setIsModalOpen(true);
    };

    const handleCerrarModal = () => {
        setIsModalOpen(false);
        reset();
    };

    const editar = (u: any) => {
        setUsuarioEditar(u);
        setValue('idUsuario', u.idUsuario);
        setValue('nombreCompleto', u.nombreCompleto);
        setValue('email', u.email);
        setValue('password', '');
        setValue('rol', u.rol);
        
        if (u.rol === 'AGENCIA' && u.agencia) {
            setValue('idAgencia', u.agencia.idAgencia);
            setValue('nombreAgencia', u.agencia.nombreAgencia);
            setValue('direccionAgencia', u.agencia.direccion);
            setValue('telefonoAgencia', u.agencia.telefono);
            setValue('idPuerto', u.agencia.puerto?.idPuerto);
        } else if (u.rol === 'ASESOR' && u.agencia) {
            setValue('idAgencia', u.agencia.idAgencia);
        } else {
            setValue('idAgencia', '');
        }
        
        setEditando(true);
        setIsModalOpen(true);
    };

    const cambiarEstado = async (u: any) => {
        try {
            setUsuarios(prev => prev.map(user => 
                user.idUsuario === u.idUsuario ? { ...user, estado: u.estado === 'ACTIVO' ? 'INACTIVO' : 'ACTIVO' } : user
            ));
            await toggleEstadoUsuario(u.idUsuario);
            notificarExito(`Usuario ${u.estado === 'ACTIVO' ? 'desactivado' : 'activado'}`);
        } catch (e) {
            notificarError('Error al cambiar estado');
            cargarDatos();
        }
    };

    const handleEliminar = async (id: number) => {
        const confirmado = await confirmarAccion(
            "¿Eliminar este usuario?",
            "El usuario será dado de baja del sistema permanentemente.",
            "Sí, eliminar",
            "danger"
        );

        if (!confirmado) return;

        try {
            await api.delete(`/usuarios/${id}`);
            notificarExito('Usuario eliminado correctamente');
            
            if (editando && usuarioEditar?.idUsuario === id) {
                handleCerrarModal();
            }
            
            cargarDatos();
        } catch (e) {
            notificarError('No se pudo eliminar el usuario.');
        }
    };

    const usuariosFiltrados = usuarios.filter(u => {
        if (usuarioLogueado && u.idUsuario === usuarioLogueado.idUsuario) {
            return false;
        }

        const rolActual = usuarioLogueado?.rol?.toUpperCase();
        if ((rolActual === 'ADMIN' || rolActual === 'ADMINISTRADOR') && u.rol === 'SUPER_ADMIN') {
            return false;
        }

        const textoBusqueda = busqueda.toLowerCase();
        return (
            u.nombreCompleto.toLowerCase().includes(textoBusqueda) || 
            u.email.toLowerCase().includes(textoBusqueda) ||
            u.rol.toLowerCase().includes(textoBusqueda) ||
            (u.agencia?.puerto?.ciudad || '').toLowerCase().includes(textoBusqueda) ||
            (u.agencia?.nombreAgencia || '').toLowerCase().includes(textoBusqueda)
        );
    });

    const indexOfLastItem = currentPage * itemsPerPage;
    const indexOfFirstItem = indexOfLastItem - itemsPerPage;
    const currentItems = usuariosFiltrados.slice(indexOfFirstItem, indexOfLastItem);
    const totalPages = Math.ceil(usuariosFiltrados.length / itemsPerPage);
    const paginate = (pageNumber: number) => setCurrentPage(pageNumber);

    return (
        <MainLayout>
            <div className="max-w-7xl mx-auto pb-3 relative">
                
                {/* HEADER CON BOTÓN DE NUEVO USUARIO */}
                <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 mb-8 flex flex-col md:flex-row md:items-center justify-between gap-4 animate-in slide-in-from-top-4">
                    <div className="flex items-center gap-4">
                        <div className="p-3 bg-blue-50 rounded-xl text-[#1ABB9C]"><Users size={28} /></div>
                        <div>
                            <h1 className="text-2xl font-bold text-[#2A3F54]">Gestión de Personal</h1>
                            <p className="text-sm text-gray-400 mt-1">Administra los accesos de administradores, asesores y agencias.</p>
                        </div>
                    </div>
                    
                    <div className="flex flex-col sm:flex-row items-center gap-3 w-full md:w-auto">
                        <div className="relative group w-full sm:w-72">
                            <Search className="absolute left-3 top-3 text-gray-400" size={18} />
                            <input 
                                type="text" 
                                placeholder="Buscar por nombre, email o ciudad..." 
                                value={busqueda} 
                                onChange={(e) => setBusqueda(e.target.value)} 
                                className="pl-10 pr-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm w-full focus:outline-none focus:border-[#1ABB9C] transition-colors"
                            />
                        </div>
                        <button 
                            onClick={abrirModalNuevo}
                            className="w-full sm:w-auto flex items-center justify-center gap-2 bg-[#2A3F54] hover:bg-[#1f2f3f] text-white px-5 py-2.5 rounded-xl font-bold text-sm shadow-md transition-transform hover:scale-105 active:scale-95"
                        >
                            <UserPlus size={18} /> Registrar Usuario
                        </button>
                    </div>
                </div>

                {/* TABLA DE USUARIOS */}
                <div className="bg-white rounded-2xl shadow-xl border border-gray-100 overflow-hidden flex flex-col max-h-[calc(100vh-220px)] h-fit animate-in fade-in duration-500">
                    <div className="bg-[#2A3F54] border-b border-gray-100 px-6 py-4 flex justify-between items-center shrink-0">
                        <h3 className="font-bold text-white flex items-center gap-2">
                            <div className="bg-white p-1.5 rounded-md shadow-sm text-[#1ABB9C]"><List size={14} /></div> 
                            Personal Registrado<span className="text-white text-xs font-normal">({usuariosFiltrados.length})</span>
                        </h3>
                    </div>

                    {loading ? (
                        <div className="flex-1 flex justify-center items-center p-12">
                            <Loader className="animate-spin text-[#1ABB9C]" size={40}/>
                        </div>
                    ) : usuariosFiltrados.length === 0 ? (
                        <div className="flex-1 flex flex-col items-center justify-center text-center p-12">
                            <div className="bg-gray-50 p-6 rounded-full mb-4 border border-gray-100">
                                <Users size={48} className="text-gray-300" />
                            </div>
                            <h4 className="text-gray-600 font-bold text-lg">No se encontró personal</h4>
                            <p className="text-gray-400 text-sm mt-1 max-w-xs">Intenta con otro término de búsqueda o registra un nuevo usuario.</p>
                        </div>
                    ) : (
                        <div className="overflow-auto flex-1 custom-scrollbar">
                            <table className="w-full text-sm text-left">
                                <thead className="bg-gray-50/80 text-gray-500 font-bold uppercase text-[10px] tracking-wider border-b border-gray-100 sticky top-0 z-10 backdrop-blur-md">
                                    <tr>
                                        <th className="px-6 py-4 text-center text-[#1ABB9C] w-16">N°</th>
                                        <th className="px-6 py-4 min-w-[250px]">Usuario y Contacto</th>
                                        <th className="px-6 py-4 text-center">Rol / Entidad</th>
                                        <th className="px-6 py-4 text-center">Ubicación / Agencia</th>
                                        <th className="px-6 py-4 text-center">Estado / Acceso</th>
                                        <th className="px-6 py-4 text-center">Acciones</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-50">
                                    {currentItems.map((u, index) => (
                                        <tr key={u.idUsuario} className={`hover:bg-blue-50/50 transition-colors ${u.estado === 'INACTIVO' ? 'opacity-60 bg-gray-50' : ''}`}>
                                            <td className="px-6 py-4 text-center font-bold text-gray-400 text-xs">{(currentPage - 1) * itemsPerPage + index + 1}</td>
                                            <td className="px-6 py-4">
                                                <div className="flex items-center gap-4">
                                                    <div className="w-10 h-10 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center font-black text-sm shrink-0 border border-blue-200 shadow-sm">
                                                        {u.nombreCompleto.substring(0,2).toUpperCase()}
                                                    </div>
                                                    <div>
                                                        <div className="font-bold text-[#2A3F54] text-sm">{u.nombreCompleto}</div>
                                                        <div className="text-[11px] font-mono text-gray-500 flex items-center gap-1 mt-0.5">
                                                            <Mail size={10} className="text-gray-400"/> {u.email}
                                                        </div>
                                                    </div>
                                                </div>
                                            </td>

                                            <td className="px-6 py-4 text-center">
                                                <div className="flex flex-col items-center gap-1.5">
                                                    <span className={`px-3 py-1 rounded text-[10px] font-bold tracking-wider flex items-center gap-1 w-fit
                                                        ${u.rol === 'ADMIN' || u.rol === 'ADMINISTRADOR' || u.rol === 'SUPER_ADMIN' ? 'bg-purple-100 text-purple-700 border border-purple-200' 
                                                        : u.rol === 'AGENCIA' ? 'bg-orange-100 text-orange-700 border border-orange-200' : 'bg-blue-100 text-blue-700 border border-blue-200'}`}>
                                                        {u.rol === 'ADMIN' || u.rol === 'ADMINISTRADOR' || u.rol === 'SUPER_ADMIN' ? <Shield size={10}/> 
                                                            : u.rol === 'AGENCIA' ? <Building2 size={10}/> : <UserPlus size={10}/>}
                                                        {u.rol}
                                                    </span>
                                                </div>
                                            </td>

                                            <td className="px-6 py-4 text-center font-bold text-gray-600 text-xs">
                                                {/* 🔥 AHORA SE MUESTRA A QUÉ AGENCIA PERTENECE EL ASESOR O LA AGENCIA */}
                                                {(u.rol === 'AGENCIA' || u.rol === 'ASESOR') && u.agencia?.puerto ? (
                                                    <div className="flex flex-col items-center">
                                                        <span className="flex items-center justify-center gap-1 text-[#2A3F54]">
                                                            <Building2 size={12} className="text-[#1ABB9C]" /> {u.agencia.nombreAgencia}
                                                        </span>
                                                        <span className="text-[10px] text-gray-400 font-normal">
                                                            ({u.agencia.puerto.ciudad})
                                                        </span>
                                                    </div>
                                                ) : u.rol === 'ASESOR' ? (
                                                    <div className="flex flex-col items-center">
                                                        <span className="flex items-center justify-center gap-1 text-[#2A3F54]">
                                                            <Building2 size={12} className="text-[#1ABB9C]" /> Sede Principal
                                                        </span>
                                                        <span className="text-[10px] text-gray-400 font-normal">
                                                            (Iquitos)
                                                        </span>
                                                    </div>
                                                ) : (
                                                    <span className="text-gray-300">—</span>
                                                )}
                                            </td>

                                            <td className="px-6 py-4 text-center">
                                                <div className="flex items-center justify-center gap-3">
                                                    <span className={`px-3 py-1 rounded-full text-[10px] font-bold border uppercase tracking-wide
                                                        ${u.estado === 'ACTIVO' ? 'bg-green-50 text-green-700 border-green-200' : 'bg-gray-100 text-gray-500 border-gray-200'}`}>
                                                        {u.estado}
                                                    </span>
                                                    <button onClick={() => cambiarEstado(u)} title={u.estado === 'ACTIVO' ? "Bloquear Acceso" : "Permitir Acceso"} className="transition-transform hover:scale-110 focus:outline-none">
                                                        {u.estado === 'ACTIVO' 
                                                            ? <ToggleRight size={28} className="text-[#1ABB9C] cursor-pointer"/> 
                                                            : <ToggleLeft size={28} className="text-gray-300 cursor-pointer"/>}
                                                    </button>
                                                </div>
                                            </td>

                                            <td className="px-6 py-4 text-center">
                                                <div className="flex items-center justify-center gap-2">
                                                    <button 
                                                        onClick={() => editar(u)} 
                                                        className="inline-flex items-center gap-1 bg-white border border-gray-200 text-gray-500 hover:border-blue-300 hover:bg-blue-50 hover:text-blue-600 px-3 py-1.5 rounded-lg transition-colors text-xs font-bold shadow-sm"
                                                    >
                                                        <Edit size={14} /> Editar
                                                    </button>

                                                    <button 
                                                        onClick={() => handleEliminar(u.idUsuario)} 
                                                        className="inline-flex items-center gap-1 bg-white border border-gray-200 text-gray-500 hover:border-red-300 hover:bg-red-50 hover:text-red-600 px-3 py-1.5 rounded-lg transition-colors text-xs font-bold shadow-sm"
                                                    >
                                                        <Trash2 size={14} /> Eliminar
                                                    </button>
                                                </div>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}
                    
                    <div className="border-t border-gray-100 p-4 bg-gray-50/80 flex justify-between items-center shrink-0">
                        <span className="text-xs text-gray-500 font-medium bg-white px-3 py-1 rounded-full border border-gray-200 shadow-sm">
                            Mostrando <span className="text-[#2A3F54] font-bold"> {usuariosFiltrados.length > 0 ? indexOfFirstItem + 1 : 0}-{Math.min(indexOfLastItem, usuariosFiltrados.length)}</span> de {usuariosFiltrados.length}
                        </span>
                        <div className="flex gap-2">
                            <button onClick={() => paginate(currentPage - 1)} disabled={currentPage === 1} className="p-2 rounded-lg border bg-white hover:text-[#1ABB9C] disabled:opacity-50 shadow-sm transition-colors">
                                <ChevronLeft size={16}/>
                            </button>
                            <button onClick={() => paginate(currentPage + 1)} disabled={currentPage === totalPages || totalPages === 0} className="p-2 rounded-lg border bg-white hover:text-[#1ABB9C] disabled:opacity-50 shadow-sm transition-colors">
                                <ChevronRight size={16}/>
                            </button>
                        </div>
                    </div>
                </div>

                {/* MODAL DE REGISTRO / EDITAR DE USUARIOS */}
                {isModalOpen && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4 animate-in fade-in duration-200">
                        <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md flex flex-col overflow-hidden animate-in zoom-in-95 duration-200 max-h-[90vh]">
                            
                            {/* Cabecera del Modal */}
                            <div className={`p-5 flex justify-between items-center shrink-0 ${editando ? 'bg-gradient-to-r from-blue-600 to-blue-500' : 'bg-gradient-to-r from-[#2A3F54] to-[#3E5367]'}`}>
                                <h3 className="font-bold text-white text-lg flex items-center gap-2">
                                    {editando ? <Edit size={20} className="text-white"/> : <UserPlus size={20} className="text-[#1ABB9C]"/>} 
                                    {editando ? 'Modificar Usuario' : 'Nuevo Usuario'}
                                </h3>
                                <button onClick={handleCerrarModal} className="text-white/70 hover:text-white bg-white/10 hover:bg-white/20 p-1 rounded-lg transition-colors">
                                    <X size={20} />
                                </button>
                            </div>
                            
                            {/* Cuerpo del Modal (Formulario Scrollable) */}
                            <div className="overflow-y-auto p-6 flex-1 custom-scrollbar">
                                <form id="formUsuario" onSubmit={handleSubmit(onSubmit, onError)} className="space-y-5">
                                    <input type="hidden" {...register('idUsuario')} />
                                    
                                    <div className="space-y-4">
                                        <div className="group">
                                            <label className="text-xs font-bold text-gray-500 uppercase mb-1.5 flex items-center gap-1"><IdCardIcon size={12}/> Rol en el Sistema</label>
                                            <select {...register('rol')} className="w-full bg-gray-50 border border-gray-200 p-2.5 rounded-xl text-sm outline-none focus:border-[#1ABB9C] focus:bg-white transition-colors cursor-pointer" disabled={editando}>
                                                <option value="ASESOR">Asesor de Ventas</option>
                                                <option value="ADMIN">Administrador</option>
                                                <option value="AGENCIA">Agencia de Ventas (Sucursal)</option>
                                                {usuarioLogueado?.rol === 'SUPER_ADMIN' && (
                                                    <option value="SUPER_ADMIN">Súper Administrador</option>
                                                )}
                                            </select>
                                        </div>

                                        {/* 🔥 MOSTRAR COMBO DE ASIGNAR AGENCIA SI ES ASESOR 🔥 */}
                                        {rolSeleccionado === 'ASESOR' && (
                                            <div className="bg-blue-50 p-4 rounded-xl border border-blue-100 space-y-3 mt-2 animate-in fade-in slide-in-from-top-2">
                                                <label className="text-xs font-bold text-blue-800 uppercase flex items-center gap-1 mb-2"><Building2 size={14}/> Asignar a Sucursal</label>
                                                <select {...register('idAgencia')} className="w-full bg-white border border-blue-200 p-2 rounded-lg text-xs outline-none focus:border-blue-500 cursor-pointer text-blue-900">
                                                    <option value="">-- Asesor Libre (Sin agencia) --</option>
                                                    {agenciasDisponibles.map(agencia => (
                                                        <option key={agencia.idAgencia} value={agencia.idAgencia}>
                                                            {agencia.nombreAgencia} ({agencia.puerto?.ciudad})
                                                        </option>
                                                    ))}
                                                </select>
                                                <p className="text-[10px] text-blue-600 leading-tight">Si seleccionas una agencia, todo el dinero que ingrese este asesor irá a la caja de dicha agencia.</p>
                                            </div>
                                        )}

                                        {rolSeleccionado === 'AGENCIA' && (
                                            <div className="bg-orange-50 p-4 rounded-xl border border-orange-100 space-y-3 mt-2 animate-in fade-in slide-in-from-top-2">
                                                <input type="hidden" {...register('idAgencia')} />
                                                <label className="text-xs font-bold text-orange-800 uppercase flex items-center gap-1 mb-2 border-b border-orange-200 pb-2"><Building2 size={14}/> Datos de la Agencia</label>
                                                
                                                <div>
                                                    <label className="text-[10px] font-bold text-gray-500 uppercase mb-1 block">Nombre de Agencia *</label>
                                                    <input {...register('nombreAgencia', {required: 'Campo requerido'})} className="w-full bg-white border border-gray-200 p-2 rounded-lg text-xs outline-none focus:border-[#1ABB9C]" placeholder="Ej: Turismo Selva S.A.C." />
                                                    {errors.nombreAgencia && <span className="text-red-500 text-[10px] flex items-center gap-1 mt-1"><AlertCircle size={10}/> {String(errors.nombreAgencia.message)}</span>}
                                                </div>
                                                
                                                <div>
                                                    <label className="text-[10px] font-bold text-gray-500 uppercase mb-1 block">Puerto Asignado *</label>
                                                    <select {...register('idPuerto', {required: 'Campo requerido'})} className="w-full bg-white border border-gray-200 p-2 rounded-lg text-xs outline-none focus:border-[#1ABB9C]">
                                                        <option value="">Seleccione un puerto...</option>
                                                        {puertos.map(p => <option key={p.idPuerto} value={p.idPuerto}>{p.nombrePuerto} ({p.ciudad})</option>)}
                                                    </select>
                                                    {errors.idPuerto && <span className="text-red-500 text-[10px] flex items-center gap-1 mt-1"><AlertCircle size={10}/> {String(errors.idPuerto.message)}</span>}
                                                </div>

                                                <div className="grid grid-cols-2 gap-2">
                                                    <div>
                                                        <label className="text-[10px] font-bold text-gray-500 uppercase mb-1 block">Teléfono *</label>
                                                        <input 
                                                            {...register('telefonoAgencia', { 
                                                                required: 'Requerido',
                                                                pattern: { value: /^[0-9]{9}$/, message: '9 dígitos' }
                                                            })} 
                                                            maxLength={9}
                                                            onInput={(e) => e.currentTarget.value = e.currentTarget.value.replace(/[^0-9]/g, '')}
                                                            className={`w-full bg-white border p-2 rounded-lg text-xs outline-none focus:border-[#1ABB9C] ${errors.telefonoAgencia ? 'border-red-400' : 'border-gray-200'}`} 
                                                            placeholder="Ej: 987654321" 
                                                        />
                                                        {errors.telefonoAgencia && <span className="text-red-500 text-[10px] flex items-center gap-1 mt-1"><AlertCircle size={10}/> {String(errors.telefonoAgencia.message)}</span>}
                                                    </div>
                                                    <div>
                                                        <label className="text-[10px] font-bold text-gray-500 uppercase mb-1 block">Dirección</label>
                                                        <input {...register('direccionAgencia')} className="w-full bg-white border border-gray-200 p-2 rounded-lg text-xs outline-none focus:border-[#1ABB9C]" placeholder="Opcional" />
                                                    </div>
                                                </div>
                                            </div>
                                        )}

                                        <div className="group">
                                            <label className="text-xs font-bold text-gray-500 uppercase mb-1.5 flex items-center gap-1"><Users size={12}/> Nombre Completo</label>
                                            <input {...register('nombreCompleto', { required: 'Campo requerido' })} 
                                                className={`w-full bg-gray-50 border border-gray-200 p-2.5 rounded-xl text-sm outline-none focus:border-[#1ABB9C] ${errors.nombreCompleto ? 'border-red-300 bg-red-50' : 'focus:bg-white focus:ring-4 focus:ring-green-50'}`} 
                                                placeholder="Ej: Juan Pérez" />
                                            {errors.nombreCompleto && <span className="text-red-500 text-[10px] flex items-center gap-1 mt-1"><AlertCircle size={10}/> {String(errors.nombreCompleto.message)}</span>}
                                        </div>
                                        
                                        <div className="group">
                                            <label className="text-xs font-bold text-gray-500 uppercase mb-1.5 flex items-center gap-1"><Mail size={12}/> Correo Electrónico</label>
                                            <input 
                                                type="email" 
                                                {...register('email', { 
                                                    required: 'El correo es obligatorio',
                                                    pattern: { value: /^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$/i, message: 'Formato inválido' }
                                                })} 
                                                className={`w-full bg-gray-50 border p-2.5 rounded-xl text-sm outline-none focus:border-[#1ABB9C] ${errors.email ? 'border-red-300 bg-red-50' : 'border-gray-200 focus:bg-white focus:ring-4 focus:ring-green-50'}`}
                                                placeholder="ejemplo@correo.com"  
                                            />
                                            {errors.email && <span className="text-red-500 text-[10px] flex items-center gap-1 mt-1"><AlertCircle size={10}/> {String(errors.email.message)}</span>}
                                        </div>

                                        <div className="group">
                                            <label className="text-xs font-bold text-gray-500 uppercase mb-1.5 flex items-center gap-1"><Lock size={12}/> Contraseña</label>
                                            <div className="relative">
                                                <input 
                                                    type={mostrarPassword ? "text" : "password"} 
                                                    {...register('password', { 
                                                        required: !editando ? 'La contraseña es obligatoria' : false,
                                                        minLength: { value: 6, message: 'Mínimo 6 caracteres' }
                                                    })} 
                                                    className={`w-full bg-gray-50 border p-2.5 pr-10 rounded-xl text-sm outline-none focus:border-[#1ABB9C] ${errors.password ? 'border-red-300 bg-red-50' : 'border-gray-200 focus:bg-white focus:ring-4 focus:ring-green-50'}`} 
                                                    placeholder={editando ? "Dejar en blanco para no cambiar" : "Mínimo 6 caracteres"} 
                                                />
                                                <button 
                                                    type="button"
                                                    onClick={() => setMostrarPassword(!mostrarPassword)}
                                                    className="absolute right-3 top-3 text-gray-400 hover:text-[#1ABB9C] transition-colors focus:outline-none"
                                                >
                                                    {mostrarPassword ? <EyeOff size={18}/> : <Eye size={18}/>}
                                                </button>
                                            </div>
                                            {errors.password && <span className="text-red-500 text-[10px] flex items-center gap-1 mt-1"><AlertCircle size={10}/> {String(errors.password.message)}</span>}
                                        </div>
                                    </div>
                                </form>
                            </div>
                            
                            {/* Footer del Modal con Botones */}
                            <div className="p-5 border-t border-gray-100 bg-gray-50 flex items-center gap-3 shrink-0">
                                <button type="button" onClick={handleCerrarModal} className="w-1/3 bg-white border border-gray-200 text-gray-600 py-2.5 rounded-xl text-sm font-bold hover:bg-gray-100 transition-colors">
                                    Cancelar
                                </button>
                                <button type="submit" form="formUsuario" disabled={isSubmitting} className={`w-2/3 text-white py-2.5 rounded-xl text-sm font-bold transition-all shadow-md hover:shadow-lg flex justify-center items-center gap-2 ${editando ? 'bg-blue-600 hover:bg-blue-700' : 'bg-[#1ABB9C] hover:bg-[#16a085]'}`}>
                                    {isSubmitting ? <Loader className="animate-spin" size={18}/> : <Save size={18}/>} 
                                    {editando ? 'Guardar Cambios' : 'Crear Usuario'}
                                </button>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </MainLayout>
    );
};

export default UsuariosPage;
