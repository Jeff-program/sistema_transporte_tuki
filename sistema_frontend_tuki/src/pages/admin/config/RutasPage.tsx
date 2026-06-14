import { useState, useEffect } from 'react';
import { useForm, useFieldArray } from 'react-hook-form';
import MainLayout from '../../../layouts/MainLayout';
import { 
  Map as MapIcon, 
  ArrowRight, Save, Loader, Plus, Trash2, ToggleLeft, ToggleRight, 
  Anchor, XCircle, Search, DollarSign, MapPin, ChevronLeft, ChevronRight, 
  Edit, List, Eye, X, Ticket, Tag, AlertCircle,
  RouteIcon, Waves
} from 'lucide-react';
import api from '../../../services/api';
import { 
    getRutas, saveRuta, getEscalasPorRuta, 
    saveEscala, deleteEscala, saveTarifa, getTarifasPorRuta,
    deleteRuta, deleteTarifa,
    getRiosActivos, getPuertosPorRio
} from '../../../services/configService';
import { 
    notificarExito, notificarError, notificarCarga, cerrarNotificacion,
    confirmarAccion 
} from '../../../services/feedbackService';

const obtenerNombreRioRuta = (ruta: any, textoFallback = 'General') => {
    const origenEsPrincipal = ruta?.origen?.esPrincipal === true;
    const destinoRio = ruta?.destino?.rio?.nombreRio;

    if (origenEsPrincipal && destinoRio) {
        return destinoRio;
    }

    return ruta?.origen?.rio?.nombreRio || destinoRio || textoFallback;
};

