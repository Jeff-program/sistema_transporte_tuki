import React, { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { yupResolver } from '@hookform/resolvers/yup';
import * as yup from 'yup';
import MainLayout from '../../layouts/MainLayout';
import {
    User, Mail, Lock, ShieldCheck, Save, Loader, AlertCircle, Camera, CheckCircle2, RotateCcw, Eye, EyeOff, User2Icon, Fingerprint, KeyRound, BadgeCheck, AtSign
} from 'lucide-react';
import api from '../../services/api';
import { notificarExito, notificarError, notificarCarga, cerrarNotificacion } from '../../services/feedbackService';
import { getCurrentUser } from '../../services/authService';

export interface DatosForm {
    nombreCompleto: string;
    email: string;
}

export interface PasswordForm {
    passwordActual: string;
    nuevaPassword: string;
    confirmarPassword: string;
}

const datosSchema = yup.object().shape({
    nombreCompleto: yup.string().required('El nombre es requerido').min(3, 'El nombre es muy corto'),
    email: yup.string().required('El correo es requerido').email('Formato de correo inválido'),
});

const passwordSchema = yup.object().shape({
    passwordActual: yup.string().required('Debes ingresar tu contraseña actual'),
    nuevaPassword: yup.string().required('Ingresa una nueva contraseña').min(6, 'Mínimo 6 caracteres'),
    confirmarPassword: yup.string()
        .required('Confirma tu nueva contraseña')
        .oneOf([yup.ref('nuevaPassword')], 'Las contraseñas no coinciden')
});


const getIniciales = (nombre: string) => {
    return nombre ? nombre.split(' ').map((n: string) => n[0]).join('').substring(0, 2).toUpperCase() : 'US';
};

const formatRol = (rol: string) => {
    if (!rol) return 'Usuario';
    return rol.replace(/_/g, ' ').toLowerCase().replace(/\b\w/g, l => l.toUpperCase());
};


const PerfilPage = () => {
    const usuarioLogueado = getCurrentUser() as any;

    const [fotoUrl, setFotoUrl] = useState<string | null>(usuarioLogueado?.fotoUrl || null);
    const [uploadingFoto, setUploadingFoto] = useState(false);
    const [activeTab, setActiveTab] = useState<'datos' | 'seguridad'>('datos');

    const [showPwdActual, setShowPwdActual] = useState(false);
    const [showPwdNueva, setShowPwdNueva] = useState(false);
    const [showPwdConf, setShowPwdConf] = useState(false);

    const formDatos = useForm<DatosForm>({
        resolver: yupResolver(datosSchema as any),
        defaultValues: { nombreCompleto: '', email: '' }
    });

    const formPassword = useForm<PasswordForm>({
        resolver: yupResolver(passwordSchema as any),
        defaultValues: { passwordActual: '', nuevaPassword: '', confirmarPassword: '' }
    });

    const nombreWatch = formDatos.watch('nombreCompleto');
    const emailWatch = formDatos.watch('email');

    useEffect(() => {
        if (usuarioLogueado) {
            formDatos.reset({
                nombreCompleto: usuarioLogueado.nombreCompleto || '',
                email: usuarioLogueado.email || ''
            });
            setFotoUrl(usuarioLogueado.fotoUrl || null);
        }
    }, [formDatos.reset]);

    const handleFotoChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        const idUser = usuarioLogueado?.idUsuario || usuarioLogueado?.id;
        if (!idUser) return notificarError("No se encontró la sesión del usuario");

        if (file.size > 5 * 1024 * 1024) {
            return notificarError("La imagen no debe superar los 5MB");
        }

        setUploadingFoto(true);
        const toastId = notificarCarga("Actualizando foto...");

        try {
            const formData = new FormData();
            formData.append('archivo', file);

            const res = await api.post(`/usuarios/${idUser}/foto`, formData, {
                headers: { 'Content-Type': 'multipart/form-data' }
            });

            const userActualizado = res.data;
            setFotoUrl(userActualizado.fotoUrl);

            const localUser = JSON.parse(localStorage.getItem('user') || '{}');
            localUser.fotoUrl = userActualizado.fotoUrl;
            localStorage.setItem('user', JSON.stringify(localUser));
            window.dispatchEvent(new Event("storage"));

            cerrarNotificacion(toastId);
            notificarExito("Foto actualizada correctamente");
        } catch (error) {
            cerrarNotificacion(toastId);
            notificarError("Formato de archivo no válido. Sube una imagen (JPG, JPEG, PNG, AVIF).");
        } finally {
            setUploadingFoto(false);
            e.target.value = '';
        }
    };

    const onSubmitDatos = async (data: DatosForm) => {
        const idUser = usuarioLogueado?.idUsuario || usuarioLogueado?.id;
        if (!idUser) return notificarError("Error: No se encontró la sesión del usuario.");

        const toastId = notificarCarga("Guardando información personal...");
        try {
            await api.put(`/usuarios/perfil/${idUser}`, {
                nombreCompleto: data.nombreCompleto,
                email: data.email
            });

            cerrarNotificacion(toastId);
            notificarExito("Datos personales actualizados");

            const localUser = JSON.parse(localStorage.getItem('user') || '{}');
            localUser.nombreCompleto = data.nombreCompleto;
            localUser.email = data.email;
            localStorage.setItem('user', JSON.stringify(localUser));
            window.dispatchEvent(new Event("storage"));

        } catch (error: any) {
            cerrarNotificacion(toastId);
            notificarError(error.response?.data?.error || error.response?.data || "No se pudieron actualizar los datos.");
        }
    };

    const onSubmitPassword = async (data: PasswordForm) => {
        const idUser = usuarioLogueado?.idUsuario || usuarioLogueado?.id;
        if (!idUser) return notificarError("Error: No se encontró la sesión del usuario.");

        const toastId = notificarCarga("Cambiando contraseña...");
        try {
            await api.put(`/usuarios/perfil/${idUser}`, {
                passwordActual: data.passwordActual,
                nuevaPassword: data.nuevaPassword
            });

            cerrarNotificacion(toastId);
            notificarExito("Contraseña cambiada con éxito");
            formPassword.reset();
        } catch (error: any) {
            cerrarNotificacion(toastId);
            notificarError(error.response?.data?.error || error.response?.data || "La contraseña actual es incorrecta.");
        }
    };

    const getInputClass = (error: any, isPassword = false) =>
        `w-full rounded-2xl ${isPassword ? 'pl-12 pr-12' : 'pl-12 pr-4'} py-3.5 text-sm transition-all duration-300 outline-none border-2 bg-white/50 ${
            error
                ? 'border-red-200 text-red-900 focus:border-red-400 focus:ring-4 focus:ring-red-500/10 bg-red-50/30'
                : 'border-gray-100 text-slate-700 focus:border-[#1ABB9C]/50 focus:bg-white focus:ring-4 focus:ring-[#1ABB9C]/5 hover:border-gray-200 hover:bg-white/80'
        }`;

    return (
        <MainLayout>
            <div className="min-h-screen bg-[#F8FAFC] relative overflow-hidden">

                <div className="max-w-7xl mx-auto pb-3">
                    
                    {/* HEADER */}
                    <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 mb-8 flex flex-col md:flex-row md:items-center justify-between gap-4 animate-in slide-in-from-top-4">
                        <div>
                            <h1 className="text-2xl font-bold text-[#2A3F54] flex items-center gap-3">
                                <div className="p-2 bg-blue-50 rounded-lg text-[#1ABB9C]"><User2Icon size={24} /></div>
                                Configuración de Perfil
                            </h1>
                            <p className="text-sm text-gray-400 mt-1 ml-1">Administra tu información personal y la seguridad de tu cuenta.</p>
                        </div>
                    </div>

                    <div className="grid grid-cols-1 xl:grid-cols-12 gap-8">
                        
                        {/* COLUMNA IZQUIERDA: PERFIL VISUAL */}
                        <div className="xl:col-span-4 xl:col-start-2 space-y-6">
                            {/* Tarjeta de Perfil Principal */}
                            <div className="bg-white/70 backdrop-blur-xl rounded-3xl shadow-xl shadow-slate-200/50 border border-white/50 overflow-hidden relative group">
                                {/* Banner */}
                                <div className="h-48 bg-gradient-to-br from-[#2A3F54] via-[#1e3347] to-[#1ABB9C] relative overflow-hidden">
                                    <div className="absolute inset-0 opacity-20">
                                        <svg className="w-full h-full" viewBox="0 0 100 100" preserveAspectRatio="none">
                                            <path d="M0,50 Q25,30 50,50 T100,50 L100,100 L0,100 Z" fill="white" />
                                            <path d="M0,70 Q25,50 50,70 T100,70 L100,100 L0,100 Z" fill="white" opacity="0.5" />
                                        </svg>
                                    </div>
                                    <div className="absolute top-4 right-4">
                                        <div className="bg-white/20 backdrop-blur-md rounded-full px-3 py-1 flex items-center gap-1.5 border border-white/30">
                                            <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse" />
                                            <span className="text-[10px] font-bold text-white uppercase tracking-wider">En línea</span>
                                        </div>
                                    </div>
                                </div>
                                
                                {/* AVATAR GRANDE - CENTRADO Y DESTACADO */}
                                <div className="relative px-6 -mt-28 mb-6 flex justify-center">
                                    <div className="relative group/avatar">
                                        {/* Anillo decorativo exterior */}
                                        <div className="absolute -inset-3 bg-gradient-to-br from-[#1ABB9C]/20 to-[#2A3F54]/20 rounded-full blur-md opacity-0 group-hover/avatar:opacity-100 transition-opacity duration-500" />
                                        
                                        <div className="relative w-52 h-52 sm:w-56 sm:h-56 rounded-full overflow-hidden bg-white shadow-2xl shadow-slate-400/40 border-[6px] border-white ring-[3px] ring-[#1ABB9C]/10 transition-transform duration-500 group-hover/avatar:scale-105">
                                            {fotoUrl ? (
                                                <img 
                                                    src={fotoUrl?.startsWith('http') ? fotoUrl : `http://localhost:8080${fotoUrl}`} 
                                                    alt="Perfil" 
                                                    className="w-full h-full object-cover"
                                                    onError={() => setFotoUrl(null)} 
                                                />
                                            ) : (
                                                <div className="w-full h-full bg-gradient-to-br from-[#2A3F54] to-[#3E5367] flex items-center justify-center text-white text-5xl font-black">
                                                    {getIniciales(nombreWatch || usuarioLogueado?.nombreCompleto)}
                                                </div>
                                            )}
                                        </div>
                                        
                                        {/* Botón de cámara */}
                                        <label className={`absolute bottom-2 right-2 w-14 h-14 bg-gradient-to-br from-[#1ABB9C] to-[#15997D] rounded-full shadow-xl shadow-[#1ABB9C]/30 flex items-center justify-center cursor-pointer transition-all duration-300 hover:scale-110 hover:shadow-2xl hover:shadow-[#1ABB9C]/40 border-4 border-white ${uploadingFoto ? 'animate-pulse' : ''}`}>
                                            {uploadingFoto ? (
                                                <Loader className="animate-spin text-white" size={24} />
                                            ) : (
                                                <Camera size={24} className="text-white" />
                                            )}
                                            <input 
                                                type="file" 
                                                className="hidden" 
                                                accept="image/png, image/jpeg, image/jpg" 
                                                onChange={handleFotoChange} 
                                                disabled={uploadingFoto} 
                                            />
                                        </label>
                                    </div>
                                </div>

                                {/* Info del usuario */}
                                <div className="px-6 pb-8 text-center">
                                    <h2 className="text-2xl font-black text-[#2A3F54] leading-tight mb-2">
                                        {nombreWatch || usuarioLogueado?.nombreCompleto || 'Cargando...'}
                                    </h2>
                                    
                                    <div className="flex items-center justify-center gap-2 mb-5">
                                        <BadgeCheck size={18} className="text-[#1ABB9C]" />
                                        <span className="text-sm font-bold text-[#1ABB9C] uppercase tracking-widest">
                                            {formatRol(usuarioLogueado?.rol)}
                                        </span>
                                    </div>

                                    <div className="inline-flex items-center gap-2.5 px-5 py-2.5 bg-slate-50 rounded-2xl border border-slate-100 shadow-sm">
                                        <AtSign size={16} className="text-slate-400" />
                                        <span className="text-sm text-slate-600 font-semibold truncate max-w-[220px]">
                                            {emailWatch || usuarioLogueado?.email}
                                        </span>
                                    </div>
                                </div>
                            </div>

                            {/* Tarjeta de Estado */}
                            <div className="bg-gradient-to-br from-emerald-50 via-white to-teal-50/50 rounded-3xl p-6 border border-emerald-100/80 shadow-lg shadow-emerald-100/30 relative overflow-hidden group hover:shadow-xl hover:shadow-emerald-200/40 transition-all duration-500">
                                <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-400/10 rounded-full -translate-y-1/2 translate-x-1/2 group-hover:scale-150 transition-transform duration-700" />
                                
                                <div className="relative flex items-start gap-4">
                                    <div className="bg-white p-3 rounded-2xl shadow-sm shadow-emerald-200/50 text-emerald-500">
                                        <Fingerprint size={24} />
                                    </div>
                                    <div className="flex-1">
                                        <h3 className="font-black text-emerald-900 text-sm mb-1">Cuenta Verificada</h3>
                                        <p className="text-xs text-emerald-600/70 leading-relaxed">
                                            Tu identidad ha sido confirmada. Tienes acceso completo a todas las funcionalidades del sistema TUKI.
                                        </p>
                                    </div>
                                </div>
                                
                                <div className="mt-4 pt-4 border-t border-emerald-100 flex items-center justify-between">
                                    <span className="text-[10px] font-bold text-emerald-600/60 uppercase tracking-widest">Estado</span>
                                    <div className="flex items-center gap-1.5">
                                        <CheckCircle2 size={14} className="text-emerald-500" />
                                        <span className="text-xs font-bold text-emerald-700">Activo</span>
                                    </div>
                                </div>
                            </div>

                            {/* Navegación rápida (mobile) */}
                            <div className="xl:hidden bg-white/70 backdrop-blur-xl rounded-2xl p-2 border border-white/50 shadow-lg shadow-slate-200/30 flex gap-1">
                                <button
                                    onClick={() => setActiveTab('datos')}
                                    className={`flex-1 flex items-center justify-center gap-2 py-3 px-4 rounded-xl text-xs font-bold uppercase tracking-wider transition-all duration-300 ${
                                        activeTab === 'datos'
                                            ? 'bg-[#2A3F54] text-white shadow-lg shadow-[#2A3F54]/20'
                                            : 'text-slate-400 hover:text-slate-600 hover:bg-slate-50'
                                    }`}
                                >
                                    <User size={16} />
                                    Datos
                                </button>
                                <button
                                    onClick={() => setActiveTab('seguridad')}
                                    className={`flex-1 flex items-center justify-center gap-2 py-3 px-4 rounded-xl text-xs font-bold uppercase tracking-wider transition-all duration-300 ${
                                        activeTab === 'seguridad'
                                            ? 'bg-[#2A3F54] text-white shadow-lg shadow-[#2A3F54]/20'
                                            : 'text-slate-400 hover:text-slate-600 hover:bg-slate-50'
                                    }`}
                                >
                                    <Lock size={16} />
                                    Seguridad
                                </button>
                            </div>
                        </div>

                        {/* COLUMNA DERECHA: FORMULARIOS */}
                        <div className="xl:col-span-6 space-y-6">
                            
                            {/* FORMULARIO 1: DATOS PERSONALES */}
                            <div className={`${activeTab !== 'datos' ? 'hidden xl:block' : ''}`}>
                                <form onSubmit={formDatos.handleSubmit(onSubmitDatos)} className="bg-white/70 backdrop-blur-xl rounded-3xl shadow-xl shadow-slate-200/50 border border-white/50 overflow-hidden group hover:shadow-2xl  transition-all duration-500">
                                    <div className="px-8 py-6 border-b border-slate-100 flex items-center justify-between bg-gradient-to-r from-white to-slate-50/50">
                                        <div className="flex items-center gap-3">
                                            <div className="p-2.5 bg-[#1ABB9C]/10 rounded-xl">
                                                <User className="text-[#1ABB9C]" size={20} />
                                            </div>
                                            <div>
                                                <h2 className="text-lg font-black text-[#2A3F54]">Información Personal</h2>
                                                <p className="text-xs text-slate-400 font-medium">Actualiza tus datos de contacto</p>
                                            </div>
                                        </div>
                                    </div>

                                    <div className="p-8">
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                            <div className="space-y-2 group/input">
                                                <label className="text-[11px] font-black text-slate-400 uppercase tracking-widest ml-1 group-focus-within/input:text-[#1ABB9C] transition-colors">
                                                    Nombre Completo
                                                </label>
                                                <div className="relative">
                                                    <User size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300 group-focus-within/input:text-[#1ABB9C] transition-colors" />
                                                    <input
                                                        type="text"
                                                        {...formDatos.register('nombreCompleto')}
                                                        className={getInputClass(formDatos.formState.errors.nombreCompleto)}
                                                        placeholder="Ej: Juan Carlos Pérez"
                                                    />
                                                </div>
                                                {formDatos.formState.errors.nombreCompleto && (
                                                    <p className="text-red-500 text-[11px] flex items-center gap-1.5 font-bold mt-1 ml-1 animate-in slide-in-from-top-1">
                                                        <AlertCircle size={12} /> {formDatos.formState.errors.nombreCompleto.message}
                                                    </p>
                                                )}
                                            </div>

                                            <div className="space-y-2 group/input">
                                                <label className="text-[11px] font-black text-slate-400 uppercase tracking-widest ml-1 group-focus-within/input:text-[#1ABB9C] transition-colors">
                                                    Correo Electrónico
                                                </label>
                                                <div className="relative">
                                                    <Mail size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300 group-focus-within/input:text-[#1ABB9C] transition-colors" />
                                                    <input
                                                        type="email"
                                                        {...formDatos.register('email')}
                                                        className={getInputClass(formDatos.formState.errors.email)}
                                                        placeholder="ejemplo@correo.com"
                                                    />
                                                </div>
                                                {formDatos.formState.errors.email && (
                                                    <p className="text-red-500 text-[11px] flex items-center gap-1.5 font-bold mt-1 ml-1 animate-in slide-in-from-top-1">
                                                        <AlertCircle size={12} /> {formDatos.formState.errors.email.message}
                                                    </p>
                                                )}
                                            </div>
                                        </div>
                                    </div>

                                    <div className="px-8 py-5 bg-slate-50/50 border-t border-slate-100 flex flex-col sm:flex-row items-center justify-end gap-3">
                                        <button
                                            type="button"
                                            onClick={() => {
                                                formDatos.reset({
                                                    nombreCompleto: usuarioLogueado?.nombreCompleto || '',
                                                    email: usuarioLogueado?.email || ''
                                                });
                                            }}
                                            className="w-full sm:w-auto flex items-center justify-center gap-2 px-6 py-3 text-xs font-black text-slate-400 hover:text-slate-600 hover:bg-white rounded-xl transition-all duration-300 border border-transparent hover:border-slate-200 hover:shadow-sm uppercase tracking-widest"
                                        >
                                            <RotateCcw size={15} />
                                            Restablecer
                                        </button>
                                        <button
                                            type="submit"
                                            disabled={formDatos.formState.isSubmitting}
                                            className="w-full sm:w-auto px-8 py-3 bg-gradient-to-r from-[#2A3F54] to-[#1a2938] hover:from-[#1ABB9C] hover:to-[#15997D]
                                                        text-white font-black text-xs uppercase tracking-widest rounded-xl shadow-lg shadow-[#2A3F54]/20 
                                                        hover:shadow-[#1ABB9C]/30 transition-all duration-500 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 hover:-translate-y-0.5 active:translate-y-0"
                                        >
                                            {formDatos.formState.isSubmitting ? (
                                                <Loader size={16} className="animate-spin" />
                                            ) : (
                                                <Save size={16} />
                                            )}
                                            Guardar Cambios
                                        </button>
                                    </div>
                                </form>
                            </div>

                            {/* FORMULARIO 2: SEGURIDAD */}
                            <div className={`${activeTab !== 'seguridad' ? 'hidden xl:block' : ''}`}>
                                <form onSubmit={formPassword.handleSubmit(onSubmitPassword)} className="bg-white/70 backdrop-blur-xl rounded-3xl shadow-xl shadow-slate-200/50 border border-white/50 overflow-hidden group hover:shadow-2xl  transition-all duration-500">
                                    <div className="px-8 py-6 border-b border-slate-100 flex items-center justify-between bg-gradient-to-r from-white to-slate-50/50">
                                        <div className="flex items-center gap-3">
                                            <div className="p-2.5 bg-amber-50 rounded-xl">
                                                <KeyRound className="text-amber-500" size={20} />
                                            </div>
                                            <div>
                                                <h2 className="text-lg font-black text-[#2A3F54]">Seguridad</h2>
                                                <p className="text-xs text-slate-400 font-medium">Cambia tu contraseña de acceso</p>
                                            </div>
                                        </div>
                                        <ShieldCheck size={20} className="text-slate-200" />
                                    </div>

                                    <div className="p-8 space-y-6">
                                        <div className="md:w-2/3 space-y-2 group/input">
                                            <label className="text-[11px] font-black text-slate-400 uppercase tracking-widest ml-1 group-focus-within/input:text-amber-500 transition-colors">
                                                Contraseña Actual
                                            </label>
                                            <div className="relative">
                                                <Lock size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300 group-focus-within/input:text-amber-400 transition-colors" />
                                                <input
                                                    type={showPwdActual ? "text" : "password"}
                                                    {...formPassword.register('passwordActual')}
                                                    className={`${getInputClass(formPassword.formState.errors.passwordActual, true)} border-amber-100/50 focus:border-amber-300 focus:ring-amber-500/10`}
                                                    placeholder="Ingresa tu contraseña actual"
                                                />
                                                <button
                                                    type="button"
                                                    onClick={() => setShowPwdActual(!showPwdActual)}
                                                    className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-300 hover:text-amber-500 transition-colors p-1 rounded-lg hover:bg-amber-50"
                                                >
                                                    {showPwdActual ? <EyeOff size={18} /> : <Eye size={18} />}
                                                </button>
                                            </div>
                                            {formPassword.formState.errors.passwordActual && (
                                                <p className="text-red-500 text-[11px] flex items-center gap-1.5 font-bold mt-1 ml-1 animate-in slide-in-from-top-1">
                                                    <AlertCircle size={12} /> {formPassword.formState.errors.passwordActual.message}
                                                </p>
                                            )}
                                        </div>

                                        <div className="h-px bg-gradient-to-r from-transparent via-slate-200 to-transparent" />

                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                            <div className="space-y-2 group/input">
                                                <label className="text-[11px] font-black text-slate-400 uppercase tracking-widest ml-1 group-focus-within/input:text-amber-500 transition-colors">
                                                    Nueva Contraseña
                                                </label>
                                                <div className="relative">
                                                    <Lock size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300 group-focus-within/input:text-amber-400 transition-colors" />
                                                    <input
                                                        type={showPwdNueva ? "text" : "password"}
                                                        {...formPassword.register('nuevaPassword')}
                                                        className={`${getInputClass(formPassword.formState.errors.nuevaPassword, true)} border-amber-100/50 focus:border-amber-300 focus:ring-amber-500/10`}
                                                        placeholder="Mínimo 6 caracteres"
                                                    />
                                                    <button
                                                        type="button"
                                                        onClick={() => setShowPwdNueva(!showPwdNueva)}
                                                        className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-300 hover:text-amber-500 transition-colors p-1 rounded-lg hover:bg-amber-50"
                                                    >
                                                        {showPwdNueva ? <EyeOff size={18} /> : <Eye size={18} />}
                                                    </button>
                                                </div>
                                                {formPassword.formState.errors.nuevaPassword && (
                                                    <p className="text-red-500 text-[11px] flex items-center gap-1.5 font-bold mt-1 ml-1 animate-in slide-in-from-top-1">
                                                        <AlertCircle size={12} /> {formPassword.formState.errors.nuevaPassword.message}
                                                    </p>
                                                )}
                                            </div>

                                            <div className="space-y-2 group/input">
                                                <label className="text-[11px] font-black text-slate-400 uppercase tracking-widest ml-1 group-focus-within/input:text-amber-500 transition-colors">
                                                    Confirmar Contraseña
                                                </label>
                                                <div className="relative">
                                                    <ShieldCheck size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300 group-focus-within/input:text-amber-400 transition-colors" />
                                                    <input
                                                        type={showPwdConf ? "text" : "password"}
                                                        {...formPassword.register('confirmarPassword')}
                                                        className={`${getInputClass(formPassword.formState.errors.confirmarPassword, true)} border-amber-100/50 focus:border-amber-300 focus:ring-amber-500/10`}
                                                        placeholder="Repite la nueva contraseña"
                                                    />
                                                    <button
                                                        type="button"
                                                        onClick={() => setShowPwdConf(!showPwdConf)}
                                                        className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-300 hover:text-amber-500 transition-colors p-1 rounded-lg hover:bg-amber-50"
                                                    >
                                                        {showPwdConf ? <EyeOff size={18} /> : <Eye size={18} />}
                                                    </button>
                                                </div>
                                                {formPassword.formState.errors.confirmarPassword && (
                                                    <p className="text-red-500 text-[11px] flex items-center gap-1.5 font-bold mt-1 ml-1 animate-in slide-in-from-top-1">
                                                        <AlertCircle size={12} /> {formPassword.formState.errors.confirmarPassword.message}
                                                    </p>
                                                )}
                                            </div>
                                        </div>
                                    </div>

                                    <div className="px-8 py-5 bg-slate-50/50 border-t border-slate-100 flex flex-col sm:flex-row items-center justify-end gap-3">
                                        <button
                                            type="button"
                                            onClick={() => {
                                                formPassword.reset();
                                                setShowPwdActual(false);
                                                setShowPwdNueva(false);
                                                setShowPwdConf(false);
                                            }}
                                            className="w-full sm:w-auto flex items-center justify-center gap-2 px-6 py-3 text-xs font-black text-slate-400 hover:text-slate-600 hover:bg-white rounded-xl transition-all duration-300 border border-transparent hover:border-slate-200 hover:shadow-sm uppercase tracking-widest"
                                        >
                                            <RotateCcw size={15} />
                                            Limpiar
                                        </button>
                                        <button
                                            type="submit"
                                            disabled={formPassword.formState.isSubmitting}
                                            className="w-full sm:w-auto px-8 py-3 bg-gradient-to-r from-slate-700 to-slate-800 hover:from-amber-500 hover:to-orange-500
                                                        text-white font-black text-xs uppercase tracking-widest rounded-xl shadow-lg shadow-slate-700/20 
                                                        hover:shadow-amber-500/30 transition-all duration-500 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 hover:-translate-y-0.5 active:translate-y-0"
                                        >
                                            {formPassword.formState.isSubmitting ? (
                                                <Loader size={16} className="animate-spin" />
                                            ) : (
                                                <ShieldCheck size={16} />
                                            )}
                                            Actualizar Contraseña
                                        </button>
                                    </div>
                                </form>
                            </div>

                        </div>
                    </div>
                </div>
            </div>
        </MainLayout>
    );
};

export default PerfilPage;