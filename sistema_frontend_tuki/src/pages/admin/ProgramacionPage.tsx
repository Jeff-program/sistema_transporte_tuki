import React, { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import MainLayout from '../../layouts/MainLayout';
import { 
    Calendar, Clock, Ship, Map, Save, Ban, CheckCircle, Loader, AlertTriangle, 
    Search, ChevronLeft, ChevronRight, Plus, List, AlertCircle, X,
    ArrowRightLeft
} from 'lucide-react';
import { getViajes, saveViaje, cancelarViaje, getRutasActivas, getEmbarcacionesOperativas } from '../../services/configService';
import { notificarExito, notificarError, confirmarAccion, notificarCarga, cerrarNotificacion } from '../../services/feedbackService';

const ProgramacionPage = () => {
    const { register, handleSubmit, reset, watch, setValue, formState: { isSubmitting, errors } } = useForm({
        defaultValues: {
            idRuta: '',
            idEmbarcacion: '',
            fechaSalida: '',
            inputHora: '08',
            inputMinuto: '00',
            inputAmPm: 'AM',
            programarRetorno: false,
            fechaRetorno: '',
            horaRetorno: '14',
            minutoRetorno: '00',
            amPmRetorno: 'PM'
        }
    });

    const [viajes, setViajes] = useState<any[]>([]);
    const [rutas, setRutas] = useState<any[]>([]);
    const [naves, setNaves] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [busqueda, setBusqueda] = useState('');

    const [isModalOpen, setIsModalOpen] = useState(false);

    const [currentPage, setCurrentPage] = useState(1);
    const [itemsPerPage, setItemsPerPage] = useState(10);

    const fechaActual = new Date();
    fechaActual.setMinutes(fechaActual.getMinutes() - fechaActual.getTimezoneOffset());
    const fechaHoy = fechaActual.toISOString().split('T')[0];

    const programarRetornoWatch = watch('programarRetorno');
    const idRutaWatch = watch('idRuta');
    const fechaSalidaWatch = watch('fechaSalida');
    
    const [rutaInversa, setRutaInversa] = useState<any>(null);

    useEffect(() => {
        const handleResize = () => setItemsPerPage(window.innerWidth < 1024 ? 5 : 6);
        window.addEventListener('resize', handleResize);
        handleResize();
        return () => window.removeEventListener('resize', handleResize);
    }, []);

    const cargarDatos = async () => {
        setLoading(true);
        try {
            const [viajesData, rutasData, navesData] = await Promise.all([
                getViajes(), getRutasActivas(), getEmbarcacionesOperativas()
            ]);
            setViajes(viajesData);
            setRutas(rutasData);
            setNaves(navesData);
        } catch (e) {
            notificarError('Error cargando la programación');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => { cargarDatos(); }, []);
    useEffect(() => { setCurrentPage(1); }, [busqueda]);

    useEffect(() => {
        if (idRutaWatch) {
            const rutaIda = rutas.find(r => String(r.idRuta) === String(idRutaWatch));
            if (rutaIda && rutaIda.origen && rutaIda.destino) {
                const inversa = rutas.find(r => 
                    r.origen.idPuerto === rutaIda.destino.idPuerto && 
                    r.destino.idPuerto === rutaIda.origen.idPuerto &&
                    r.estado === 'ACTIVO'
                );
                setRutaInversa(inversa || null);
                
                if (!inversa) {
                    setValue('programarRetorno', false);
                }
            }
        } else {
            setRutaInversa(null);
            setValue('programarRetorno', false);
        }
    }, [idRutaWatch, rutas, setValue]);

    const abrirModalNuevo = () => {
        reset();
        setIsModalOpen(true);
    };

    const handleCerrarModal = () => {
        setIsModalOpen(false);
        reset();
    };

    const onError = (errors: any) => {
        notificarError('Verifique los campos requeridos.');
    };

    const onSubmit = async (data: any) => {
        const toastId = notificarCarga('Programando viaje(s)...');
        try {
            let hInt = parseInt(data.inputHora, 10);
            if (data.inputAmPm === 'PM' && hInt < 12) hInt += 12;
            if (data.inputAmPm === 'AM' && hInt === 12) hInt = 0;
            const horaMilitarIda = `${hInt.toString().padStart(2, '0')}:${data.inputMinuto}:00`;

            const payloadIda = {
                ruta: { idRuta: parseInt(data.idRuta) },
                embarcacion: { idEmbarcacion: parseInt(data.idEmbarcacion) },
                fechaSalida: data.fechaSalida,
                horaZarpe: horaMilitarIda,
                estado: 'PROGRAMADO'
            };

            await saveViaje(payloadIda as any);

            if (data.programarRetorno && rutaInversa) {
                let hRetInt = parseInt(data.horaRetorno, 10);
                if (data.amPmRetorno === 'PM' && hRetInt < 12) hRetInt += 12;
                if (data.amPmRetorno === 'AM' && hRetInt === 12) hRetInt = 0;
                const horaMilitarRetorno = `${hRetInt.toString().padStart(2, '0')}:${data.minutoRetorno}:00`;

                const fechaSalidaDate = new Date(`${data.fechaSalida}T${horaMilitarIda}`);
                const fechaRetornoDate = new Date(`${data.fechaRetorno}T${horaMilitarRetorno}`);

                if (fechaRetornoDate <= fechaSalidaDate) {
                    cerrarNotificacion(toastId);
                    notificarError('La fecha/hora de retorno debe ser posterior a la salida.');
                    return;
                }

                const payloadRetorno = {
                    ruta: { idRuta: rutaInversa.idRuta },
                    embarcacion: { idEmbarcacion: parseInt(data.idEmbarcacion) },
                    fechaSalida: data.fechaRetorno,
                    horaZarpe: horaMilitarRetorno,
                    estado: 'PROGRAMADO'
                };

                await saveViaje(payloadRetorno as any);
            }

            cerrarNotificacion(toastId);
            notificarExito(data.programarRetorno ? 'Viajes de Ida y Vuelta programados' : 'Viaje programado correctamente');
            handleCerrarModal();
            cargarDatos();
        } catch (e: any) {
            cerrarNotificacion(toastId);
            const msj = e.response?.data?.mensaje || e.response?.data || 'Error al programar';
            notificarError(msj);
        }
    };

    const handleCancelarViaje = async (id: number) => {
        const confirmado = await confirmarAccion(
            "¿Cancelar este viaje?",
            "El viaje pasará a estado cancelado. Los boletos vendidos deberán ser devueltos o reprogramados manualmente.",
            "Sí, cancelar viaje",
            "danger"
        );

        if (!confirmado) return;

        try {
            await cancelarViaje(id);
            notificarExito('Viaje cancelado correctamente');
            cargarDatos();
        } catch (e) {
            notificarError('Error al cancelar el viaje');
        }
    };

    const getEstadoBadge = (estado: string) => {
        switch (estado) {
            case 'PROGRAMADO': return <span className="bg-blue-100 text-blue-700 border-blue-200 border px-3 py-1 rounded-full text-[10px] font-bold flex items-center justify-center gap-1 w-fit mx-auto"><Clock size={12}/> Programado</span>;
            case 'FINALIZADO': return <span className="bg-green-100 text-green-700 border-green-200 border px-3 py-1 rounded-full text-[10px] font-bold flex items-center justify-center gap-1 w-fit mx-auto"><CheckCircle size={12}/> Zarpo</span>;
            case 'CANCELADO': return <span className="bg-red-100 text-red-700 border-red-200 border px-3 py-1 rounded-full text-[10px] font-bold flex items-center justify-center gap-1 w-fit mx-auto"><Ban size={12}/> Cancelado</span>;
            default: return <span className="bg-gray-100 text-gray-700 border px-3 py-1 rounded-full text-[10px] font-bold w-fit mx-auto">{estado}</span>;
        }
    };

    const formatearHora12 = (hora24: string) => {
        if (!hora24) return '';
        const [h, m] = hora24.split(':');
        let hInt = parseInt(h, 10);
        const ampm = hInt >= 12 ? 'PM' : 'AM';
        hInt = hInt % 12 || 12;
        return `${hInt.toString().padStart(2, '0')}:${m} ${ampm}`;
    };

    const formatearFecha = (fecha: string) => {
        if (!fecha) return '';
        const [y, m, d] = fecha.split('-');
        return `${d}/${m}/${y}`;
    };

    const viajesFiltrados = viajes.filter(v => 
        v.nombreRuta?.toLowerCase().includes(busqueda.toLowerCase()) || 
        v.nombreEmbarcacion?.toLowerCase().includes(busqueda.toLowerCase()) ||
        formatearFecha(v.fechaSalida).includes(busqueda)
    );

    const rutasDisponibles = rutas.filter(r => 
        r.estado === 'ACTIVO' && 
        r.origen?.rio?.estado !== 'INACTIVO'
    );

    const indexOfLastItem = currentPage * itemsPerPage;
    const indexOfFirstItem = indexOfLastItem - itemsPerPage;
    const currentItems = viajesFiltrados.slice(indexOfFirstItem, indexOfLastItem);
    const totalPages = Math.ceil(viajesFiltrados.length / itemsPerPage);
    const paginate = (pageNumber: number) => setCurrentPage(pageNumber);

    return (
        <MainLayout>
            <div className="max-w-7xl mx-auto pb-3 relative">
                
                {/* HEADER CON BOTÓN */}
                <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 mb-8 flex flex-col md:flex-row md:items-center justify-between gap-4 animate-in slide-in-from-top-4">
                    <div className="flex items-center gap-4">
                        <div className="p-3 bg-blue-50 rounded-xl text-[#1ABB9C]"><Calendar size={28} /></div>
                        <div>
                            <h1 className="text-2xl font-bold text-[#2A3F54]">Programación Operativa</h1>
                            <p className="text-sm text-gray-400 mt-1">Asigna embarcaciones a rutas en fechas específicas.</p>
                        </div>
                    </div>
                    
                    <div className="flex flex-col sm:flex-row items-center gap-3 w-full md:w-auto">
                        <div className="relative group w-full sm:w-72">
                            <Search className="absolute left-3 top-3 text-gray-400" size={18} />
                            <input 
                                type="text" 
                                placeholder="Buscar por ruta, nave o fecha..." 
                                value={busqueda} 
                                onChange={(e) => setBusqueda(e.target.value)} 
                                className="pl-10 pr-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm w-full focus:outline-none focus:border-[#1ABB9C] transition-colors"
                            />
                        </div>
                        <button 
                            onClick={abrirModalNuevo}
                            className="w-full sm:w-auto flex items-center justify-center gap-2 bg-[#2A3F54] hover:bg-[#1f2f3f] text-white px-5 py-2.5 rounded-xl font-bold text-sm shadow-md transition-transform hover:scale-105 active:scale-95"
                        >
                            <Plus size={18} /> Programar Viaje
                        </button>
                    </div>
                </div>

                {/* TABLA DE VIAJES */}
                <div className="bg-white rounded-2xl shadow-xl border border-gray-100 overflow-hidden flex flex-col max-h-[calc(100vh-220px)] h-fit animate-in fade-in duration-500">
                    <div className="bg-[#2A3F54] border-b border-gray-100 px-6 py-4 flex justify-between items-center shrink-0">
                        <h3 className="font-bold text-white flex items-center gap-2">
                            <div className="bg-white p-1.5 rounded-md shadow-sm text-[#1ABB9C]">
                                <List size={14} /> 
                            </div>
                            Próximas Salidas <span className="text-white text-xs font-normal">({viajesFiltrados.length})</span>
                        </h3>
                    </div>

                    {loading ? (
                        <div className="flex-1 flex justify-center items-center p-12">
                            <Loader className="animate-spin text-[#1ABB9C]" size={40}/>
                        </div>
                    ) : viajesFiltrados.length === 0 ? (
                        <div className="flex-1 flex flex-col items-center justify-center text-center p-12">
                            <div className="bg-gray-50 p-6 rounded-full mb-4 border border-gray-100">
                                <AlertTriangle size={48} className="text-gray-300" />
                            </div>
                            <h4 className="text-gray-600 font-bold text-lg">No hay salidas programadas</h4>
                            <p className="text-gray-400 text-sm mt-1 max-w-xs">Haz clic en "Programar Viaje" para aperturar la venta de boletos.</p>
                        </div>
                    ) : (
                        <div className="overflow-auto flex-1 custom-scrollbar">
                            <table className="w-full text-sm text-left whitespace-nowrap">
                                <thead className="bg-gray-50/80 text-gray-500 font-bold uppercase text-[10px] tracking-wider border-b border-gray-100 sticky top-0 z-10 backdrop-blur-md">
                                    <tr>
                                        <th className="px-4 py-4 w-10 text-center text-[#1ABB9C]">N°</th>
                                        <th className="px-6 py-4">Fecha / Hora</th>
                                        <th className="px-6 py-4 min-w-[200px]">Ruta Comercial</th>
                                        <th className="px-6 py-4">Embarcación Asignada</th>
                                        <th className="px-6 py-4 text-center">Disponibilidad</th>
                                        <th className="px-6 py-4 text-center">Estado</th>
                                        <th className="px-6 py-4 text-center">Acciones</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-50">
                                    {currentItems.map((v, index) => {
                                        const estadoCalculado = v.estado;
                                        const esCancelable = estadoCalculado === 'PROGRAMADO';

                                        return (
                                            <tr key={v.idViaje} className={`hover:bg-blue-300/15 transition-colors group ${!esCancelable ? 'opacity-60 bg-gray-50' : ''}`}>
                                                <td className="px-4 py-4 text-center font-bold text-gray-400 text-xs">{(currentPage - 1) * itemsPerPage + index + 1}</td>
                                                <td className="px-6 py-4">
                                                    <div className="font-bold text-[#2A3F54] flex items-center gap-2 group-hover:text-blue-600 transition-colors">
                                                        <Calendar size={14} className="text-[#1ABB9C]"/> {formatearFecha(v.fechaSalida)}
                                                    </div>
                                                    <div className="text-xs text-gray-500 pl-6 flex items-center gap-1 font-mono mt-1"><Clock size={10}/> {formatearHora12(v.horaZarpe)}</div>
                                                </td>
                                                <td className="px-6 py-4">
                                                    <span className="font-bold text-[#2A3F54] text-xs uppercase tracking-wide bg-blue-50 px-2 py-1 rounded text-blue-700 border border-blue-100">
                                                        {v.nombreRuta}
                                                    </span>
                                                </td>
                                                <td className="px-6 py-4 text-gray-600 text-xs font-medium"><div className="flex items-center gap-2"><Ship size={14} className="text-gray-400"/>{v.nombreEmbarcacion}</div></td>
                                                
                                                <td className="px-6 py-4 text-center">
                                                    <div className="flex items-end justify-center gap-1">
                                                        <span className={`text-lg font-black ${v.cuposDisponibles <= 5 ? 'text-red-500' : 'text-[#1ABB9C]'}`}>
                                                            {v.cuposDisponibles}
                                                        </span>
                                                        <span className="text-[10px] text-gray-400 mb-0.5 font-bold">/ {v.capacidadTotal}</span>
                                                    </div>
                                                </td>

                                                <td className="px-6 py-4 text-center">
                                                    {getEstadoBadge(estadoCalculado)}
                                                </td>

                                                <td className="px-6 py-4 text-center">
                                                    <div className="flex justify-center">
                                                        {esCancelable ? (
                                                            <button onClick={() => handleCancelarViaje(v.idViaje)} className="flex items-center gap-1.5 px-3 py-1.5 text-gray-500 hover:text-red-600 hover:bg-red-50 hover:border-red-100 bg-white border border-gray-200 rounded-lg transition-all text-xs font-bold shadow-sm" title="Cancelar este viaje">
                                                                <Ban size={14} className="text-red-400"/> Cancelar
                                                            </button>
                                                        ) : (
                                                            <span className="text-gray-300 text-[10px] italic">Cerrado</span>
                                                        )}
                                                    </div>
                                                </td>
                                            </tr>
                                        );
                                    })}
                                </tbody>
                            </table>
                        </div>
                    )}

                    <div className="border-t border-gray-100 p-4 bg-gray-50/80 flex justify-between items-center shrink-0">
                         <span className="text-xs text-gray-500 font-medium bg-white px-3 py-1 rounded-full border border-gray-200 shadow-sm">
                            Mostrando <span className="text-[#2A3F54] font-bold"> {viajesFiltrados.length > 0 ? indexOfFirstItem + 1 : 0}-{Math.min(indexOfLastItem, viajesFiltrados.length)}</span> de {viajesFiltrados.length}
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

                {/* MODAL DE PROGRAMACIÓN DE VIAJES */}
                {isModalOpen && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4 animate-in fade-in duration-200">
                        <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg flex flex-col overflow-hidden animate-in zoom-in-95 duration-200 max-h-[90vh]">
                            
                            <div className="p-5 flex justify-between items-center shrink-0 bg-gradient-to-r from-[#2A3F54] to-[#3E5367]">
                                <h3 className="font-bold text-white text-lg flex items-center gap-2">
                                    <Plus size={20} className="text-[#1ABB9C]"/> Nuevo Viaje
                                </h3>
                                <button onClick={handleCerrarModal} className="text-white/70 hover:text-white bg-white/10 hover:bg-white/20 p-1 rounded-lg transition-colors">
                                    <X size={20} />
                                </button>
                            </div>

                            <div className="overflow-y-auto p-6 flex-1 custom-scrollbar">
                                <form id="formViaje" onSubmit={handleSubmit(onSubmit, onError)} className="space-y-6">
                                    
                                    {/* SECCIÓN 1: DATOS DE IDA */}
                                    <div className="space-y-4">
                                        <div className="flex items-center gap-2 border-b border-gray-100 pb-2">
                                            <div className="w-6 h-6 rounded-full bg-blue-100 text-blue-600 font-bold flex items-center justify-center text-xs">1</div>
                                            <h4 className="font-bold text-gray-700">Detalles de la Ida</h4>
                                        </div>

                                        <div className="group">
                                            <label className="text-xs font-bold text-gray-500 uppercase mb-1.5 flex items-center gap-1"><Map size={12}/> Ruta Comercial</label>
                                            <select {...register('idRuta', {required: 'Seleccione una ruta'})} className="w-full bg-gray-50 border border-gray-200 p-3 rounded-xl text-sm outline-none focus:border-[#1ABB9C] focus:bg-white transition-colors cursor-pointer">
                                                <option value="">Seleccionar ruta...</option>
                                                {rutasDisponibles.map(r => (
                                                    <option key={r.idRuta} value={r.idRuta}>
                                                        {r.nombreRuta} {r.origen?.rio ? `— ${r.origen.rio.nombreRio}` : ''}
                                                    </option>
                                                ))}
                                            </select>
                                            {errors.idRuta && <span className="text-red-500 text-xs flex items-center gap-1 mt-1"><AlertCircle size={10}/> {String(errors.idRuta.message)}</span>}
                                        </div>
                                        
                                        <div className="group">
                                            <label className="text-xs font-bold text-gray-500 uppercase mb-1.5 flex items-center gap-1"><Ship size={12}/> Embarcación Asignada</label>
                                            <select {...register('idEmbarcacion', {required: 'Seleccione una embarcación'})} className="w-full bg-gray-50 border border-gray-200 p-3 rounded-xl text-sm outline-none focus:border-[#1ABB9C] focus:bg-white transition-colors cursor-pointer">
                                                <option value="">Seleccionar nave...</option>
                                                {naves.map(n => <option key={n.idEmbarcacion} value={n.idEmbarcacion}>{n.nombre} ({n.capacidad} pasajeros)</option>)}
                                            </select>
                                            {errors.idEmbarcacion && <span className="text-red-500 text-xs flex items-center gap-1 mt-1"><AlertCircle size={10}/> {String(errors.idEmbarcacion.message)}</span>}
                                        </div>

                                        <div className="grid grid-cols-2 gap-4">
                                            <div className="group">
                                                <label className="text-xs font-bold text-gray-500 uppercase mb-1.5 flex items-center gap-1"><Calendar size={12}/> Fecha de Zarpe</label>
                                                <input type="date" min={fechaHoy} {...register('fechaSalida', {required: 'Seleccione una fecha'})} className="w-full bg-gray-50 border border-gray-200 p-3 rounded-xl text-sm outline-none focus:border-[#1ABB9C] focus:bg-white transition-colors cursor-pointer" />
                                                {errors.fechaSalida && <span className="text-red-500 text-xs flex items-center gap-1 mt-1"><AlertCircle size={10}/> {String(errors.fechaSalida.message)}</span>}
                                            </div>
                                            
                                            <div className="group">
                                                <label className="text-xs font-bold text-gray-500 uppercase mb-1.5 flex items-center gap-1"><Clock size={12}/> Hora de Zarpe</label>
                                                <div className="flex items-center gap-1 bg-gray-50 border border-gray-200 p-2 rounded-xl focus-within:border-[#1ABB9C] focus-within:bg-white transition-colors">
                                                    <select {...register('inputHora')} className="w-full bg-transparent text-sm font-bold text-gray-700 outline-none text-center appearance-none cursor-pointer">
                                                        {Array.from({length: 12}, (_, i) => i + 1).map(h => <option key={h} value={h.toString().padStart(2, '0')}>{h.toString().padStart(2, '0')}</option>)}
                                                    </select>
                                                    <span className="font-bold text-gray-400">:</span>
                                                    <select {...register('inputMinuto')} className="w-full bg-transparent text-sm font-bold text-gray-700 outline-none text-center appearance-none cursor-pointer">
                                                        {['00', '05', '10', '15', '20', '25', '30', '35', '40', '45', '50', '55'].map(m => <option key={m} value={m}>{m}</option>)}
                                                    </select>
                                                    <select {...register('inputAmPm')} className="w-full bg-blue-50 text-blue-700 border-none text-xs font-bold rounded p-1 outline-none text-center ml-2 cursor-pointer">
                                                        <option value="AM">AM</option>
                                                        <option value="PM">PM</option>
                                                    </select>
                                                </div>
                                            </div>
                                        </div>
                                    </div>

                                    {/* SECCIÓN 2: DATOS DE VUELTA */}
                                    <div className="mt-4">
                                        <div className={`p-4 rounded-xl border transition-all duration-300 ${programarRetornoWatch ? 'bg-indigo-50/50 border-indigo-200' : 'bg-gray-50 border-gray-200'}`}>
                                            
                                            <div className="flex items-center justify-between">
                                                <div>
                                                    <label htmlFor="programarRetorno" className={`text-sm font-bold flex items-center gap-2 cursor-pointer ${programarRetornoWatch ? 'text-indigo-700' : 'text-gray-600'}`}>
                                                        <ArrowRightLeft size={16} className={programarRetornoWatch ? 'text-indigo-500' : 'text-gray-400'} /> 
                                                        Programar Viaje de Retorno
                                                    </label>
                                                    <p className="text-[10px] text-gray-500 mt-1 max-w-[280px]">
                                                        {rutaInversa 
                                                            ? `Ruta detectada: ${rutaInversa.nombreRuta}` 
                                                            : idRutaWatch ? 'No existe una ruta inversa configurada en el sistema.' : 'Seleccione una ruta de ida primero.'}
                                                    </p>
                                                </div>
                                                
                                                {/* Switch */}
                                                <div className={`relative inline-block w-10 h-6 ${!rutaInversa ? 'opacity-50 cursor-not-allowed' : ''}`}>
                                                    <input 
                                                        type="checkbox" 
                                                        id="programarRetorno" 
                                                        disabled={!rutaInversa}
                                                        {...register('programarRetorno')}
                                                        className="opacity-0 w-0 h-0 absolute"
                                                    />
                                                    <label htmlFor="programarRetorno" className={`absolute inset-0 rounded-full transition-colors duration-300 before:absolute before:content-[''] before:h-4 before:w-4 before:left-1 before:bottom-1 before:bg-white before:rounded-full before:transition-transform before:duration-300 ${!rutaInversa ? 'bg-gray-200 cursor-not-allowed' : programarRetornoWatch ? 'bg-indigo-500 before:translate-x-4 cursor-pointer' : 'bg-gray-300 cursor-pointer'}`}>
                                                    </label>
                                                </div>
                                            </div>

                                            {/* Campos de Retorno Desplegables */}
                                            {programarRetornoWatch && rutaInversa && (
                                                <div className="grid grid-cols-2 gap-4 mt-4 pt-4 border-t border-indigo-100 animate-in fade-in slide-in-from-top-2">
                                                    <div className="group">
                                                        <label className="text-[10px] font-bold text-indigo-800 uppercase mb-1.5 flex items-center gap-1">Fecha de Regreso</label>
                                                        <input 
                                                            type="date" 
                                                            min={fechaSalidaWatch || fechaHoy} 
                                                            {...register('fechaRetorno', {required: programarRetornoWatch})} 
                                                            className="w-full bg-white border border-indigo-200 p-2.5 rounded-xl text-xs outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100 transition-colors cursor-pointer text-indigo-900 font-medium" 
                                                        />
                                                    </div>
                                                    
                                                    <div className="group">
                                                        <label className="text-[10px] font-bold text-indigo-800 uppercase mb-1.5 flex items-center gap-1">Hora de Regreso</label>
                                                        <div className="flex items-center gap-1 bg-white border border-indigo-200 p-1.5 rounded-xl focus-within:border-indigo-400 focus-within:ring-2 focus-within:ring-indigo-100 transition-colors">
                                                            <select {...register('horaRetorno')} className="w-full bg-transparent text-xs font-bold text-indigo-900 outline-none text-center appearance-none cursor-pointer">
                                                                {Array.from({length: 12}, (_, i) => i + 1).map(h => <option key={h} value={h.toString().padStart(2, '0')}>{h.toString().padStart(2, '0')}</option>)}
                                                            </select>
                                                            <span className="font-bold text-indigo-300">:</span>
                                                            <select {...register('minutoRetorno')} className="w-full bg-transparent text-xs font-bold text-indigo-900 outline-none text-center appearance-none cursor-pointer">
                                                                {['00', '05', '10', '15', '20', '25', '30', '35', '40', '45', '50', '55'].map(m => <option key={m} value={m}>{m}</option>)}
                                                            </select>
                                                            <select {...register('amPmRetorno')} className="w-full bg-indigo-50 text-indigo-700 border-none text-[10px] font-bold rounded p-1 outline-none text-center ml-1 cursor-pointer">
                                                                <option value="AM">AM</option>
                                                                <option value="PM">PM</option>
                                                            </select>
                                                        </div>
                                                    </div>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                </form>
                            </div>

                            <div className="p-5 border-t border-gray-100 bg-gray-50 flex items-center gap-3 shrink-0">
                                <button type="button" onClick={handleCerrarModal} className="w-1/3 bg-white border border-gray-200 text-gray-600 py-2.5 rounded-xl text-sm font-bold hover:bg-gray-100 transition-colors">
                                    Cancelar
                                </button>
                                <button type="submit" form="formViaje" disabled={isSubmitting} className="w-2/3 text-white py-2.5 rounded-xl text-sm font-bold transition-all shadow-md hover:shadow-lg flex justify-center items-center gap-2 bg-[#2A3F54] hover:bg-[#1f2f3f]">
                                    {isSubmitting ? <Loader className="animate-spin" size={18}/> : <Save size={18}/>} 
                                    {programarRetornoWatch ? 'Programar Ida y Vuelta' : 'Programar Salida'}
                                </button>
                            </div>

                        </div>
                    </div>
                )}
            </div>
        </MainLayout>
    );
};

export default ProgramacionPage;