const RouteDetailDrawer = ({ ruta, onClose, isOpen }: { ruta: any, onClose: () => void, isOpen: boolean }) => {
    const [escalas, setEscalas] = useState<any[]>([]);
    const [tarifas, setTarifas] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    const formatHora12 = (hora24?: string) => {
        if (!hora24) return '';
        const [h, m] = hora24.split(':');
        let hInt = parseInt(h, 10);
        const ampm = hInt >= 12 ? 'PM' : 'AM';
        hInt = hInt % 12 || 12;
        return `${hInt.toString().padStart(2, '0')}:${m} ${ampm}`;
    };

    useEffect(() => {
        let isMounted = true;

        if (!isOpen || !ruta) {
            setEscalas([]);
            setTarifas([]);
            return;
        }

        const fetchData = async () => {
            setLoading(true);
            try {
                const idRutaReal = ruta.idRuta; 
                
                const [escalasData, tarifasData] = await Promise.all([
                    getEscalasPorRuta(idRutaReal),
                    getTarifasPorRuta(idRutaReal)
                ]);
                
                if (!isMounted) return;

                const escalasOrdenadas = escalasData.sort((a:any, b:any) => a.orden - b.orden);
                const listaPuertos = [
                    { ...ruta.origen, tipo: 'ORIGEN', orden: 0 },
                    ...escalasOrdenadas.map((e:any) => ({ ...e.puerto, tipo: 'ESCALA', orden: e.orden, horaEmbarque: e.horaEmbarque })),
                    { ...ruta.destino, tipo: 'DESTINO', orden: 999 }
                ];

                const puertoIndexMap = new Map<string, number>();
                listaPuertos.forEach((p, index) => {
                    puertoIndexMap.set(String(p.idPuerto), index);
                });

                const tarifasValidas = tarifasData.filter((t: any) => 
                    puertoIndexMap.has(String(t.idPuertoOrigen)) && 
                    puertoIndexMap.has(String(t.idPuertoDestino))
                );

                const tarifasFinales = tarifasValidas.sort((a: any, b: any) => {
                    const idxOrigenA = puertoIndexMap.get(String(a.idPuertoOrigen)) || 0; 
                    const idxOrigenB = puertoIndexMap.get(String(b.idPuertoOrigen)) || 0;

                    if (idxOrigenA !== idxOrigenB) return idxOrigenA - idxOrigenB;

                    const idxDestinoA = puertoIndexMap.get(String(a.idPuertoDestino)) || 0;
                    const idxDestinoB = puertoIndexMap.get(String(b.idPuertoDestino)) || 0;
                    return idxDestinoA - idxDestinoB;
                });

                setEscalas(listaPuertos);
                setTarifas(tarifasFinales);

            } catch (e) {
                console.error(e);
            } finally {
                if (isMounted) setLoading(false);
            }
        };
        fetchData();

        return () => {
            isMounted = false;
        };
    }, [ruta, isOpen]);

    if (!isOpen || !ruta) return null;

    return (
        <div className="fixed inset-0 z-50 flex justify-end">
            <div className="absolute inset-0 bg-black/30 backdrop-blur-sm transition-opacity" onClick={onClose}></div>
            
            <div className="relative w-full max-w-md bg-white h-full shadow-2xl animate-in slide-in-from-right duration-300 flex flex-col border-l border-gray-100">
                <div className="bg-[#2A3F54] text-white p-6 flex justify-between items-start shadow-md z-10">
                    <div>
                        <h2 className="text-xl font-bold flex items-center gap-2">
                            <MapIcon size={20} className="text-[#1ABB9C]"/> {ruta.nombreRuta}
                        </h2>
                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded border mt-2 inline-block ${ruta.estado === 'ACTIVO' ? 'bg-green-500/20 border-green-400 text-green-100' : 'bg-gray-500/20 border-gray-400 text-gray-300'}`}>
                            {ruta.estado === 'ACTIVO' ? 'RUTA ACTIVA' : 'RUTA INACTIVA'}
                        </span>
                        <div className="text-xs text-blue-300 mt-2 flex items-center gap-1 font-medium">
                            <Waves size={12}/> {obtenerNombreRioRuta(ruta, 'Sin río asignado')}
                        </div>
                    </div>
                    <button onClick={onClose} className="text-white/70 hover:text-white transition-colors bg-white/10 p-1.5 rounded-full"><X size={20} /></button>
                </div>

                <div className="flex-1 overflow-y-auto p-6 bg-slate-50 custom-scrollbar space-y-8">
                    {loading ? (
                        <div className="flex flex-col items-center justify-center h-64 text-gray-400">
                            <Loader className="animate-spin mb-2 text-[#1ABB9C]" size={32}/>
                            <p className="text-xs">Cargando información...</p>
                        </div>
                    ) : (
                        <>
                            <div className="bg-white p-5 rounded-xl shadow-sm border border-gray-100">
                                <h3 className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-5 flex items-center gap-2 border-b border-gray-100 pb-2">
                                    <Anchor size={14} className="text-[#1ABB9C]"/> Itinerario
                                </h3>
                                <div className="relative border-l-2 border-gray-200 ml-2 space-y-6 pb-2">
                                    {escalas.map((punto, idx) => (
                                        <div key={idx} className="relative pl-6 group">
                                            <div className={`absolute -left-[9px] top-1 w-4 h-4 rounded-full border-2 border-white shadow-sm transition-transform group-hover:scale-110
                                                ${punto.tipo === 'ORIGEN' ? 'bg-green-500' : punto.tipo === 'DESTINO' ? 'bg-red-500' : 'bg-[#2A3F54]'}`}
                                            ></div>
                                            <div className="flex flex-col">
                                                <span className="text-sm font-bold text-[#2A3F54]">{punto.ciudad}</span>
                                                <span className="text-[12px] text-gray-500 font-medium">
                                                    {punto.tipo === 'ORIGEN' ? 'Zarpe' : punto.tipo === 'DESTINO' ? 'Llegada' : `Escala #${idx} ${punto.horaEmbarque ? ' - Embarque: ' + formatHora12(punto.horaEmbarque) : ''}`}
                                                </span>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>

                            <div>
                                <div className="flex justify-between items-end mb-4 px-2">
                                    <h3 className="text-xs font-bold text-gray-400 uppercase tracking-widest flex items-center gap-2">
                                        <Ticket size={14} className="text-[#1ABB9C]"/> Tarifas Vigentes
                                    </h3>
                                    <span className="text-[11px] bg-blue-50 text-blue-600 px-2 py-0.5 rounded border border-blue-100 font-bold">
                                        {tarifas.length} Escalas
                                    </span>
                                </div>
                                
                                {tarifas.length === 0 ? (
                                    <div className="text-center p-6 border-2 border-dashed border-gray-200 rounded-xl bg-white">
                                        <p className="text-xs text-gray-400">No hay tarifas configuradas.</p>
                                    </div>
                                ) : (
                                    <div className="grid grid-cols-1 gap-3">
                                        {tarifas.map((t: any) => (
                                            <div key={t.idTarifa} className="bg-white p-3 rounded-xl border border-gray-200 shadow-sm hover:border-[#1ABB9C]/50 transition-colors">
                                                <div className="flex justify-between items-center">
                                                    <div className="flex flex-col">
                                                        <div className="flex items-center gap-2 text-sm font-bold text-gray-700">
                                                            <span>{t.nombreOrigen}</span>
                                                            <ArrowRight size={12} className="text-gray-300"/>
                                                            <span>{t.nombreDestino}</span>
                                                        </div>
                                                        <span className="text-[13px] text-gray-400 mt-0.5 flex items-center gap-1"><Tag size={10}/> Tarifa por Pasajero</span>
                                                    </div>
                                                    <span className="block text-lg font-black text-[#1ABB9C]">S/ {parseFloat(t.precio).toFixed(2)}</span>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                        </>
                    )}
                </div>
            </div>
        </div>
    );
};

const RutasPage = () => {
  const { register, control, handleSubmit, reset, watch, setValue, formState: { errors, isSubmitting } } = useForm({
    defaultValues: {
        idRuta: null,
        nombreRuta: '',
        origenId: '',
        destinoId: '',
        estado: 'ACTIVO',
        escalasIntermedias: [] as { puertoId: string, hora: string, minuto: string, ampm: string }[]
    }
  });

  const { fields: camposEscalas, append: agregarEscala, remove: quitarEscala } = useFieldArray({
    control,
    name: "escalasIntermedias"
  });

  const [rutas, setRutas] = useState<any[]>([]);
  const [puertos, setPuertos] = useState<any[]>([]);
  const [rios, setRios] = useState<any[]>([]); 
  const [rioSeleccionado, setRioSeleccionado] = useState<string>(''); 

  const [loading, setLoading] = useState(true);
  
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editando, setEditando] = useState(false);
  
  const [matrizPrecios, setMatrizPrecios] = useState<any[]>([]);
  const [busqueda, setBusqueda] = useState('');
  
  const [rutaDetalle, setRutaDetalle] = useState<any>(null);

  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);

  const getNombreCiudad = (id: string) => puertos.find(p => p.idPuerto == id)?.ciudad || '...';

  useEffect(() => {
    const handleResize = () => setItemsPerPage(window.innerWidth < 1024 ? 5 : 5);
    window.addEventListener('resize', handleResize);
    handleResize();
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const cargarDatos = async () => {
    setLoading(true);
    try {
        const [rutasData, riosData] = await Promise.all([getRutas(), getRiosActivos()]);
        if (Array.isArray(rutasData)) {
            rutasData.sort((a: any, b: any) => b.idRuta - a.idRuta);
        }
        setRutas(rutasData);
        setRios(riosData);
    } catch (e) {
        notificarError('Error conectando al servidor');
    } finally {
        setLoading(false);
    }
  };

  useEffect(() => { cargarDatos(); }, []);
  useEffect(() => { setCurrentPage(1); }, [busqueda]);

  useEffect(() => {
      if (rioSeleccionado) {
          getPuertosPorRio(Number(rioSeleccionado))
              .then(data => setPuertos(data))
              .catch(() => notificarError("Error cargando los puertos del río seleccionado"));
      } else {
          setPuertos([]);
      }

      if (!editando) {
          reset({ ...watch(), origenId: '', destinoId: '', escalasIntermedias: [] });
          setMatrizPrecios([]);
      }
  }, [rioSeleccionado, editando]);

  const onError = (errors: any) => {
      notificarError('Verifique los campos en rojo. Horario de embarque obligatorio y tarifas no negativas.');
  };

  const origenSel = watch('origenId');
  const destinoSel = watch('destinoId');
  const escalasSel = watch('escalasIntermedias');

  useEffect(() => {
      if (origenSel && destinoSel) {
          const origen = puertos.find(p => p.idPuerto == origenSel);
          const destino = puertos.find(p => p.idPuerto == destinoSel);
          if (origen && destino) {
              setValue('nombreRuta', `${origen.ciudad} - ${destino.ciudad}`);
          }
      } else {
          setValue('nombreRuta', '');
      }

      if (!origenSel || !destinoSel) {
          setMatrizPrecios([]);
          return;
      }
      const idsRaw = [origenSel, ...escalasSel.map(e => e.puertoId), destinoSel];
      const idsUnicos = [...new Set(idsRaw)].filter(id => id);

      const puntos = idsUnicos.map(id => ({
          id: id.toString(),
          nombre: getNombreCiudad(id.toString())
      }));

      const nuevasTarifas = [];
      for (let i = 0; i < puntos.length; i++) {
          for (let j = i + 1; j < puntos.length; j++) {
              nuevasTarifas.push({
                  origenId: puntos[i].id,
                  origenNombre: puntos[i].nombre,
                  destinoId: puntos[j].id,
                  destinoNombre: puntos[j].nombre,
              });
          }
      }
      setMatrizPrecios(nuevasTarifas);
  }, [origenSel, destinoSel, JSON.stringify(escalasSel), puertos, setValue]); 

  const getPuertosDisponibles = (indexActual: number) => {
      const usados = [origenSel, destinoSel, ...escalasSel.map((e, idx) => idx !== indexActual ? e.puertoId : null)];
      const usadosStr = usados.map(u => String(u));
      return puertos.filter(p => !usadosStr.includes(String(p.idPuerto)) && p.estado === 'ACTIVO');
  };

  const onSubmit = async (data: any) => {
    const toastId = notificarCarga('Guardando configuración...');
    try {
        const rutaPayload = {
            idRuta: data.idRuta,
            nombreRuta: data.nombreRuta, 
            estado: data.estado,
            origen: { idPuerto: parseInt(data.origenId) },
            destino: { idPuerto: parseInt(data.destinoId) }
        };
        const rutaGuardada = await saveRuta(rutaPayload);
        
        const escalasAntiguas = await getEscalasPorRuta(rutaGuardada.idRuta);
        if (escalasAntiguas.length > 0) {
            await Promise.all(escalasAntiguas.map((esc:any) => deleteEscala(esc.idEscala)));
        }

        const escalasNuevas = data.escalasIntermedias.map((e:any, idx:number) => {
            let horaMilitar = null;
            if (e.hora && e.minuto && e.ampm) {
                let hInt = parseInt(e.hora, 10);
                if (e.ampm === 'PM' && hInt < 12) hInt += 12;
                if (e.ampm === 'AM' && hInt === 12) hInt = 0;
                horaMilitar = `${hInt.toString().padStart(2, '0')}:${e.minuto}`;
            }

            return {
                idPuerto: parseInt(e.puertoId),
                horaEmbarque: horaMilitar,
                orden: idx + 2 
            };
        });
        
        for (const esc of escalasNuevas) {
             await saveEscala({
                ruta: { idRuta: rutaGuardada.idRuta },
                puerto: { idPuerto: esc.idPuerto },
                horaEmbarque: esc.horaEmbarque,
                orden: esc.orden
            });
        }

        if (editando) {
            const tarifasAntiguas = await getTarifasPorRuta(rutaGuardada.idRuta);
            const puertosValidos = [
                parseInt(data.origenId),
                parseInt(data.destinoId),
                ...data.escalasIntermedias.map((e:any) => parseInt(e.puertoId))
            ];

            const tarifasBasura = tarifasAntiguas.filter((t: any) => 
                !puertosValidos.includes(t.idPuertoOrigen) || 
                !puertosValidos.includes(t.idPuertoDestino)
            );

            if (tarifasBasura.length > 0) {
                await Promise.all(tarifasBasura.map((t: any) => deleteTarifa(t.idTarifa)));
            }
        }

        for (const tramo of matrizPrecios) {
            const inputKey = `precio_${tramo.origenId}_${tramo.destinoId}`;
            const precioVal = data[inputKey];
            if (precioVal && precioVal >= 0) { 
                await saveTarifa({
                    idRuta: rutaGuardada.idRuta,
                    idPuertoOrigen: parseInt(tramo.origenId),
                    idPuertoDestino: parseInt(tramo.destinoId),
                    precio: parseFloat(precioVal)
                });
            }
        }

        cerrarNotificacion(toastId);
        notificarExito(editando ? 'Ruta actualizada y limpiada' : 'Ruta creada');
        
        handleCerrarModal();
        cargarDatos();

    } catch (e: any) {
        cerrarNotificacion(toastId);
        const mensaje = e.response?.data?.mensaje || e.response?.data || 'Error al guardar.';
        notificarError(String(mensaje));
    }
  };

  const abrirModalNuevo = () => {
      reset({ idRuta: null, nombreRuta: '', origenId: '', destinoId: '', estado: 'ACTIVO', escalasIntermedias: [] });
      setMatrizPrecios([]);
      setRioSeleccionado('');
      setEditando(false);
      setIsModalOpen(true);
  };

  const handleCerrarModal = () => {
      setIsModalOpen(false);
      setEditando(false);
      setRioSeleccionado('');
      setMatrizPrecios([]);
      reset();
  };

  const editar = async (ruta: any) => {
      const toastId = notificarCarga('Recuperando datos...');
      try {
          let idRioDetectado = ruta.origen?.rio?.idRio || ruta.destino?.rio?.idRio;
          if (ruta.origen?.esPrincipal && ruta.destino?.rio?.idRio) {
              idRioDetectado = ruta.destino.rio.idRio; 
          }
          
          if (idRioDetectado) {
              setRioSeleccionado(String(idRioDetectado));
              const puertosDelRio = await getPuertosPorRio(idRioDetectado);
              setPuertos(puertosDelRio);
          }

          const escalasBD = await getEscalasPorRuta(ruta.idRuta);
          const intermedias = escalasBD.filter((e:any) => 
              e.puerto.idPuerto !== ruta.origen.idPuerto && 
              e.puerto.idPuerto !== ruta.destino.idPuerto
          ).sort((a:any, b:any) => a.orden - b.orden);

          const tarifasBD = await getTarifasPorRuta(ruta.idRuta);
          
          const preciosFinalesForm: any = {};
          
          tarifasBD.forEach((t: any) => {
              const key = `precio_${t.idPuertoOrigen}_${t.idPuertoDestino}`;
              preciosFinalesForm[key] = t.precio;
          });

          reset({
              idRuta: ruta.idRuta,
              nombreRuta: ruta.nombreRuta,
              origenId: ruta.origen.idPuerto.toString(),
              destinoId: ruta.destino.idPuerto.toString(),
              estado: ruta.estado,
              escalasIntermedias: intermedias.map((e:any) => {
                  let h = '', m = '', a = 'AM';
                  if (e.horaEmbarque) {
                      const [hh, mm] = e.horaEmbarque.split(':');
                      let hInt = parseInt(hh, 10);
                      a = hInt >= 12 ? 'PM' : 'AM';
                      hInt = hInt % 12 || 12;
                      h = hInt.toString().padStart(2, '0');
                      m = mm;
                  }
                  return { 
                      puertoId: e.puerto.idPuerto.toString(),
                      hora: h,
                      minuto: m,
                      ampm: a
                  };
              }),
              ...preciosFinalesForm
          });
          setEditando(true);
          setIsModalOpen(true); 
      } catch(e) {
          notificarError("Error cargando detalles");
      } finally {
          cerrarNotificacion(toastId);
      }
  };

  const toggleEstado = async (ruta: any) => {
      try {
          setRutas(prev => prev.map(r => 
              r.idRuta === ruta.idRuta 
                  ? { ...r, estado: r.estado === 'ACTIVO' ? 'INACTIVO' : 'ACTIVO' } 
                  : r
          ));

          await api.put(`/rutas/${ruta.idRuta}/estado`);
          
          const nuevoEstado = ruta.estado === 'ACTIVO' ? 'desactivada' : 'activada';
          notificarExito(`Ruta ${nuevoEstado} correctamente`);
      } catch (e) { 
          notificarError('Error cambiando estado');
          cargarDatos();
      }
  };

  const handleEliminar = async (id: number) => {
    const confirmado = await confirmarAccion(
        "¿Eliminar esta ruta?",
        "La ruta pasará a estado 'ELIMINADO' y no podrá ser utilizada en nuevos viajes.",
        "Sí, eliminar",
        "danger"
    );

    if (!confirmado) return;

    try {
        await deleteRuta(id);
        notificarExito('Ruta eliminada correctamente');
        cargarDatos();
        if (editando) handleCerrarModal();
    } catch (e) {
        notificarError('No se pudo eliminar la ruta.');
    }
  };

  const rutasFiltradas = rutas.filter(r => 
      r.nombreRuta.toLowerCase().includes(busqueda.toLowerCase()) ||
      r.origen?.ciudad.toLowerCase().includes(busqueda.toLowerCase()) ||
      r.destino?.ciudad.toLowerCase().includes(busqueda.toLowerCase()) ||
      obtenerNombreRioRuta(r, '').toLowerCase().includes(busqueda.toLowerCase())
  );

  const indexOfLastItem = currentPage * itemsPerPage;
  const indexOfFirstItem = indexOfLastItem - itemsPerPage;
  const currentItems = rutasFiltradas.slice(indexOfFirstItem, indexOfLastItem);
  const totalPages = Math.ceil(rutasFiltradas.length / itemsPerPage);
  const paginate = (pageNumber: number) => setCurrentPage(pageNumber);

  return (
    <MainLayout>
      <RouteDetailDrawer 
        isOpen={!!rutaDetalle} 
        ruta={rutaDetalle} 
        onClose={() => setRutaDetalle(null)} 
      />

      <div className="max-w-7xl mx-auto pb-3 relative">
        
        {/* HEADER CON BOTÓN NUEVA RUTA */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 mb-8 flex flex-col md:flex-row md:items-center justify-between gap-4 animate-in slide-in-from-top-4">
            <div className="flex items-center gap-4">
                <div className="p-3 bg-blue-50 rounded-xl text-[#1ABB9C]"><MapIcon size={28} /></div>
                <div>
                    <h1 className="text-2xl font-bold text-[#2A3F54]">Gestión de Rutas y Tarifas</h1>
                    <p className="text-sm text-gray-400 mt-1">Configura trayectos, escalas y tarifas de pasajes.</p>
                </div>
            </div>
            
            <div className="flex flex-col sm:flex-row items-center gap-3 w-full md:w-auto">
                <div className="relative group w-full sm:w-72">
                    <Search className="absolute left-3 top-3 text-gray-400" size={18} />
                    <input 
                        type="text" 
                        placeholder="Buscar ruta o río..." 
                        value={busqueda} 
                        onChange={(e) => setBusqueda(e.target.value)} 
                        className="pl-10 pr-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm w-full focus:outline-none focus:border-[#1ABB9C] transition-colors"
                    />
                </div>
                <button 
                    onClick={abrirModalNuevo}
                    className="w-full sm:w-auto flex items-center justify-center gap-2 bg-[#2A3F54] hover:bg-[#1f2f3f] text-white px-5 py-2.5 rounded-xl font-bold text-sm shadow-md transition-transform hover:scale-105 active:scale-95"
                >
                    <Plus size={18} /> Nueva Ruta
                </button>
            </div>
        </div>

        {/* TABLA DE RUTAS */}
        <div className="bg-white rounded-2xl shadow-xl border border-gray-100 overflow-hidden flex flex-col max-h-[calc(100vh-220px)] h-fit animate-in fade-in duration-500">
            <div className="bg-[#2A3F54] border-b border-gray-100 px-6 py-4 flex justify-between items-center shrink-0">
                <h3 className="font-bold text-white flex items-center gap-2">
                    <div className="bg-white p-1.5 rounded-md shadow-sm text-[#1ABB9C]"><List size={14} /></div> 
                    Rutas Activas <span className="text-white text-xs font-normal">({rutasFiltradas.length} encontradas)</span>
                </h3>
            </div>

            {loading ? (
                <div className="flex-1 flex justify-center items-center p-12">
                    <Loader className="animate-spin text-[#1ABB9C]" size={40}/>
                </div>
            ) : rutasFiltradas.length === 0 ? (
                <div className="flex-1 flex flex-col items-center justify-center text-center p-12">
                    <div className="bg-gray-50 p-6 rounded-full mb-4 border border-gray-100">
                        <MapIcon size={48} className="text-gray-300" />
                    </div>
                    <h4 className="text-gray-600 font-bold text-lg">No se encontraron rutas</h4>
                    <p className="text-gray-400 text-sm mt-1 max-w-xs">Intenta con otro término de búsqueda o crea una nueva ruta.</p>
                </div>
            ) : (
                <div className="overflow-auto flex-1 custom-scrollbar">
                    <table className="w-full text-sm text-left">
                        <thead className="bg-gray-50/80 text-gray-500 font-bold uppercase text-[10px] tracking-wider border-b border-gray-100 sticky top-0 z-10 backdrop-blur-md">
                            <tr>
                                <th className="px-6 py-4 w-[50px] text-center text-[#1ABB9C]">N°</th>
                                <th className="px-6 py-4 min-w-[200px]">Ruta</th>
                                <th className="px-6 py-4 min-w-[150px]">Río/Cuenca</th>
                                <th className="px-6 py-4 w-[15%] text-center">Estado</th>
                                <th className="px-6 py-4 min-w-[150px] text-center">Acciones</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-50">
                            {currentItems.map((r, index) => (
                                <tr key={r.idRuta} className={`hover:bg-blue-300/15 transition-colors group ${r.estado === 'INACTIVO' ? 'opacity-60 bg-gray-50' : ''}`}>
                                    <td className="px-6 py-4 text-center font-bold text-gray-400 text-xs">{(currentPage - 1) * itemsPerPage + index + 1}</td>
                                    
                                    <td className="px-6 py-4">
                                        <div className="font-bold text-[#2A3F54] text-base group-hover:text-blue-600 transition-colors">{r.nombreRuta}</div>
                                        <div className="flex items-center gap-1 text-[10px] text-gray-500 mt-1 font-mono bg-gray-100 w-fit px-2 py-0.5 rounded border border-gray-200">
                                            <span>{r.origen?.ciudad}</span><ArrowRight size={10} className="text-[#1ABB9C]"/><span>{r.destino?.ciudad}</span>
                                        </div>
                                    </td>

                                    <td className="px-6 py-4">
                                        <div className="flex items-center gap-1.5 text-xs font-bold text-blue-600 bg-blue-50 border border-blue-100 w-fit px-2 py-1 rounded-md">
                                            <Waves size={12}/> {obtenerNombreRioRuta(r)}
                                        </div>
                                    </td>
                                    
                                    <td className="px-6 py-4 text-center">
                                        <div className="flex items-center justify-center gap-3">
                                            <span className={`px-3 py-1 rounded-full text-[10px] font-bold border ${r.estado === 'ACTIVO' ? 'bg-green-50 text-green-600 border-green-200' : 'bg-gray-100 text-gray-500 border-gray-200'}`}>
                                                {r.estado}
                                            </span>
                                            <button 
                                                onClick={() => toggleEstado(r)} 
                                                title={r.estado === 'ACTIVO' ? "Desactivar Ruta" : "Activar Ruta"} 
                                                className="transition-transform hover:scale-110 focus:outline-none"
                                            >
                                                {r.estado === 'ACTIVO'
                                                    ? <ToggleRight size={28} className="text-[#1ABB9C] cursor-pointer"/> 
                                                    : <ToggleLeft size={28} className="text-gray-300 cursor-pointer"/>}
                                            </button>
                                        </div>
                                    </td>
                                    
                                    <td className="px-6 py-4 text-right">
                                        <div className="flex justify-center gap-2">
                                            <button 
                                                onClick={() => setRutaDetalle(r)} 
                                                className="flex items-center gap-1 bg-blue-50 text-blue-600 border border-blue-100 px-3 py-1.5 rounded-lg hover:bg-blue-100 hover:border-blue-200 transition-colors text-xs font-bold shadow-sm"
                                            >
                                                <Eye size={14}/> Ver Detalle
                                            </button>
                                            <button 
                                                onClick={() => editar(r)} 
                                                className="flex items-center gap-1 bg-white border border-gray-200 text-gray-500 hover:border-blue-300 hover:bg-blue-50 hover:text-blue-600 px-3 py-1.5 rounded-lg transition-colors text-xs font-bold shadow-sm"
                                            >
                                                <Edit size={14}/> Editar
                                            </button>
                                            <button 
                                                onClick={() => handleEliminar(r.idRuta)} 
                                                className="flex items-center gap-1 bg-white border border-gray-200 text-gray-500 hover:border-red-300 hover:bg-red-50 hover:text-red-600 px-3 py-1.5 rounded-lg transition-colors text-xs font-bold shadow-sm"
                                                title="Eliminar Ruta"
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
            
            <div className="border-t border-gray-100 p-4 bg-gray-50/80 flex justify-between items-center shrink-0">
                <span className="text-xs text-gray-500 font-medium bg-white px-3 py-1 rounded-full border border-gray-200 shadow-sm">
                    Mostrando <span className="text-[#2A3F54] font-bold">{rutasFiltradas.length > 0 ? indexOfFirstItem + 1 : 0}-{Math.min(indexOfLastItem, rutasFiltradas.length)}
                    </span> de {rutasFiltradas.length}</span>
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

        {/* MODAL DE CREACIÓN / EDITAR DE RUTAS */}
        {isModalOpen && (
            <div className="fixed inset-0 z-50 flex items-start md:items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4 animate-in fade-in duration-200 overflow-y-auto">
                <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl flex flex-col overflow-hidden animate-in zoom-in-95 duration-200 my-auto md:max-h-[90vh]">
                    
                    {/* Cabecera del Modal */}
                    <div className={`p-5 flex justify-between items-center shrink-0 ${editando ? 'bg-gradient-to-r from-blue-600 to-blue-500' : 'bg-gradient-to-r from-[#2A3F54] to-[#3E5367]'}`}>
                        <h3 className="font-bold text-white text-lg flex items-center gap-2">
                            {editando ? <Edit size={20} className="text-white"/> : <Plus size={20} className="text-[#1ABB9C]"/>} 
                            {editando ? 'Editar Ruta' : 'Nueva Ruta'}
                        </h3>
                        <button onClick={handleCerrarModal} className="text-white/70 hover:text-white bg-white/10 hover:bg-white/20 p-1 rounded-lg transition-colors">
                            <X size={20} />
                        </button>
                    </div>

                    {/* Cuerpo del Modal (Scrollable) */}
                    <div className="overflow-y-auto p-6 flex-1 custom-scrollbar">
                        <form id="formRuta" onSubmit={handleSubmit(onSubmit, onError)} className="space-y-5">
                            <input type="hidden" {...register('idRuta')} /><input type="hidden" {...register('estado')} />
                            <div className="space-y-4">

                                <div className="group bg-blue-50/50 p-4 rounded-xl border border-blue-100">
                                    <label className="text-xs font-bold text-blue-800 uppercase mb-1.5 flex items-center gap-1">
                                        <Waves size={14}/> Seleccionar Cuenca / Río
                                    </label>
                                    <select 
                                        value={rioSeleccionado}
                                        onChange={(e) => setRioSeleccionado(e.target.value)}
                                        className="w-full bg-white border border-blue-200 p-3 rounded-xl text-sm outline-none focus:border-blue-500 font-bold text-blue-900 cursor-pointer shadow-sm"
                                        required
                                    >
                                        <option value="">-- Elija el río de la ruta --</option>
                                        {rios.map(r => (
                                            <option key={r.idRio} value={r.idRio}>{r.nombreRio}</option>
                                        ))}
                                    </select>
                                    {!rioSeleccionado && (
                                        <p className="text-[10px] text-blue-500 mt-2 font-medium">Debe seleccionar un río para ver los puertos disponibles.</p>
                                    )}
                                </div>

                                <div className="grid grid-cols-2 gap-4">
                                    <div className="group">
                                        <label className="text-xs font-bold text-gray-500 uppercase mb-1.5 flex items-center gap-1"><RouteIcon size={12}/> Origen</label>
                                        <select 
                                            {...register('origenId', {required: 'Campo requerido'})} 
                                            disabled={!rioSeleccionado}
                                            className="w-full bg-white border border-gray-200 p-3 rounded-xl text-sm outline-none focus:border-[#1ABB9C] disabled:opacity-50 disabled:bg-gray-100"
                                        >
                                            <option value="">Seleccionar...</option>
                                            {puertos.filter(p => p.estado === 'ACTIVO').map(p => (
                                                <option key={p.idPuerto} value={p.idPuerto} disabled={String(p.idPuerto) === destinoSel}>
                                                    {p.ciudad} ({p.nombrePuerto})
                                                </option>
                                            ))}
                                        </select>
                                        {errors.origenId && <span className="text-red-500 text-xs flex items-center gap-1 mt-1"><AlertCircle size={10}/> {String(errors.origenId.message || 'Campo requerido')}</span>}
                                    </div>

                                    <div className="group">
                                        <label className="text-xs font-bold text-gray-500 uppercase mb-1.5 flex items-center gap-1"><RouteIcon size={12}/> Destino</label>
                                        <select 
                                            {...register('destinoId', {required: 'Campo requerido'})} 
                                            disabled={!rioSeleccionado}
                                            className="w-full bg-white border border-gray-200 p-3 rounded-xl text-sm outline-none focus:border-[#1ABB9C] disabled:opacity-50 disabled:bg-gray-100"
                                        >
                                            <option value="">Seleccionar...</option>
                                            {puertos.filter(p => p.estado === 'ACTIVO').map(p => (
                                                <option key={p.idPuerto} value={p.idPuerto} disabled={String(p.idPuerto) === origenSel}>
                                                    {p.ciudad} ({p.nombrePuerto})
                                                </option>
                                            ))}
                                        </select>
                                        {errors.destinoId && <span className="text-red-500 text-xs flex items-center gap-1 mt-1"><AlertCircle size={10}/> {String(errors.destinoId.message || 'Campo requerido')}</span>}
                                    </div>
                                </div>
                            </div>

                            <div className={`bg-orange-50/50 p-4 rounded-xl border border-orange-100 transition-opacity ${!rioSeleccionado ? 'opacity-50 pointer-events-none' : ''}`}>
                                <div className="flex justify-between items-center mb-1">
                                    <label className="text-xs font-bold text-orange-800 uppercase flex items-center gap-1"><MapPin size={12}/> Escalas</label>
                                    <button type="button" disabled={!rioSeleccionado} onClick={() => agregarEscala({ puertoId: '', hora: '', minuto: '', ampm: 'AM' })} className="text-[10px] bg-white text-orange-600 px-3 py-1.5 rounded-lg border border-orange-200 hover:bg-orange-100 flex items-center gap-1 font-bold transition-colors shadow-sm disabled:opacity-50"><Plus size={12}/> Agregar</button>
                                </div>
                                
                                {/* Encabezados solo en pantallas desktop/tablet */}
                                {camposEscalas.length > 0 && (
                                    <div className="hidden sm:flex gap-2 px-1 mb-2 mt-2">
                                        <div className="w-5"></div>
                                        <div className="flex-1 text-[10px] font-bold text-orange-600 uppercase tracking-wider pl-1">Puerto de Escala</div>
                                        <div className="w-[140px] text-[10px] font-bold text-orange-600 uppercase tracking-wider text-center">Hora Embarque</div>
                                        <div className="w-7"></div>
                                    </div>
                                )}

                                <div className="space-y-2 mt-2">
                                    {camposEscalas.map((item, index) => {
                                        const errorPuerto = errors?.escalasIntermedias?.[index]?.puertoId;
                                        const errorHora = errors?.escalasIntermedias?.[index]?.hora;
                                        const errorMinuto = errors?.escalasIntermedias?.[index]?.minuto;

                                        return (
                                        <div key={item.id} className="flex flex-col sm:flex-row gap-2 sm:items-center animate-in slide-in-from-left-2 duration-200 bg-white sm:bg-transparent p-3 sm:p-0 rounded-xl sm:rounded-none border border-orange-100 sm:border-none shadow-sm sm:shadow-none mb-2 sm:mb-0">
                                            
                                            {/* Cabecera Móvil */}
                                            <div className="flex sm:hidden justify-between items-center mb-1">
                                                <span className="text-[10px] font-bold text-orange-600 uppercase tracking-wider flex items-center gap-1">
                                                    <span className="text-[10px] font-bold text-orange-400 bg-orange-50 w-5 h-5 flex items-center justify-center rounded-full border border-orange-100">{index + 1}</span>
                                                    Escala
                                                </span>
                                                <button type="button" onClick={() => quitarEscala(index)} className="p-1.5 shrink-0 text-red-400 hover:text-red-500 hover:bg-red-50 rounded transition-colors">
                                                    <Trash2 size={14}/>
                                                </button>
                                            </div>

                                            {/* Selector de Puerto */}
                                            <div className="flex items-center gap-2 flex-1">
                                                <span className="hidden sm:flex text-[10px] font-bold text-orange-400 bg-white w-5 h-5 shrink-0 items-center justify-center rounded-full border border-orange-100">{index + 1}</span>
                                                
                                                <select 
                                                    {...register(`escalasIntermedias.${index}.puertoId` as const, {required: true})} 
                                                    className={`w-full sm:flex-1 min-w-0 border ${errorPuerto ? 'border-red-400 bg-red-50' : 'border-gray-200'} p-2 text-xs rounded-lg focus:border-orange-400 outline-none bg-white`}
                                                >
                                                    <option value="">-- Parada --</option>
                                                    {getPuertosDisponibles(index).map(p => (<option key={p.idPuerto} value={p.idPuerto}>{p.ciudad} - ( {p.nombrePuerto} )</option>))}
                                                </select>
                                            </div>

                                            {/* Controles de Hora y Botón Borrar (Desktop) */}
                                            <div className="flex items-center justify-between sm:justify-start gap-2 mt-2 sm:mt-0">
                                                <span className="sm:hidden text-[10px] font-bold text-orange-600 uppercase tracking-wider">Hora:</span>
                                                <div className={`flex items-center justify-center gap-1 flex-1 sm:flex-none sm:w-[140px] shrink-0 bg-white border ${errorHora || errorMinuto ? 'border-red-400 bg-red-50' : 'border-gray-200'} rounded-lg p-1 focus-within:border-orange-400 transition-colors`}>
                                                    <select 
                                                        {...register(`escalasIntermedias.${index}.hora` as const, {required: true})} 
                                                        className="w-10 text-xs font-bold text-gray-600 bg-transparent outline-none appearance-none text-center cursor-pointer"
                                                    >
                                                        <option value="">--</option>
                                                        {Array.from({length: 12}, (_, i) => i + 1).map(h => (
                                                            <option key={h} value={h.toString().padStart(2, '0')}>{h.toString().padStart(2, '0')}</option>
                                                        ))}
                                                    </select>
                                                    <span className="text-gray-400 font-bold">:</span>
                                                    <select 
                                                        {...register(`escalasIntermedias.${index}.minuto` as const, {required: true})} 
                                                        className="w-10 text-xs font-bold text-gray-600 bg-transparent outline-none appearance-none text-center cursor-pointer"
                                                    >
                                                        <option value="">--</option>
                                                        {['00', '05', '10', '15', '20', '25', '30', '35', '40', '45', '50', '55'].map(m => (
                                                            <option key={m} value={m}>{m}</option>
                                                        ))}
                                                    </select>
                                                    <select {...register(`escalasIntermedias.${index}.ampm` as const)} className="w-12 text-xs font-bold text-orange-600 bg-orange-50 rounded outline-none cursor-pointer">
                                                        <option value="AM">AM</option>
                                                        <option value="PM">PM</option>
                                                    </select>
                                                </div>
                                                <button type="button" onClick={() => quitarEscala(index)} className="hidden sm:block p-1.5 shrink-0 text-red-300 hover:text-red-500 hover:bg-red-50 rounded transition-colors">
                                                    <Trash2 size={14}/>
                                                </button>
                                            </div>
                                        </div>
                                        )
                                    })}
                                    {camposEscalas.length === 0 && <div className="text-center p-3 border border-dashed border-orange-200 rounded-lg bg-white/50"><p className="text-[10px] text-orange-400 italic">Ruta Directa</p></div>}
                                </div>
                            </div>

                            {matrizPrecios.length > 0 && (
                                <div className="bg-green-50/50 p-4 rounded-xl border border-green-100 animate-in fade-in zoom-in duration-300">
                                    <label className="text-xs font-bold text-green-800 uppercase block mb-3 flex items-center gap-1"><DollarSign size={12}/> Tarifas (S/)</label>
                                    <div className="max-h-60 overflow-y-auto pr-1 space-y-2 custom-scrollbar">
                                        {matrizPrecios.map((tramo, idx) => {
                                            const fieldName = `precio_${tramo.origenId}_${tramo.destinoId}`;
                                            const hasError = (errors as any)[fieldName];
                                            
                                            return (
                                            <div key={idx} className={`flex justify-between items-center bg-white p-3 rounded-xl border shadow-sm ${hasError ? 'border-red-300 bg-red-50/30' : 'border-green-100'}`}>
                                                <div className="flex-1 min-w-0 flex items-center gap-2 text-xs text-gray-700 font-bold">
                                                    <span className="truncate">{tramo.origenNombre}</span>
                                                    <ArrowRight size={12} className="text-[#1ABB9C] shrink-0"/>
                                                    <span className="truncate">{tramo.destinoNombre}</span>
                                                </div>
                                                <div className={`flex items-center w-24 bg-white rounded-lg px-2 border ${hasError ? 'border-red-400 ring-1 ring-red-400' : 'border-gray-200 focus-within:border-[#1ABB9C] focus-within:ring-1 focus-within:ring-[#1ABB9C]'}`}>
                                                    <span className={`text-xs mr-1 font-bold ${hasError ? 'text-red-400' : 'text-gray-400'}`}>S/</span>
                                                    <input 
                                                        {...register(fieldName as any, { 
                                                            required: true,
                                                            min: 0 
                                                        })} 
                                                        type="number" 
                                                        step="0.50" 
                                                        min="0"
                                                        onKeyPress={(e) => {
                                                            if (e.key === '-' || e.key === 'e' || e.key === 'E') {
                                                                e.preventDefault();
                                                            }
                                                        }}
                                                        className={`w-full bg-transparent border-none text-right font-black outline-none text-sm py-1.5 ${hasError ? 'text-red-600 placeholder-red-300' : 'text-gray-700'}`} 
                                                        placeholder="0.00"
                                                    />
                                                </div>
                                            </div>
                                        )})}
                                    </div>
                                </div>
                            )}
                        </form>
                    </div>
                    
                    {/* Footer del Modal */}
                    <div className="p-5 border-t border-gray-100 bg-gray-50 flex items-center gap-3 shrink-0">
                        <button type="button" onClick={handleCerrarModal} className="w-1/3 bg-white border border-gray-200 text-gray-600 py-2.5 rounded-xl text-sm font-bold hover:bg-gray-100 transition-colors">
                            Cancelar
                        </button>
                        <button type="submit" form="formRuta" disabled={isSubmitting || !rioSeleccionado} className={`w-2/3 text-white py-2.5 rounded-xl text-sm font-bold transition-all shadow-md hover:shadow-lg flex justify-center items-center gap-2 ${!rioSeleccionado ? 'opacity-50 cursor-not-allowed bg-gray-400' : editando ? 'bg-blue-600 hover:bg-blue-700' : 'bg-[#1ABB9C] hover:bg-[#16a085]'}`}>
                            {isSubmitting ? <Loader className="animate-spin" size={18}/> : <Save size={18}/>} 
                            {editando ? 'Guardar Cambios' : 'Crear Ruta'}
                        </button>
                    </div>
                </div>
            </div>
        )}
      </div>
    </MainLayout>
  );
};

export default RutasPage;
