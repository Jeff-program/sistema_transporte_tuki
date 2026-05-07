import React, { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { yupResolver } from '@hookform/resolvers/yup';
import * as yup from 'yup';
import MainLayout from '../../../layouts/MainLayout';
import { 
    Anchor, Search, Plus, Edit, Save, XCircle, MapPin, 
    Loader, ChevronLeft, ChevronRight, List, Trash2, 
    ToggleLeft, ToggleRight, Map, AlertCircle, Waves, Star, X
} from 'lucide-react';
import { getPuertos, savePuerto, deletePuerto, toggleEstadoPuerto, getRiosActivos } from '../../../services/configService';
import { notificarExito, notificarError, confirmarAccion, notificarCarga, cerrarNotificacion } from '../../../services/feedbackService';

const puertoSchema = yup.object({
  idPuerto: yup.number().nullable().transform((value, originalValue) => originalValue === '' ? null : value),
  nombrePuerto: yup.string().required('Nombre obligatorio.').min(3, 'Mínimo 3 letras.'),
  ciudad: yup.string().required('Ciudad obligatoria.').min(3, 'Mínimo 3 letras.').matches(/^[A-Za-zÑñÁáÉéÍíÓóÚúÜü\s]+$/, 'La ciudad solo debe contener letras.'),
  direccion: yup.string().nullable().transform((v, o) => o === '' ? null : v).matches(/^[A-Za-z0-9ÑñÁáÉéÍíÓóÚúÜü/()\s.,#-]+$/, { message: 'Caracteres no permitidos', excludeEmptyString: true }),
  estado: yup.string().default('ACTIVO'),
  idRio: yup.number().typeError('Debe seleccionar un río').required('Seleccione un río'),
  esPrincipal: yup.boolean().default(false)
});

interface PuertoForm {
    idPuerto: number | null;
    nombrePuerto: string;
    ciudad: string;
    direccion: string | null;
    estado: string;
    idRio: number;
    esPrincipal: boolean;
}

const PuertosPage = () => {
  const { register, handleSubmit, reset, setValue, watch, formState: { isSubmitting, errors } } = useForm<PuertoForm>({
      resolver: yupResolver(puertoSchema) as any,
      defaultValues: { idPuerto: null, nombrePuerto: '', ciudad: '', direccion: '', estado: 'ACTIVO', idRio: undefined, esPrincipal: false }
  });

  const [puertos, setPuertos] = useState<any[]>([]);
  const [rios, setRios] = useState<any[]>([]); 
  const [loading, setLoading] = useState(true);
  const [busqueda, setBusqueda] = useState('');
  
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editando, setEditando] = useState(false);

  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);

  const esPrincipalWatch = watch('esPrincipal');

  useEffect(() => {
    const handleResize = () => setItemsPerPage(window.innerWidth < 1024 ? 4 : 6);
    window.addEventListener('resize', handleResize);
    handleResize();
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const cargarDatos = async () => {
    setLoading(true);
    try {
        const [puertosData, riosData] = await Promise.all([getPuertos(), getRiosActivos()]);
        
        if (Array.isArray(puertosData)) {
            puertosData.sort((a: any, b: any) => b.idPuerto - a.idPuerto);
        }
        setPuertos(puertosData);
        setRios(riosData);
    } catch (e) {
        notificarError('Error conectando al servidor');
    } finally {
        setLoading(false);
    }
  };

  useEffect(() => { cargarDatos(); }, []);
  useEffect(() => { setCurrentPage(1); }, [busqueda]);

  const abrirModalNuevo = () => {
      reset({ idPuerto: null, nombrePuerto: '', ciudad: '', direccion: '', estado: 'ACTIVO', idRio: undefined, esPrincipal: false });
      setEditando(false);
      setIsModalOpen(true);
  };

  const handleCerrarModal = () => {
      setIsModalOpen(false);
      setEditando(false);
      reset();
  };

  const onSubmit = async (data: PuertoForm) => {
    const toastId = notificarCarga('Guardando puerto...');
    try {
        const payload: any = { 
            ...data, 
            estado: data.estado || 'ACTIVO',
            rio: { idRio: data.idRio } 
        };
        
        if (!payload.idPuerto) delete payload.idPuerto;
        delete payload.idRio; 

        await savePuerto(payload);
        cerrarNotificacion(toastId);
        notificarExito(editando ? 'Puerto actualizado' : 'Puerto registrado');
        
        handleCerrarModal();
        cargarDatos();
    } catch (error: any) {
        cerrarNotificacion(toastId);
        const mensajeReal = error.response?.data?.mensaje || error.response?.data || "Error al guardar el puerto.";
        notificarError(mensajeReal);
    }
  };

  const onError = (errors: any) => {
      notificarError('Verifique los campos requeridos.');
  };

  const editar = (p: any) => {
      setValue('idPuerto', p.idPuerto);
      setValue('nombrePuerto', p.nombrePuerto);
      setValue('ciudad', p.ciudad);
      setValue('direccion', p.direccion || '');
      setValue('estado', p.estado);
      setValue('idRio', p.rio?.idRio || '');
      setValue('esPrincipal', p.esPrincipal || false);
      
      setEditando(true);
      setIsModalOpen(true);
  };

  const cambiarEstado = async (p: any) => {
      try {
          setPuertos(prev => prev.map(puerto => 
              puerto.idPuerto === p.idPuerto 
                  ? { ...puerto, estado: p.estado === 'ACTIVO' ? 'INACTIVO' : 'ACTIVO' } 
                  : puerto
          ));
          await toggleEstadoPuerto(p.idPuerto);
          const nuevoEstado = p.estado === 'ACTIVO' ? 'desactivado' : 'activado';
          notificarExito(`Puerto ${nuevoEstado} correctamente`);
      } catch (e) { 
          notificarError('Error al cambiar estado');
          cargarDatos();
      }
  };

  const handleEliminar = async (id: number) => {
    const confirmado = await confirmarAccion(
        "¿Dar de baja puerto?",
        "El puerto pasará a estado 'ELIMINADO' y no podrá ser utilizado en nuevas rutas.",
        "Sí, dar de baja",
        "danger"
    );

    if (!confirmado) return;

    try {
        await deletePuerto(id);
        notificarExito('Puerto dado de baja correctamente');
        if (editando) handleCerrarModal();
        cargarDatos();
    } catch (e) {
        notificarError('No se pudo eliminar el puerto.');
    }
  };

  const puertosFiltrados = puertos.filter(p => 
      p.nombrePuerto.toLowerCase().includes(busqueda.toLowerCase()) || 
      p.ciudad.toLowerCase().includes(busqueda.toLowerCase()) ||
      (p.rio?.nombreRio || '').toLowerCase().includes(busqueda.toLowerCase())
  );
  
  const indexOfLastItem = currentPage * itemsPerPage;
  const indexOfFirstItem = indexOfLastItem - itemsPerPage;
  const currentItems = puertosFiltrados.slice(indexOfFirstItem, indexOfLastItem);
  const totalPages = Math.ceil(puertosFiltrados.length / itemsPerPage);
  const paginate = (pageNumber: number) => setCurrentPage(pageNumber);

  return (
    <MainLayout>
      <div className="max-w-7xl mx-auto pb-3 relative">
        
        {/* HEADER CON BOTÓN DE NUEVO PUERTO */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 mb-8 flex flex-col md:flex-row md:items-center justify-between gap-4 animate-in slide-in-from-top-4">
            <div className="flex items-center gap-4">
                <div className="p-3 bg-blue-50 rounded-xl text-[#1ABB9C]"><Anchor size={28} /></div>
                <div>
                    <h1 className="text-2xl font-bold text-[#2A3F54]">Gestión de Puertos</h1>
                    <p className="text-sm text-gray-400 mt-1">Administra los lugares de zarpe, llegada y sus cuencas.</p>
                </div>
            </div>
            <div className="flex flex-col sm:flex-row items-center gap-3 w-full md:w-auto">
                <div className="relative group w-full sm:w-72">
                    <Search className="absolute left-3 top-3 text-gray-400" size={18} />
                    <input 
                        type="text" 
                        placeholder="Buscar puerto, ciudad o río..." 
                        value={busqueda} 
                        onChange={(e) => setBusqueda(e.target.value)} 
                        className="pl-10 pr-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm w-full focus:outline-none focus:border-[#1ABB9C] transition-colors"
                    />
                </div>
                <button 
                    onClick={abrirModalNuevo}
                    className="w-full sm:w-auto flex items-center justify-center gap-2 bg-[#2A3F54] hover:bg-[#1f2f3f] text-white px-5 py-2.5 rounded-xl font-bold text-sm shadow-md transition-transform hover:scale-105 active:scale-95"
                >
                    <Plus size={18} /> Nuevo Puerto
                </button>
            </div>
        </div>

        {/* TABLA DE PUERTOS */}
        <div className="bg-white rounded-2xl shadow-xl border border-gray-100 overflow-hidden flex flex-col max-h-[calc(100vh-220px)] h-fit animate-in fade-in duration-500">
            <div className="bg-[#2A3F54] border-b border-gray-100 px-6 py-4 flex flex-wrap justify-between items-center shrink-0">
                <h3 className="font-bold text-white flex items-center gap-2">
                    <div className="bg-white p-1.5 rounded-md shadow-sm text-[#1ABB9C]">
                        <List size={14} />
                    </div>
                    Listado de Puertos <span className="text-white text-xs font-normal">({puertosFiltrados.length} encontrados)</span>
                </h3>
            </div>

            {loading ? (
                <div className="flex-1 flex justify-center items-center p-12">
                    <Loader className="animate-spin text-[#1ABB9C]" size={40}/>
                </div>
            ) : puertosFiltrados.length === 0 ? (
                <div className="flex-1 flex flex-col items-center justify-center text-center p-12">
                    <div className="bg-gray-50 p-6 rounded-full mb-4 border border-gray-100">
                        <Anchor size={48} className="text-gray-300" />
                    </div>
                    <h4 className="text-gray-600 font-bold text-lg">No se encontraron puertos</h4>
                    <p className="text-gray-400 text-sm mt-1 max-w-xs">Intenta con otro término de búsqueda o registra el primer puerto.</p>
                </div>
            ) : (
                <div className="overflow-auto flex-1 custom-scrollbar">
                    <table className="w-full text-sm text-left whitespace-nowrap">
                        <thead className="bg-gray-50/80 text-gray-500 font-bold uppercase text-[10px] tracking-wider border-b border-gray-100 sticky top-0 z-10 backdrop-blur-md">
                            <tr>
                                <th className="px-4 py-4 w-12 text-[12px] text-center text-[#1ABB9C]">N°</th>
                                <th className="px-6 py-4 min-w-[200px]">Puerto y Dirección</th>
                                <th className="px-6 py-4 min-w-[180px]">Ubicación (Ciudad / Río)</th>
                                <th className="px-6 py-4 text-center">Tipo</th> 
                                <th className="px-6 py-4 text-center">Estado</th>
                                <th className="px-6 py-4 text-center">Acciones</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-50">
                            {currentItems.map((p, index) => (
                                <tr 
                                    key={p.idPuerto} 
                                    className={`group transition-colors duration-200 ${p.estado === 'INACTIVO' ? 'bg-gray-50 opacity-75' : 'hover:bg-blue-50'}`}
                                >
                                    <td className="px-4 py-4 text-center font-bold text-gray-400 text-xs">
                                        {(currentPage - 1) * itemsPerPage + index + 1}
                                    </td>

                                    <td className="px-6 py-4">
                                        <div className="flex items-center gap-3">
                                            <div className={`p-2 rounded-lg transition-colors ${p.estado === 'ACTIVO' ? 'bg-blue-50 text-blue-600' : 'bg-gray-100 text-gray-400'}`}>
                                                <Anchor size={18}/>
                                            </div>
                                            <div>
                                                <p className={`font-bold text-base ${p.estado === 'ACTIVO' ? 'text-[#2A3F54]' : 'text-gray-500 line-through'}`}>{p.nombrePuerto}</p>
                                                {p.direccion && <p className="text-[10px] text-gray-400 mt-0.5 max-w-[150px] truncate"><Map size={10} className="inline mr-1"/>{p.direccion}</p>}
                                            </div>
                                        </div>
                                    </td>
                                    
                                    <td className="px-6 py-4">
                                        <div className="flex flex-col">
                                            <div className="flex items-center gap-1.5 font-bold text-[#2A3F54]">
                                                <MapPin size={14} className="text-gray-400"/> {p.ciudad}
                                            </div>
                                            <div className="flex items-center gap-1 text-[11px] text-blue-600 font-medium mt-1">
                                                <Waves size={12}/> {p.rio?.nombreRio || 'Sin río asignado'}
                                            </div>
                                        </div>
                                    </td>

                                    <td className="px-6 py-4 text-center">
                                        {p.esPrincipal ? (
                                            <span className="inline-flex items-center gap-1 bg-orange-50 text-orange-600 px-2.5 py-1 rounded-lg text-[10px] font-bold border border-orange-200">
                                                <Star size={10} className="fill-orange-500"/> Principal
                                            </span>
                                        ) : (
                                            <span className="text-[10px] text-gray-400 font-medium bg-gray-100 px-2 py-1 rounded-lg">Escala</span>
                                        )}
                                    </td>
                                    
                                    <td className="px-6 py-4 text-center">
                                        <div className="flex items-center justify-center gap-3">
                                            <span className={`px-3 py-1 rounded-full text-[10px] font-bold border ${p.estado === 'ACTIVO' ? 'bg-green-50 text-green-600 border-green-200' : 'bg-gray-100 text-gray-500 border-gray-200'}`}>
                                                {p.estado}
                                            </span>
                                            <button 
                                                onClick={() => cambiarEstado(p)} 
                                                className={`transition-all hover:scale-110 active:scale-95
                                                    ${p.estado === 'ACTIVO' ? 'text-[#1ABB9C] hover:text-green-600' : 'text-gray-400 hover:text-gray-600'}`}
                                                title={p.estado === 'ACTIVO' ? 'Desactivar puerto' : 'Activar puerto'}
                                            >
                                                {p.estado === 'ACTIVO' 
                                                    ? <ToggleRight size={28} strokeWidth={1.5} /> 
                                                    : <ToggleLeft size={28} strokeWidth={1.5} />}
                                            </button>
                                        </div>
                                    </td>

                                    <td className="px-6 py-4 text-center">
                                        <div className="flex items-center justify-center gap-2">
                                            <button 
                                                onClick={() => editar(p)} 
                                                className="inline-flex items-center gap-1 bg-white border border-gray-200 text-gray-500 hover:border-blue-300 hover:bg-blue-50 hover:text-blue-600 px-3 py-2 rounded-lg transition-all text-xs font-bold shadow-sm hover:shadow-md"
                                            >
                                                <Edit size={16} /> Editar
                                            </button>
                                            <button 
                                                onClick={() => handleEliminar(p.idPuerto)} 
                                                className="inline-flex items-center gap-1 bg-white border border-gray-200 text-gray-500 hover:border-red-300 hover:bg-red-50 hover:text-red-600 px-3 py-2 rounded-lg transition-all text-xs font-bold shadow-sm hover:shadow-md"
                                            >
                                                <Trash2 size={16} /> Eliminar
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
                    Mostrando <span className="text-[#2A3F54] font-bold">{puertosFiltrados.length > 0 ? indexOfFirstItem + 1 : 0}-{Math.min(indexOfLastItem, puertosFiltrados.length)}
                    </span> de {puertosFiltrados.length}</span>
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

        {/* 🔥 MODAL DE EDITAR DE PUERTO 🔥 */}
        {isModalOpen && (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4 animate-in fade-in duration-200">
                <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md flex flex-col overflow-hidden animate-in zoom-in-95 duration-200 max-h-[90vh]">
                    
                    {/* Cabecera del Modal */}
                    <div className={`p-5 flex justify-between items-center shrink-0 ${editando ? 'bg-gradient-to-r from-blue-600 to-blue-500' : 'bg-gradient-to-r from-[#2A3F54] to-[#3E5367]'}`}>
                        <h3 className="font-bold text-white text-lg flex items-center gap-2">
                            {editando ? <Edit size={20} className="text-white"/> : <Plus size={20} className="text-[#1ABB9C]"/>} 
                            {editando ? 'Modificar Puerto' : 'Nuevo Puerto'}
                        </h3>
                        <button onClick={handleCerrarModal} className="text-white/70 hover:text-white bg-white/10 hover:bg-white/20 p-1 rounded-lg transition-colors">
                            <X size={20} />
                        </button>
                    </div>

                    {/* Cuerpo del Modal (Formulario Scrollable) */}
                    <div className="overflow-y-auto p-6 flex-1 custom-scrollbar">
                        <form id="formPuerto" onSubmit={handleSubmit(onSubmit, onError)} className="space-y-4">
                            <input type="hidden" {...register('idPuerto')} />
                            <input type="hidden" {...register('estado')} />

                            <div className="group">
                                <label className="text-xs font-bold text-blue-800 uppercase mb-1.5 flex items-center gap-1"><Waves size={12}/> Cuenca / Río</label>
                                <select 
                                    {...register('idRio')} 
                                    className={`w-full bg-blue-50/50 border p-3 rounded-xl text-sm outline-none transition-all font-bold text-blue-900 ${errors.idRio ? 'border-red-300' : 'border-blue-200 focus:border-blue-500 focus:ring-4 focus:ring-blue-100'}`}
                                >
                                    <option value="">-- Seleccione un río --</option>
                                    {rios.map(r => (
                                        <option key={r.idRio} value={r.idRio}>{r.nombreRio}</option>
                                    ))}
                                </select>
                                {errors.idRio && <span className="text-red-500 text-xs flex items-center gap-1 mt-1"><AlertCircle size={10}/> {String(errors.idRio.message)}</span>}
                            </div>

                            <div className="group">
                                <label className="text-xs font-bold text-gray-500 uppercase mb-1.5 flex items-center gap-1"><Anchor size={12}/> Nombre del Puerto</label>
                                <input {...register('nombrePuerto')} 
                                    className={`w-full bg-gray-50 border border-gray-200 p-3 rounded-xl text-sm outline-none focus:border-[#1ABB9C] ${errors.nombrePuerto ? 'border-red-300 bg-red-50' : 'focus:bg-white focus:border-[#1ABB9C] focus:ring-4 focus:ring-green-50'}`} 
                                    placeholder="Ej: Puerto Enapu" />
                                {errors.nombrePuerto && <span className="text-red-500 text-xs flex items-center gap-1 mt-1"><AlertCircle size={10}/> {String(errors.nombrePuerto.message)}</span>}
                            </div>
                            
                            <div className="group">
                                <label className="text-xs font-bold text-gray-500 uppercase mb-1.5 flex items-center gap-1"><MapPin size={12}/> Ciudad</label>
                                <input 
                                    {...register('ciudad')} 
                                    className={`w-full bg-gray-50 border border-gray-200 p-3 rounded-xl text-sm outline-none focus:border-[#1ABB9C] ${errors.ciudad ? 'border-red-300 bg-red-50' : 'focus:bg-white focus:border-[#1ABB9C] focus:ring-4 focus:ring-green-50'}`} 
                                    placeholder="Ej: Iquitos" 
                                    onKeyPress={(e) => {
                                        if (/[0-9]/.test(e.key)) {
                                            e.preventDefault();
                                        }
                                    }}
                                />
                                {errors.ciudad && <span className="text-red-500 text-xs flex items-center gap-1 mt-1"><AlertCircle size={10}/> {String(errors.ciudad.message)}</span>}
                            </div>

                            <div className="group">
                                <label className="text-xs font-bold text-gray-500 uppercase mb-1.5 flex items-center gap-1"><Map size={12}/> Dirección (Opcional)</label>
                                <input 
                                    {...register('direccion')} 
                                    className="w-full bg-gray-50 border border-gray-200 p-3 rounded-xl text-sm outline-none focus:border-[#1ABB9C]" 
                                    placeholder="Ej: Av. La Marina S/N" 
                                />
                                {errors.direccion && <span className="text-red-500 text-xs flex items-center gap-1 mt-1"><AlertCircle size={10}/> {String(errors.direccion.message)}</span>}
                            </div>

                            {/* 🔥 CHECKBOX DE PUERTO PRINCIPAL 🔥 */}
                            <div className={`p-4 rounded-xl border transition-colors mt-2 cursor-pointer flex items-center justify-between ${esPrincipalWatch ? 'bg-orange-50 border-orange-200' : 'bg-gray-50 border-gray-200 hover:bg-gray-100'}`}>
                                <div>
                                    <label htmlFor="esPrincipal" className={`text-sm font-bold flex items-center gap-1.5 cursor-pointer ${esPrincipalWatch ? 'text-orange-700' : 'text-gray-600'}`}>
                                        <Star size={16} className={esPrincipalWatch ? 'text-orange-500 fill-orange-500' : 'text-gray-400'} /> 
                                        Puerto Principal
                                    </label>
                                    <p className="text-[10px] text-gray-500 mt-1 max-w-[200px] leading-tight">
                                        Actívalo si este puerto conecta con múltiples ríos o rutas (Ej. Iquitos).
                                    </p>
                                </div>
                                
                                <div className="relative inline-block w-10 h-6">
                                    <input 
                                        type="checkbox" 
                                        id="esPrincipal" 
                                        {...register('esPrincipal')}
                                        className="opacity-0 w-0 h-0 absolute"
                                    />
                                    <label htmlFor="esPrincipal" className={`absolute cursor-pointer inset-0 rounded-full transition-colors duration-300 before:absolute before:content-[''] before:h-4 before:w-4 before:left-1 before:bottom-1 before:bg-white before:rounded-full before:transition-transform before:duration-300 ${esPrincipalWatch ? 'bg-orange-500 before:translate-x-4' : 'bg-gray-300'}`}>
                                    </label>
                                </div>
                            </div>
                        </form>
                    </div>

                    {/* Footer del Modal con Botones */}
                    <div className="p-5 border-t border-gray-100 bg-gray-50 flex items-center gap-3 shrink-0">
                        <button type="button" onClick={handleCerrarModal} className="w-1/3 bg-white border border-gray-200 text-gray-600 py-2.5 rounded-xl text-sm font-bold hover:bg-gray-100 transition-colors">
                            Cancelar
                        </button>
                        <button type="submit" form="formPuerto" disabled={isSubmitting} className={`w-2/3 text-white py-2.5 rounded-xl text-sm font-bold transition-all shadow-md hover:shadow-lg flex justify-center items-center gap-2 ${editando ? 'bg-blue-600 hover:bg-blue-700' : 'bg-[#1ABB9C] hover:bg-[#16a085]'}`}>
                            {isSubmitting ? <Loader className="animate-spin" size={18}/> : <Save size={18}/>} 
                            {editando ? 'Guardar Cambios' : 'Registrar Puerto'}
                        </button>
                    </div>
                </div>
            </div>
        )}
      </div>
    </MainLayout>
  );
};

export default PuertosPage;