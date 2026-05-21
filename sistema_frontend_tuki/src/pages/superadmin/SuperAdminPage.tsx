import React, { useState } from 'react';
import MainLayout from '../../layouts/MainLayout';
import { ShieldAlert, Database, Download, Power, AlertTriangle, CheckCircle } from 'lucide-react';
import api from '../../services/api';
import { notificarExito, notificarError, notificarCarga, cerrarNotificacion, confirmarAccion } from '../../services/feedbackService';

const SuperAdminPage = () => {
    const [enMantenimiento, setEnMantenimiento] = useState(false); // Podrías hacer un GET inicial para saber el estado real

    const handleToggleMantenimiento = async () => {
        const accion = enMantenimiento ? 'desactivar' : 'activar';
        const confirmado = await confirmarAccion(
            `¿${accion.toUpperCase()} MANTENIMIENTO?`,
            enMantenimiento 
                ? "El sistema volverá a estar disponible para todos los usuarios y agencias."
                : "El sistema se bloqueará para todos los usuarios. Solo tú podrás acceder.",
            `Sí, ${accion}`,
            enMantenimiento ? 'info' : 'danger'
        );

        if (!confirmado) return;

        const toastId = notificarCarga("Cambiando estado del sistema...");
        try {
            await api.post('/superadmin/mantenimiento/toggle');
            setEnMantenimiento(!enMantenimiento);
            cerrarNotificacion(toastId);
            notificarExito(`Mantenimiento ${!enMantenimiento ? 'ACTIVADO' : 'DESACTIVADO'}`);
        } catch (error) {
            cerrarNotificacion(toastId);
            notificarError("No se pudo cambiar el estado del sistema.");
        }
    };

    const handleDescargarBackup = async () => {
        const toastId = notificarCarga("Generando respaldo de la base de datos (Esto puede tardar)...");
        try {
            // Se usa responseType 'blob' para descargar archivos
            const response = await api.get('/superadmin/backup', { responseType: 'blob' });
            
            // Crear un enlace temporal para descargar el archivo
            const url = window.URL.createObjectURL(new Blob([response.data]));
            const link = document.createElement('a');
            link.href = url;
            
            // Nombre del archivo con fecha
            const fecha = new Date().toISOString().split('T')[0];
            link.setAttribute('download', `backup_transporte_tuki_${fecha}.dump`);
            
            document.body.appendChild(link);
            link.click();
            link.parentNode?.removeChild(link);
            
            cerrarNotificacion(toastId);
            notificarExito("Backup descargado con éxito");
        } catch (error) {
            cerrarNotificacion(toastId);
            notificarError("Error al generar el archivo de respaldo.");
        }
    };

    return (
        <MainLayout>
            <div className="max-w-5xl mx-auto pb-8">
                {/* HEADER */}
                <div className="bg-gradient-to-r from-slate-800 to-slate-900 rounded-2xl shadow-lg border border-slate-700 p-6 mb-8 flex items-center justify-between text-white">
                    <div className="flex items-center gap-4">
                        <div className="p-3 bg-red-500/20 rounded-xl text-red-400">
                            <ShieldAlert size={32} />
                        </div>
                        <div>
                            <h1 className="text-2xl font-black tracking-wide">Panel de Súper Administrador</h1>
                            <p className="text-sm text-slate-400 mt-1">Controles críticos del servidor y base de datos.</p>
                        </div>
                    </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {/* TARJETA MANTENIMIENTO */}
                    <div className={`rounded-3xl border-2 transition-colors duration-500 overflow-hidden ${enMantenimiento ? 'border-red-400 bg-red-50' : 'border-gray-200 bg-white shadow-xl'}`}>
                        <div className="p-8">
                            <div className="flex items-center justify-between mb-4">
                                <div className={`p-3 rounded-full ${enMantenimiento ? 'bg-red-100 text-red-600' : 'bg-gray-100 text-gray-500'}`}>
                                    <Power size={28} />
                                </div>
                                <span className={`px-4 py-1.5 rounded-full text-xs font-black uppercase tracking-widest ${enMantenimiento ? 'bg-red-600 text-white animate-pulse' : 'bg-green-100 text-green-700'}`}>
                                    {enMantenimiento ? 'EN MANTENIMIENTO' : 'SISTEMA ONLINE'}
                                </span>
                            </div>
                            
                            <h2 className="text-xl font-bold text-gray-800 mb-2">Modo Mantenimiento</h2>
                            <p className="text-sm text-gray-500 mb-8 h-10">
                                Bloquea el acceso a todos los vendedores y administradores regulares para realizar actualizaciones seguras.
                            </p>

                            <button 
                                onClick={handleToggleMantenimiento}
                                className={`w-full py-4 rounded-xl font-black uppercase tracking-widest text-sm transition-transform active:scale-95 flex items-center justify-center gap-2 ${enMantenimiento ? 'bg-white border-2 border-gray-300 text-gray-700 hover:bg-gray-50' : 'bg-red-600 text-white shadow-lg hover:bg-red-700 hover:shadow-red-600/30'}`}
                            >
                                {enMantenimiento ? <CheckCircle size={18}/> : <AlertTriangle size={18}/>}
                                {enMantenimiento ? 'Desactivar Mantenimiento' : 'Apagar Sistema'}
                            </button>
                        </div>
                    </div>

                    {/* TARJETA BACKUP */}
                    <div className="bg-white rounded-3xl border border-gray-200 shadow-xl overflow-hidden group">
                        <div className="p-8">
                            <div className="flex items-center justify-between mb-4">
                                <div className="p-3 bg-blue-50 text-blue-600 rounded-full group-hover:scale-110 transition-transform">
                                    <Database size={28} />
                                </div>
                            </div>
                            
                            <h2 className="text-xl font-bold text-gray-800 mb-2">Respaldo de Base de Datos</h2>
                            <p className="text-sm text-gray-500 mb-8 h-10">
                                Genera y descarga una copia de seguridad completa (.dump) con todos los registros, pasajes y usuarios actuales.
                            </p>

                            <button 
                                onClick={handleDescargarBackup}
                                className="w-full py-4 rounded-xl font-black uppercase tracking-widest text-sm bg-blue-600 text-white shadow-lg hover:bg-blue-700 hover:shadow-blue-600/30 transition-transform active:scale-95 flex items-center justify-center gap-2"
                            >
                                <Download size={18}/> Descargar Backup Ahora
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </MainLayout>
    );
};

export default SuperAdminPage;