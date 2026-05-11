import React, { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { yupResolver } from '@hookform/resolvers/yup';
import * as yup from 'yup';
import MainLayout from '../../../layouts/MainLayout';
import { 
    Ship, Edit, Wrench, AlertCircle, Save, Loader, Plus, Trash2, 
    XCircle, Search, ChevronLeft, ChevronRight, List, Eye, CheckCircle, 
    CalendarRangeIcon, X,
    Users
} from 'lucide-react';
import { 
    getEmbarcaciones, saveEmbarcacion, toggleMantenimiento, deleteEmbarcacion 
} from '../../../services/configService';
import { 
    notificarExito, notificarError, confirmarAccion, notificarCarga, cerrarNotificacion 
} from '../../../services/feedbackService';

const embarcacionSchema = yup.object({
  idEmbarcacion: yup.number().nullable().transform((v, o) => (o === '' ? null : v)),
  nombre: yup.string().required('El nombre es obligatorio'),
  matricula: yup.string()
      .required('La matrícula es obligatoria')
      .matches(/^[A-Za-z0-9-]+$/, 'Formato inválido. Solo letras, números y guiones.'),
  capacidad: yup.number()
      .transform((value, originalValue) => (String(originalValue).trim() === '' ? undefined : value))
      .required('La capacidad es obligatoria')
      .positive('La capacidad debe ser mayor a cero')
      .integer('Debe ser un número entero sin decimales'),
  estado: yup.string().required()
});

interface EmbarcacionForm {
    idEmbarcacion: number | null;
    nombre: string;
    matricula: string;
    capacidad: number | string; 
    estado: string;
}

interface SeccionVisual {
  id: number;
  tipo: 'ASIENTOS' | 'SERVICIO';
  cantidadFilas: number;
  asientosIzq: number;
  asientosDer: number;
  detalleServicio: string;
}

const BoatPreview = ({ secciones, capacidadReal, capacidadMax }: { secciones: SeccionVisual[], capacidadReal: number, capacidadMax: number }) => {
    if (secciones.length === 0) return null;

    const elementosRenderizables: any[] = [];
    let contadorFila = 1;

    secciones.forEach((sec) => {
        if (sec.tipo === 'SERVICIO') {
            elementosRenderizables.push({ 
                tipo: 'SERVICIO', 
                idOriginal: sec.id,
                detalle: sec.detalleServicio 
            });
        } else {
            for (let i = 0; i < Number(sec.cantidadFilas); i++) {
                elementosRenderizables.push({
                    tipo: 'FILA',
                    idOriginal: sec.id,
                    idxInterno: i,
                    numeroFila: contadorFila++,
                    asientosIzq: Number(sec.asientosIzq),
                    asientosDer: Number(sec.asientosDer)
                });
            }
        }
    });

return (
    <div className="bg-white p-4 rounded-2xl shadow-xl border border-gray-200 w-64">
        <div className="flex justify-between items-center mb-4 border-b border-gray-100 pb-2">
            <h4 className="text-xs font-bold text-[#2A3F54] uppercase flex items-center gap-1">
                <Eye size={12} className="text-[#1ABB9C]"/> Vista Previa
            </h4>
            <span className={`text-[10px] font-bold px-2 py-0.5 rounded 
                ${capacidadReal === capacidadMax ? 'bg-green-100 text-green-700' : 
                  capacidadReal > capacidadMax ? 'bg-red-100 text-red-600' : 'bg-orange-50 text-orange-600'}`}>
                {capacidadReal} / {capacidadMax}
            </span>
        </div>

        <div className="relative bg-gray-50 border-2 border-gray-300 rounded-t-[100px] rounded-b-3xl p-4 pt-12 min-h-[250px] flex flex-col gap-1 shadow-inner mx-auto w-48">
            <div className="absolute top-4 left-1/2 -translate-x-1/2 text-[9px] font-bold text-gray-300 tracking-widest">PROA</div>
            
            {elementosRenderizables.map((item, idx) => (
                <div key={`${item.idOriginal}-${idx}`} className="w-full">
                    {item.tipo === 'SERVICIO' ? (
                        <div className="bg-blue-100 border border-blue-200 rounded p-1.5 mb-1 text-center">
                            <span className="text-[9px] font-bold text-blue-600 block leading-tight">
                                {item.detalle === 'SNACK_BANO' ? 'BAÑO / SNACK' : 'SERVICIO'}
                            </span>
                        </div>
                    ) : (
                        <div className="flex justify-between items-center mb-1 px-1">
                            <div className="flex gap-0.5 justify-start flex-1">
                                {Array.from({ length: item.asientosIzq }).map((_, sIdx) => (
                                    <div key={`L-${sIdx}`} className="w-3.5 h-3.5 bg-orange-200 border border-orange-300 rounded-[2px] shadow-sm"></div>
                                ))}
                            </div>
                            
                            <div className="w-6 flex justify-center items-center">
                                <span className="text-[10px] font-bold text-gray-400 font-mono leading-none">
                                    {item.numeroFila}
                                </span>
                            </div>

                            <div className="flex gap-0.5 justify-end flex-1">
                                {Array.from({ length: item.asientosDer }).map((_, sIdx) => (
                                    <div key={`R-${sIdx}`} className="w-3.5 h-3.5 bg-orange-200 border border-orange-300 rounded-[2px] shadow-sm"></div>
                                ))}
                            </div>
                        </div>
                    )}
                </div>
            ))}

            <div className="mt-auto pt-4 text-center">
                <div className="text-[9px] font-bold text-gray-300 tracking-widest border-t border-gray-200 pt-1">POPA</div>
            </div>
        </div>
    </div>
);
};

const EmbarcacionesPage = () => {

  const { register, handleSubmit, reset, setValue, watch, formState: { isSubmitting, errors } } = useForm<EmbarcacionForm>({
      resolver: yupResolver(embarcacionSchema) as any, 
      defaultValues: {
          idEmbarcacion: null,
          nombre: '',
          matricula: '',
          capacidad: '',
          estado: 'OPERATIVO'
      }
  });

  const [naves, setNaves] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [busqueda, setBusqueda] = useState('');

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editando, setEditando] = useState(false);

  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);

  const [secciones, setSecciones] = useState<SeccionVisual[]>([]);
  
  const capacidadDeclarada = Number(watch('capacidad')) || 0;

  const totalAsientosConfigurados = secciones.reduce((acc, s) => {
      if (s.tipo === 'ASIENTOS') {
          return acc + (s.cantidadFilas * (s.asientosIzq + s.asientosDer));
      }
      return acc;
  }, 0);

  const coincideCapacidad = totalAsientosConfigurados === capacidadDeclarada;
  const excedeCapacidad = totalAsientosConfigurados > capacidadDeclarada;
  const faltaCapacidad = totalAsientosConfigurados < capacidadDeclarada;

  const getEstadoBadge = () => {
      if (capacidadDeclarada === 0) return 'bg-gray-100 text-gray-500 border-gray-200';
      if (excedeCapacidad) return 'bg-red-50 text-red-600 border-red-200';
      if (faltaCapacidad) return 'bg-orange-50 text-orange-600 border-orange-200';
      return 'bg-green-50 text-green-700 border-green-200';
  };

  useEffect(() => {
    const handleResize = () => setItemsPerPage(window.innerWidth < 1024 ? 5 : 6);
    window.addEventListener('resize', handleResize);
    handleResize();
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const cargarDatos = async () => {
    setLoading(true);
    try {
        const data = await getEmbarcaciones();
        if (Array.isArray(data)) {
            data.sort((a: any, b: any) => b.idEmbarcacion - a.idEmbarcacion);
        }
        setNaves(data);
    } catch (e) { 
        notificarError('Error cargando la flota');
    } finally { 
        setLoading(false); 
    }
  };

  useEffect(() => { cargarDatos(); }, []);
  useEffect(() => { setCurrentPage(1); }, [busqueda]);

  const onError = (errors: any) => {
      notificarError('Verifique los campos requeridos.');
  };

  const agregarSeccion = () => {
    if (excedeCapacidad || coincideCapacidad) {
        notificarError('Has completado la capacidad. Aumenta la capacidad total para agregar más.');
        return;
    }
    setSecciones([...secciones, {
        id: Date.now(),
        tipo: 'ASIENTOS',
        cantidadFilas: 1,
        asientosIzq: 2,
        asientosDer: 2,
        detalleServicio: 'SNACK_BANO'
    }]);
  };

  const eliminarSeccion = (index: number) => {
    const nuevas = [...secciones];
    nuevas.splice(index, 1);
    setSecciones(nuevas);
  };

  const actualizarSeccion = (index: number, campo: keyof SeccionVisual, valor: any) => {
    const nuevas = [...secciones];
    nuevas[index] = { ...nuevas[index], [campo]: valor };
    setSecciones(nuevas);
  };

  const generarJSON = (): string => {
    let filaActual = 1;
    const configBackend = secciones.map(s => {
        if (s.tipo === 'SERVICIO') {
            return { tipo: 'SERVICIO', detalle: s.detalleServicio };
        } else {
            const inicio = filaActual;
            const fin = filaActual + Number(s.cantidadFilas) - 1;
            const letras = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
            const izq = letras.substring(0, s.asientosIzq);
            const der = letras.substring(s.asientosIzq, s.asientosIzq + s.asientosDer);
            const layout = `${izq}_${der}`; 
            filaActual = fin + 1;
            return { tipo: 'ASIENTOS', rango: [inicio, fin], layout: layout };
        }
    });
    return JSON.stringify(configBackend);
  };

  const parsearJSONaVisual = (jsonStr: string) => {
      try {
          if (!jsonStr) return;
          const configBackend = JSON.parse(jsonStr);
          const visual: SeccionVisual[] = configBackend.map((item: any, idx: number) => {
             let izq = 2, der = 2, filas = 1;
             if (item.tipo === 'ASIENTOS') {
                 filas = (item.rango[1] - item.rango[0]) + 1;
                 const partes = item.layout.split('_');
                 izq = partes[0].length;
                 der = partes[1] ? partes[1].length : 0;
             }
             return {
                 id: idx,
                 tipo: item.tipo,
                 cantidadFilas: filas,
                 asientosIzq: izq,
                 asientosDer: der,
                 detalleServicio: item.detalle || 'SNACK_BANO'
             };
          });
          setSecciones(visual);
      } catch (e) {
          setSecciones([]); 
      }
  };

  const abrirModalNuevo = () => {
      reset({ nombre: '', matricula: '', capacidad: '', idEmbarcacion: null, estado: 'OPERATIVO' });
      setSecciones([]);
      setEditando(false);
      setIsModalOpen(true);
  };

  const handleCerrarModal = () => {
      setIsModalOpen(false);
      reset();
      setSecciones([]);
  };

  const onSubmit = async (data: EmbarcacionForm) => {
    if (!coincideCapacidad) {
        if (excedeCapacidad) notificarError('La distribución supera la capacidad total.');
        else notificarError(`Faltan asignar ${capacidadDeclarada - totalAsientosConfigurados} asientos.`);
        return;
    }

    const toastId = notificarCarga('Guardando...');
    try {
        const jsonConfig = generarJSON();
        let totalFilas = 0;
        secciones.forEach(s => { if(s.tipo === 'ASIENTOS') totalFilas += Number(s.cantidadFilas) });

        const payload: any = { 
            nombre: data.nombre,
            matricula: data.matricula,
            capacidad: Number(data.capacidad),
            numeroFilas: totalFilas,
            distribucionColumnas: jsonConfig,
            estado: data.estado || 'OPERATIVO' 
        };
        
        if (data.idEmbarcacion) {
            payload.idEmbarcacion = data.idEmbarcacion;
        }

        await saveEmbarcacion(payload);
        
        cerrarNotificacion(toastId);
        notificarExito(editando ? 'Embarcación actualizada' : 'Embarcación registrada');
        
        handleCerrarModal();
        cargarDatos();
    } catch (error: any) {
        cerrarNotificacion(toastId);
        const mensajeReal = error.response?.data?.mensaje || error.response?.data || "Error inesperado.";
        notificarError(mensajeReal);
    }
  };

  const editar = (nave: any) => {
      setValue('idEmbarcacion', nave.idEmbarcacion);
      setValue('nombre', nave.nombre);
      setValue('matricula', nave.matricula);
      setValue('capacidad', nave.capacidad); 
      setValue('estado', nave.estado); 
      parsearJSONaVisual(nave.distribucionColumnas);
      setEditando(true);
      setIsModalOpen(true);
  };

  const cambiarEstado = async (nave: any) => {
      const nuevoEstado = nave.estado === 'OPERATIVO' ? 'MANTENIMIENTO' : 'OPERATIVO';
      const accion = nave.estado === 'OPERATIVO' ? "enviar a mantenimiento" : "habilitar";
      const tipoAlerta = nave.estado === 'OPERATIVO' ? 'warning' : 'info';

      const confirmado = await confirmarAccion(
          `¿${accion.charAt(0).toUpperCase() + accion.slice(1)} nave?`,
          `La embarcación pasará a estado ${nuevoEstado}.`,
          `Sí, ${accion}`,
          tipoAlerta
      );

      if (!confirmado) return;

      try {
        setNaves(prev => prev.map(n => 
            n.idEmbarcacion === nave.idEmbarcacion ? { ...n, estado: nuevoEstado } : n
        ));
        await toggleMantenimiento(nave.idEmbarcacion);
        notificarExito(`Nave ${accion === 'habilitar' ? 'habilitada' : 'en mantenimiento'}`);
      } catch (e) { 
          notificarError('Error al cambiar estado');
          cargarDatos(); 
      }
  };

  const handleEliminar = async (id: number) => {
    const confirmado = await confirmarAccion(
        "¿Dar de baja embarcación?",
        "La nave pasará a estado 'ELIMINADO' y no podrá asignarse a nuevos viajes.",
        "Sí, dar de baja",
        "danger"
    );

    if (!confirmado) return;

    try {
        await deleteEmbarcacion(id);
        notificarExito('Nave dada de baja correctamente');
        if(editando) handleCerrarModal();
        cargarDatos();
    } catch (e) {
        notificarError('No se pudo eliminar la nave.');
    }
  };

  const navesFiltradas = naves.filter(n => n.nombre.toLowerCase().includes(busqueda.toLowerCase()) || n.matricula.toLowerCase().includes(busqueda.toLowerCase()));
  const indexOfLastItem = currentPage * itemsPerPage;
  const indexOfFirstItem = indexOfLastItem - itemsPerPage;
  const currentItems = navesFiltradas.slice(indexOfFirstItem, indexOfLastItem);
  const totalPages = Math.ceil(navesFiltradas.length / itemsPerPage);
  const paginate = (pageNumber: number) => setCurrentPage(pageNumber);

  return (
    <MainLayout>
      <div className="max-w-7xl mx-auto pb-3 relative">
        
        {/* HEADER CON BOTÓN DE NUEVA EMBARCACIÓN */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 mb-8 flex flex-col md:flex-row md:items-center justify-between gap-4 animate-in slide-in-from-top-4">
            <div className="flex items-center gap-4">
                <div className="p-3 bg-blue-50 rounded-xl text-[#1ABB9C]"><Ship size={28} /></div>
                <div>
                    <h1 className="text-2xl font-bold text-[#2A3F54]">Gestión de Embarcaciones</h1>
                    <p className="text-sm text-gray-400 mt-1">Administra tus embarcaciones y su distribución de asientos.</p>
                </div>
            </div>
            <div className="flex flex-col sm:flex-row items-center gap-3 w-full md:w-auto">
                <div className="relative group w-full sm:w-72">
                    <Search className="absolute left-3 top-3 text-gray-400" size={18} />
                    <input 
                        type="text" 
                        placeholder="Buscar nave o matrícula..." 
                        value={busqueda} 
                        onChange={(e) => setBusqueda(e.target.value)} 
                        className="pl-10 pr-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm w-full focus:outline-none focus:border-[#1ABB9C] transition-colors"
                    />
                </div>
                <button 
                    onClick={abrirModalNuevo}
                    className="w-full sm:w-auto flex items-center justify-center gap-2 bg-[#2A3F54] hover:bg-[#1f2f3f] text-white px-5 py-2.5 rounded-xl font-bold text-sm shadow-md transition-transform hover:scale-105 active:scale-95"
                >
                    <Plus size={18} /> Nueva Embarcación
                </button>
            </div>
        </div>

        {/* TABLA DE EMBARCACIONES */}
        <div className="bg-white rounded-2xl shadow-xl border border-gray-100 overflow-hidden flex flex-col max-h-[calc(100vh-220px)] h-fit animate-in fade-in duration-500">
            <div className="bg-[#2A3F54] border-b border-gray-100 px-6 py-4 flex justify-between items-center shrink-0">
                <h3 className="font-bold text-white flex items-center gap-2">
                    <div className="bg-white p-1.5 rounded-md shadow-sm text-[#1ABB9C]"><List size={14} /></div> 
                    Lista de Embarcaciones<span className="text-white text-xs font-normal">({navesFiltradas.length} encontradas)</span>
                </h3>
            </div>

            {loading ? (
                <div className="flex-1 flex justify-center items-center p-12">
                    <Loader className="animate-spin text-[#1ABB9C]" size={40}/>
                </div>
            ) : navesFiltradas.length === 0 ? (
                <div className="flex-1 flex flex-col items-center justify-center text-center p-12">
                    <div className="bg-gray-50 p-6 rounded-full mb-4 border border-gray-100">
                        <Ship size={48} className="text-gray-300" />
                    </div>
                    <h4 className="text-gray-600 font-bold text-lg">No se encontraron embarcaciones</h4>
                    <p className="text-gray-400 text-sm mt-1 max-w-xs">Intenta con otro término de búsqueda o registra la primera embarcación.</p>
                </div>
            ) : (
                <div className="overflow-auto flex-1 custom-scrollbar">
                    <table className="w-full text-sm text-left">
                        <thead className="bg-gray-50/80 text-gray-500 font-bold uppercase text-[10px] tracking-wider border-b border-gray-100 sticky top-0 z-10 backdrop-blur-md">
                            <tr>
                                <th className="px-4 py-4 text-center text-[#1ABB9C] w-16">N°</th>
                                <th className="px-6 py-4 min-w-[200px]">Nave y Matrícula</th>
                                <th className="px-6 py-4 text-center">Estado</th>
                                <th className="px-6 py-4 text-center">Capacidad</th>
                                <th className="px-6 py-4 text-center">Acciones</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-50">
                            {currentItems.map((n, index) => (
                                <tr key={n.idEmbarcacion} className={`hover:bg-blue-300/15 transition-colors ${n.estado === 'MANTENIMIENTO' ? 'bg-orange-50/30' : ''}`}>
                                    <td className="px-4 py-4 text-center font-bold text-gray-400 text-xs">{(currentPage - 1) * itemsPerPage + index + 1}</td>
                                    <td className="px-6 py-4">
                                        <div>
                                            <div className="font-bold text-[#2A3F54] text-sm">{n.nombre}</div>
                                            <div className="text-[10px] font-mono text-gray-400 bg-gray-100 px-2 py-0.5 rounded w-fit mt-1">{n.matricula}</div>
                                        </div>
                                    </td>
                                    <td className="px-6 py-4 text-center">
                                        <span className={`text-[10px] font-bold px-3 py-1 rounded-full border ${n.estado === 'OPERATIVO' ? 'bg-green-50 text-green-700 border-green-200' : 'bg-orange-50 text-orange-700 border-orange-200'}`}>
                                            {n.estado}
                                        </span>
                                    </td>
                                    <td className="px-6 py-4 text-center">
                                        <span className="font-black text-[#1ABB9C] text-lg">{n.capacidad}</span>
                                        <span className="text-[10px] text-black ml-1">Pasajeros</span>
                                    </td>
                                    <td className="px-6 py-4 text-center flex justify-center gap-2">
                                        <button onClick={() => editar(n)} className="inline-flex items-center gap-1 bg-white border border-gray-200 text-gray-500 hover:border-blue-300 hover:bg-blue-50 hover:text-blue-600 px-3 py-2 rounded-lg transition-all text-xs font-bold shadow-sm hover:shadow-md">
                                            <Edit size={16} /> Editar
                                        </button>
                                        <button onClick={() => cambiarEstado(n)} className="flex items-center gap-1 px-3 py-1.5 border rounded-lg text-xs font-bold border-gray-200 bg-white text-gray-500 hover:bg-orange-50 hover:text-orange-600 hover:border-orange-300 transition-colors shadow-sm">
                                            <Wrench size={14}/> Estado
                                        </button>
                                        <button onClick={() => handleEliminar(n.idEmbarcacion)} className="inline-flex items-center gap-1 bg-white border border-gray-200 text-gray-500 hover:border-red-300 hover:bg-red-50 hover:text-red-600 px-3 py-2 rounded-lg transition-all text-xs font-bold shadow-sm hover:shadow-md">
                                            <Trash2 size={14}/> Eliminar
                                        </button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}
            
            <div className="border-t border-gray-100 p-4 bg-gray-50/80 flex justify-between items-center shrink-0">
                <span className="text-xs text-gray-500 font-medium bg-white px-3 py-1 rounded-full border border-gray-200 shadow-sm">
                    Mostrando <span className="text-[#2A3F54] font-bold">{navesFiltradas.length > 0 ? indexOfFirstItem + 1 : 0}-{Math.min(indexOfLastItem, navesFiltradas.length)}</span> de {navesFiltradas.length}
                </span>
                <div className="flex gap-2">
                    <button onClick={() => paginate(currentPage - 1)} disabled={currentPage === 1} className="p-2 rounded-lg border bg-white hover:text-[#1ABB9C] disabled:opacity-50 shadow-sm transition-colors"><ChevronLeft size={16}/></button>
                    <button onClick={() => paginate(currentPage + 1)} disabled={currentPage === totalPages || totalPages === 0} className="p-2 rounded-lg border bg-white hover:text-[#1ABB9C] disabled:opacity-50 shadow-sm transition-colors"><ChevronRight size={16}/></button>
                </div>
            </div>
        </div>

        {/* MODAL FLOTANTE DE CREACIÓN / EDICIÓN DE EMBARCACIÓN */}
        {isModalOpen && (
            <div className="fixed inset-0 z-50 flex items-start md:items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4 sm:p-6 animate-in fade-in duration-200 overflow-y-auto">
                
                <div className="bg-white rounded-2xl shadow-2xl w-full max-w-5xl flex flex-col md:flex-row overflow-hidden animate-in zoom-in-95 duration-200 my-auto md:max-h-[90vh]">
                    
                    {/* PANEL IZQUIERDO: FORMULARIO */}
                    <div className="w-full md:w-3/5 flex flex-col border-b md:border-b-0 md:border-r border-gray-100">
                        {/* Cabecera del Modal */}
                        <div className={`p-5 flex justify-between items-center shrink-0 ${editando ? 'bg-gradient-to-r from-blue-600 to-blue-500' : 'bg-gradient-to-r from-[#2A3F54] to-[#3E5367]'}`}>
                            <h3 className="font-bold text-white text-lg flex items-center gap-2">
                                {editando ? <Edit size={20} className="text-white"/> : <Plus size={20} className="text-[#1ABB9C]"/>} 
                                {editando ? 'Modificar Embarcación' : 'Nueva Embarcación'}
                            </h3>
                            <button onClick={handleCerrarModal} className="md:hidden text-white/70 hover:text-white bg-white/10 hover:bg-white/20 p-1 rounded-lg transition-colors">
                                <X size={20} />
                            </button>
                        </div>

                        {/* Cuerpo del Formulario (Scrollable) */}
                        <div className="overflow-y-auto p-6 flex-1 custom-scrollbar bg-white">
                            <form id="formEmbarcacion" onSubmit={handleSubmit(onSubmit, onError)} className="space-y-5">
                                <input type="hidden" {...register('idEmbarcacion')} /> <input type="hidden" {...register('estado')} />

                                <div className="space-y-4">
                                    <div className="group">
                                        <label className="text-xs font-bold text-gray-500 uppercase mb-1.5 flex items-center gap-1"><Ship size={12}/> Nombre de la Nave</label>
                                        <input {...register('nombre')} 
                                            className={`w-full bg-gray-50 border border-gray-200 p-3 rounded-xl text-sm outline-none focus:border-[#1ABB9C] ${errors.nombre ? 'border-red-300 bg-red-50' : 'focus:bg-white focus:border-[#1ABB9C] focus:ring-4 focus:ring-green-50'}`} 
                                            placeholder="Ej: Gran Amazonas I" />
                                        {errors.nombre && <span className="text-red-500 text-[10px] flex items-center gap-1 mt-1"><AlertCircle size={10}/> {String(errors.nombre.message)}</span>}
                                    </div>
                                    <div className="grid grid-cols-2 gap-4">
                                        <div className="group">
                                            <label className="text-xs font-bold text-gray-500 uppercase mb-1.5 flex items-center gap-1"><CalendarRangeIcon size={12}/> Matrícula</label>
                                            <input 
                                                {...register('matricula')} 
                                                className={`w-full bg-gray-50 border border-gray-200 p-3 rounded-xl text-sm outline-none focus:border-[#1ABB9C] font-mono uppercase ${errors.matricula ? 'border-red-300 bg-red-50' : 'focus:bg-white focus:border-[#1ABB9C] focus:ring-4 focus:ring-green-50'}`} 
                                                placeholder="Ej: IQ-2025" 
                                                onKeyPress={(e) => {
                                                    if (!/[A-Za-z0-9-]/.test(e.key)) e.preventDefault();
                                                }}
                                            />
                                            {errors.matricula && <span className="text-red-500 text-[10px] flex items-center gap-1 mt-1"><AlertCircle size={10}/> {String(errors.matricula.message)}</span>}
                                        </div>
                                        <div className="group bg-yellow-50 p-2 rounded-xl border border-yellow-200">
                                            <label className="text-[10px] font-bold text-yellow-800 flex items-center gap-1 uppercase mb-1"><Users size={12}/> Capacidad Total</label>
                                            <input 
                                                type="text" 
                                                {...register('capacidad')} 
                                                className="w-full bg-transparent text-xl font-black focus:outline-none text-yellow-900 placeholder-yellow-300 " 
                                                placeholder="0" 
                                                onKeyPress={(e) => {
                                                    if (!/[0-9]/.test(e.key)) e.preventDefault();
                                                }}
                                            />
                                            {errors.capacidad && <span className="text-red-500 text-[10px] flex items-center gap-1 mt-1"><AlertCircle size={10}/> {String(errors.capacidad.message)}</span>}
                                        </div>
                                    </div>
                                </div>

                                <div className="border-t border-gray-100 pt-4 mt-2">
                                    <div className="flex justify-between items-center mb-3">
                                        <label className="text-xs font-bold text-[#2A3F54] uppercase flex items-center gap-1"><Ship size={12}/> Distribución del Barco</label>
                                        <span className={`text-[10px] font-bold px-2 py-1 rounded-full border flex items-center gap-1 ${getEstadoBadge()}`}>
                                            {totalAsientosConfigurados} / {capacidadDeclarada} Pas 
                                            {excedeCapacidad && <AlertCircle size={10}/>}
                                            {coincideCapacidad && <CheckCircle size={10}/>}
                                        </span>
                                    </div>

                                    <div className="space-y-3">
                                        {secciones.map((sec, idx) => (
                                            <div key={sec.id} className="bg-gray-50 border border-gray-200 p-3 rounded-xl shadow-sm relative group hover:border-blue-200 transition-colors">
                                                <button type="button" onClick={() => eliminarSeccion(idx)} className="absolute top-2 right-2 text-gray-400 hover:text-red-500 transition-colors bg-white rounded-full p-1 border border-gray-200 hover:border-red-200 hover:bg-red-50"><Trash2 size={14}/></button>
                                                <div className="flex flex-col gap-3">
                                                    <div className="w-full pr-8">
                                                        <label className="text-[10px] text-gray-400 font-bold uppercase block mb-1">Tipo de Bloque</label>
                                                        <select className="w-full text-xs border border-gray-300 rounded-lg p-2 font-medium text-gray-700 outline-none focus:border-blue-400 bg-white" value={sec.tipo} onChange={(e) => actualizarSeccion(idx, 'tipo', e.target.value)}>
                                                            <option value="ASIENTOS">💺 Bloque de Asientos</option>
                                                            <option value="SERVICIO">🚽 Área de Servicio (Baño/Snack)</option>
                                                        </select>
                                                    </div>
                                                    {sec.tipo === 'ASIENTOS' ? (
                                                        <div className="grid grid-cols-3 gap-2 items-end pr-8">
                                                            <div>
                                                                <label className="text-[9px] text-gray-400 font-bold uppercase block mb-1">Cant. Filas</label>
                                                                <input type="number" min="1" 
                                                                    className="w-full border rounded-lg p-1.5 text-center text-xs font-bold bg-white outline-none focus:border-blue-400 appearance-auto [&::-webkit-inner-spin-button]:appearance-auto [&::-webkit-outer-spin-button]:appearance-auto" 
                                                                    value={sec.cantidadFilas} 
                                                                    onChange={(e) => actualizarSeccion(idx, 'cantidadFilas', parseInt(e.target.value) || 0)}
                                                                />
                                                            </div>
                                                            <div>
                                                                <label className="text-[9px] text-gray-400 font-bold uppercase block mb-1 text-center">Asientos Izq.</label>
                                                                <input type="number" min="0" max="6" 
                                                                    className="w-full border rounded-lg p-1.5 text-center text-xs font-bold bg-white outline-none focus:border-blue-400 appearance-auto [&::-webkit-inner-spin-button]:appearance-auto [&::-webkit-outer-spin-button]:appearance-auto" 
                                                                    value={sec.asientosIzq} 
                                                                    onChange={(e) => actualizarSeccion(idx, 'asientosIzq', parseInt(e.target.value) || 0)}
                                                                />
                                                            </div>
                                                            <div>
                                                                <label className="text-[9px] text-gray-400 font-bold uppercase block mb-1 text-center">Asientos Der.</label>
                                                                <input type="number" min="0" max="6" 
                                                                    className="w-full border rounded-lg p-1.5 text-center text-xs font-bold bg-white outline-none focus:border-blue-400 appearance-auto [&::-webkit-inner-spin-button]:appearance-auto [&::-webkit-outer-spin-button]:appearance-auto" 
                                                                    value={sec.asientosDer} 
                                                                    onChange={(e) => actualizarSeccion(idx, 'asientosDer', parseInt(e.target.value) || 0)}
                                                                />
                                                            </div>
                                                        </div>
                                                    ) : (
                                                        <div className="pr-8"><label className="text-[9px] text-gray-400 font-bold uppercase block mb-1">Detalle</label><select className="w-full text-xs border border-gray-300 p-2 rounded-lg bg-white outline-none focus:border-blue-400" value={sec.detalleServicio} onChange={(e) => actualizarSeccion(idx, 'detalleServicio', e.target.value)}><option value="SNACK_BANO">Área de Snack y Baño</option></select></div>
                                                    )}
                                                </div>
                                            </div>
                                        ))}
                                        <button 
                                            type="button" 
                                            onClick={agregarSeccion} 
                                            disabled={!capacidadDeclarada || excedeCapacidad || coincideCapacidad} 
                                            className={`w-full py-3 border-2 border-dashed rounded-xl flex items-center justify-center gap-2 text-xs font-bold transition-all 
                                            ${(!capacidadDeclarada || excedeCapacidad || coincideCapacidad) 
                                                ? 'border-gray-200 text-gray-400 cursor-not-allowed bg-gray-50' 
                                                : 'border-[#1ABB9C] text-[#1ABB9C] hover:bg-green-50'}`}
                                        >
                                            <Plus size={16}/> Agregar Nuevo Bloque
                                        </button>
                                    </div>
                                </div>
                            </form>
                        </div>
                        
                        {/* Footer de Botones del Modal */}
                        <div className="p-5 border-t border-gray-100 bg-gray-50 flex items-center gap-3 shrink-0">
                            <button type="button" onClick={handleCerrarModal} className="w-1/3 bg-white border border-gray-200 text-gray-600 py-2.5 rounded-xl text-sm font-bold hover:bg-gray-100 transition-colors">
                                Cancelar
                            </button>
                            <button type="submit" form="formEmbarcacion" disabled={!coincideCapacidad || isSubmitting} className={`w-2/3 text-white py-2.5 rounded-xl text-sm font-bold transition-all shadow-md hover:shadow-lg flex justify-center items-center gap-2 ${!coincideCapacidad ? 'bg-gray-400 cursor-not-allowed' : editando ? 'bg-blue-600 hover:bg-blue-700' : 'bg-[#1ABB9C] hover:bg-[#16a085]'}`}>
                                {isSubmitting ? <Loader className="animate-spin" size={18}/> : <Save size={18}/>} 
                                {editando ? 'Guardar Cambios' : 'Registrar Embarcación'}
                            </button>
                        </div>
                    </div>

                    {/* PANEL DERECHO: VISTA PREVIA DEL BARCO (Ahora visible en todos los dispositivos) */}
                    <div className="flex w-full md:w-2/5 bg-slate-50 flex-col items-center justify-start p-6 relative">
                        <button onClick={handleCerrarModal} className="hidden md:block absolute top-4 right-4 text-gray-400 hover:text-[#2A3F54] bg-white border border-gray-200 hover:border-gray-400 p-1.5 rounded-lg transition-colors shadow-sm z-10">
                            <X size={20} />
                        </button>
                        
                        <div className="w-full max-w-[280px] mt-8">
                            <BoatPreview secciones={secciones} capacidadReal={totalAsientosConfigurados} capacidadMax={capacidadDeclarada} />
                            
                            {secciones.length === 0 && (
                                <div className="mt-8 text-center border-2 border-dashed border-gray-300 rounded-2xl p-8 bg-white/50 text-gray-400">
                                    <Ship size={48} className="mx-auto mb-3 opacity-20"/>
                                    <p className="text-xs font-medium">Comienza a agregar bloques para visualizar la distribución de tu embarcación aquí.</p>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </div>
        )}
      </div>
    </MainLayout>
  );
};

export default EmbarcacionesPage;