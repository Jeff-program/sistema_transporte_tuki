import React, { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import MainLayout from '../../../layouts/MainLayout';
import { Waves, Plus, Save, Loader, Trash2, ToggleLeft, ToggleRight, Edit, Search, ChevronLeft, ChevronRight, X } from 'lucide-react';
import { getRios, saveRio, toggleEstadoRio, deleteRio } from '../../../services/configService';
import { notificarExito, notificarError, notificarCarga, cerrarNotificacion, confirmarAccion } from '../../../services/feedbackService';

const RiosPage = () => {
    const { register, handleSubmit, reset, formState: { errors, isSubmitting } } = useForm({
        defaultValues: { idRio: null, nombreRio: '', estado: 'ACTIVO' }
    });

    const [rios, setRios] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [busqueda, setBusqueda] = useState('');

    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editando, setEditando] = useState(false);

    const [currentPage, setCurrentPage] = useState(1);
    const [itemsPerPage, setItemsPerPage] = useState(10);

    useEffect(() => {
        const handleResize = () => setItemsPerPage(window.innerWidth < 1024 ? 5 : 10);
        window.addEventListener('resize', handleResize);
        handleResize();
        return () => window.removeEventListener('resize', handleResize);
    }, []);

    const cargarRios = async () => {
        setLoading(true);
        try {
            const data = await getRios();
            setRios(data.sort((a: any, b: any) => b.idRio - a.idRio));
        } catch (error) {
            notificarError("Error al cargar los ríos.");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        cargarRios();
    }, []);

    useEffect(() => { 
        setCurrentPage(1); 
    }, [busqueda]);

    const abrirModalNuevo = () => {
        reset({ idRio: null, nombreRio: '', estado: 'ACTIVO' });
        setEditando(false);
        setIsModalOpen(true);
    };

    const handleCerrarModal = () => {
        setIsModalOpen(false);
        setEditando(false);
        reset();
    };

    const onSubmit = async (data: any) => {
        const toastId = notificarCarga('Guardando cuenca fluvial...');
        try {
            await saveRio(data);
            cerrarNotificacion(toastId);
            notificarExito(editando ? 'Río actualizado correctamente' : 'Río registrado correctamente');
            
            handleCerrarModal();
            cargarRios();
        } catch (error) {
            cerrarNotificacion(toastId);
            notificarError('Error al guardar el río.');
        }
    };

    const editar = (rio: any) => {
        reset({
            idRio: rio.idRio,
            nombreRio: rio.nombreRio,
            estado: rio.estado
        });
        setEditando(true);
        setIsModalOpen(true);
    };

    const handleToggleEstado = async (rio: any) => {
        try {
            setRios(prev => prev.map(r => 
                r.idRio === rio.idRio ? { ...r, estado: r.estado === 'ACTIVO' ? 'INACTIVO' : 'ACTIVO' } : r
            ));
            
            await toggleEstadoRio(rio.idRio);
            notificarExito(`Río ${rio.estado === 'ACTIVO' ? 'desactivado' : 'activado'} correctamente`);
        } catch (error) {
            notificarError("No se pudo cambiar el estado");
            cargarRios(); 
        }
    };

    const handleEliminar = async (id: number) => {
        const confirmado = await confirmarAccion(
            "¿Eliminar este río?",
            "Esta acción borrará la cuenca fluvial. Asegúrese de que no haya puertos vinculados a este río.",
            "Sí, eliminar",
            "danger"
        );

        if (!confirmado) return;

        const toastId = notificarCarga("Eliminando...");
        try {
            await deleteRio(id);
            cerrarNotificacion(toastId);
            notificarExito("Río eliminado correctamente");
            if (editando) handleCerrarModal();
            cargarRios();
        } catch (error: any) {
            cerrarNotificacion(toastId);
            notificarError("No se puede eliminar. Probablemente existan puertos vinculados a este río.");
        }
    };

    const riosFiltrados = rios.filter(r => 
        r.nombreRio.toLowerCase().includes(busqueda.toLowerCase())
    );

    const indexOfLastItem = currentPage * itemsPerPage;
    const indexOfFirstItem = indexOfLastItem - itemsPerPage;
    const currentItems = riosFiltrados.slice(indexOfFirstItem, indexOfLastItem);
    const totalPages = Math.ceil(riosFiltrados.length / itemsPerPage);
    const paginate = (pageNumber: number) => setCurrentPage(pageNumber);

    return (
        <MainLayout>
            <div className="max-w-7xl mx-auto pb-3 relative">
                
                {/* HEADER CON BOTÓN NUEVO RÍO */}
                <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 mb-8 flex flex-col md:flex-row md:items-center justify-between gap-4 animate-in slide-in-from-top-4">
                    <div className="flex items-center gap-4">
                        <div className="p-3 bg-blue-50 rounded-xl text-blue-500"><Waves size={28} /></div>
                        <div>
                            <h1 className="text-2xl font-bold text-[#2A3F54]">Gestión de Ríos</h1>
                            <p className="text-sm text-gray-400 mt-1">Administra los ríos y ejes comerciales para agrupar los puertos.</p>
                        </div>
                    </div>

                    <div className="flex flex-col sm:flex-row items-center gap-3 w-full md:w-auto">
                        <div className="relative group w-full sm:w-72">
                            <Search className="absolute left-3 top-3 text-gray-400" size={18} />
                            <input 
                                type="text" 
                                placeholder="Buscar río..." 
                                value={busqueda} 
                                onChange={(e) => setBusqueda(e.target.value)} 
                                className="pl-10 pr-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm w-full focus:outline-none focus:border-[#1ABB9C] transition-colors"
                            />
                        </div>
                        <button 
                            onClick={abrirModalNuevo}
                            className="w-full sm:w-auto flex items-center justify-center gap-2 bg-[#2A3F54] hover:bg-[#1f2f3f] text-white px-5 py-2.5 rounded-xl font-bold text-sm shadow-md transition-transform hover:scale-105 active:scale-95"
                        >
                            <Plus size={18} /> Registrar Nuevo Río
                        </button>
                    </div>
                </div>

                {/* TABLA DE RÍOS */}
                <div className="bg-white rounded-2xl shadow-xl border border-gray-100 overflow-hidden flex flex-col max-h-[calc(100vh-220px)] h-fit animate-in fade-in duration-500">
                    
                    <div className="bg-[#2A3F54] border-b border-gray-100 px-6 py-4 flex flex-col sm:flex-row justify-between items-center gap-4 shrink-0">
                        <h3 className="font-bold text-white flex items-center gap-2">
                            Ríos Registrados <span className="text-white text-xs font-normal">({riosFiltrados.length})</span>
                        </h3>
                    </div>

                    {loading ? (
                        <div className="flex-1 flex justify-center items-center p-12">
                            <Loader className="animate-spin text-blue-400" size={40}/>
                        </div>
                    ) : riosFiltrados.length === 0 ? (
                        <div className="flex-1 flex flex-col items-center justify-center text-center p-12">
                            <div className="bg-gray-50 p-6 rounded-full mb-4 border border-gray-100">
                                <Waves size={48} className="text-gray-300" />
                            </div>
                            <h4 className="text-gray-600 font-bold text-lg">No se encontraron ríos</h4>
                            <p className="text-gray-400 text-sm mt-1">Intenta con otro término de búsqueda o registra tu primer río.</p>
                        </div>
                    ) : (
                        <div className="overflow-auto flex-1 custom-scrollbar">
                            <table className="w-full text-sm text-left">
                                <thead className="bg-gray-50/80 text-gray-500 font-bold uppercase text-[10px] tracking-wider border-b border-gray-100 sticky top-0 z-10 backdrop-blur-md">
                                    <tr>
                                        <th className="px-6 py-4 w-[50px] text-center">N°</th>
                                        <th className="px-6 py-4">Nombre del Río</th>
                                        <th className="px-6 py-4 text-center">Estado</th>
                                        <th className="px-6 py-4 text-center">Acciones</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-50">
                                    {currentItems.map((r, index) => (
                                        <tr key={r.idRio} className={`hover:bg-blue-50/50 transition-colors ${r.estado === 'INACTIVO' ? 'opacity-60 bg-gray-50' : ''}`}>
                                            <td className="px-6 py-4 text-center font-bold text-gray-400">
                                                {(currentPage - 1) * itemsPerPage + index + 1}
                                            </td>
                                            <td className="px-6 py-4 font-bold text-[#2A3F54] text-base">{r.nombreRio}</td>
                                            
                                            <td className="px-6 py-4 text-center">
                                                <div className="flex items-center justify-center gap-3">
                                                    <span className={`px-3 py-1 rounded-full text-[10px] font-bold border ${r.estado === 'ACTIVO' ? 'bg-green-50 text-green-600 border-green-200' : 'bg-gray-100 text-gray-500 border-gray-200'}`}>
                                                        {r.estado}
                                                    </span>
                                                    <button 
                                                        onClick={() => handleToggleEstado(r)} 
                                                        title={r.estado === 'ACTIVO' ? "Desactivar" : "Activar"} 
                                                        className="transition-transform hover:scale-110 focus:outline-none"
                                                    >
                                                        {r.estado === 'ACTIVO'
                                                            ? <ToggleRight size={28} className="text-[#1ABB9C]"/> 
                                                            : <ToggleLeft size={28} className="text-gray-300"/>}
                                                    </button>
                                                </div>
                                            </td>
                                            
                                            <td className="px-6 py-4 text-center">
                                                <div className="flex justify-center gap-2">
                                                    <button 
                                                        onClick={() => editar(r)} 
                                                        className="inline-flex items-center gap-1 bg-white border border-gray-200 text-gray-500 hover:border-blue-300 hover:bg-blue-50 hover:text-blue-600 px-3 py-1.5 rounded-lg transition-colors text-xs font-bold shadow-sm"
                                                    >
                                                        <Edit size={14}/> Editar
                                                    </button>
                                                    <button 
                                                        onClick={() => handleEliminar(r.idRio)} 
                                                        className="inline-flex items-center gap-1 bg-white border border-gray-200 text-gray-500 hover:border-red-300 hover:bg-red-50 hover:text-red-600 px-3 py-1.5 rounded-lg transition-colors text-xs font-bold shadow-sm"
                                                    >
                                                        <Trash2 size={14}/> Eliminar
                                                    </button>
                                                </div>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}

                    {/* 🔥 FOOTER CON PAGINACIÓN 🔥 */}
                    {!loading && riosFiltrados.length > 0 && (
                        <div className="border-t border-gray-100 p-4 bg-gray-50/80 flex justify-between items-center shrink-0">
                            <span className="text-xs text-gray-500 font-medium bg-white px-3 py-1 rounded-full border border-gray-200 shadow-sm">
                                Mostrando <span className="text-[#2A3F54] font-bold"> {indexOfFirstItem + 1}-{Math.min(indexOfLastItem, riosFiltrados.length)}</span> de {riosFiltrados.length}
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
                    )}

                </div>

                {/* MODAL DE REGISTRO / EDITAR DE RÍOS */}
                {isModalOpen && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4 animate-in fade-in duration-200">
                        <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm flex flex-col overflow-hidden animate-in zoom-in-95 duration-200">
                            
                            <div className={`p-5 flex justify-between items-center shrink-0 ${editando ? 'bg-gradient-to-r from-blue-600 to-blue-500' : 'bg-gradient-to-r from-[#2A3F54] to-[#3E5367]'}`}>
                                <h3 className="font-bold text-white text-lg flex items-center gap-2">
                                    {editando ? <Edit size={20} className="text-white"/> : <Plus size={20} className="text-blue-300"/>} 
                                    {editando ? 'Modificar Río' : 'Registrar Nuevo Río'}
                                </h3>
                                <button onClick={handleCerrarModal} className="text-white/70 hover:text-white bg-white/10 hover:bg-white/20 p-1 rounded-lg transition-colors">
                                    <X size={20} />
                                </button>
                            </div>
                            
                            <div className="p-6">
                                <form id="formRio" onSubmit={handleSubmit(onSubmit)} className="space-y-4">
                                    <input type="hidden" {...register('idRio')} />
                                    <div className="group">
                                        <label className="text-xs font-bold text-gray-500 uppercase mb-1.5 flex items-center gap-1">Nombre de la Cuenca Fluvial</label>
                                        <input 
                                            {...register('nombreRio', { required: 'El nombre es obligatorio' })} 
                                            className={`w-full bg-gray-50 border p-3 rounded-xl text-sm outline-none transition-all ${errors.nombreRio ? 'border-red-300 focus:border-red-500' : 'border-gray-200 focus:bg-white focus:border-blue-400 focus:ring-4 focus:ring-blue-50'}`} 
                                            placeholder="Ej: Río Amazonas" 
                                        />
                                        {errors.nombreRio && <span className="text-red-500 text-xs mt-1 block">{String(errors.nombreRio.message)}</span>}
                                    </div>
                                </form>
                            </div>
                            
                            <div className="p-5 border-t border-gray-100 bg-gray-50 flex items-center gap-3">
                                <button type="button" onClick={handleCerrarModal} className="w-1/3 bg-white border border-gray-200 text-gray-600 py-2.5 rounded-xl text-sm font-bold hover:bg-gray-100 transition-colors">
                                    Cancelar
                                </button>
                                <button type="submit" form="formRio" disabled={isSubmitting} className={`w-2/3 text-white py-2.5 rounded-xl text-sm font-bold transition-all shadow-md hover:shadow-lg flex justify-center items-center gap-2 ${editando ? 'bg-blue-600 hover:bg-blue-700' : 'bg-[#1ABB9C] hover:bg-[#16a085]'}`}>
                                    {isSubmitting ? <Loader className="animate-spin" size={18}/> : <Save size={18}/>} 
                                    {editando ? 'Guardar Cambios' : 'Registrar Río'}
                                </button>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </MainLayout>
    );
};

export default RiosPage;