import React, { useState, useEffect } from 'react';
import { useForm, useFieldArray } from 'react-hook-form';
import { yupResolver } from '@hookform/resolvers/yup';
import * as yup from 'yup';
import MainLayout from '../../layouts/MainLayout';
import SeatMapVertical from '../../components/SeatMapVertical';
import ModalPagoPOS from '../../components/ModalPagoPOS';
import type { DatosPago } from '../../components/ModalPagoPOS';
import ModalTicket from '../../components/ModalTicket';
import api from '../../services/api';
import { getViajesProgramados,getEscalasPorRuta,getTarifa,getRutas,getEmbarcaciones
} from '../../services/configService';
import { getMapaAsientos } from '../../services/ventaService';
import {
    Loader,MapPin,Anchor,Ticket,Calendar,Ship,AlertCircle,Trash2,Users,
    User,Globe,Phone,CreditCard,ChevronDown,ArrowRight, FormIcon, RefreshCw
} from 'lucide-react';
import {
    notificarError,notificarExito,notificarCarga,cerrarNotificacion
} from '../../services/feedbackService';
import { getCurrentUser } from '../../services/authService';

const soloLetrasRegex = /^[A-Za-zÑñÁáÉéÍíÓóÚúÜü\s]+$/;

const pasajeroSchema = yup.object({
    numeroAsiento: yup.string().required(),
    precio: yup.number().required(),
    tipoDocumento: yup.string().required('Seleccione doc.'),

    numeroDocumento: yup.string().when('tipoDocumento', ([tipo], schema) => {
        if (tipo === 'DNI') return schema.required('Campo Obligatorio').matches(/^\d{8}$/, 'Debe tener 8 dígitos');
        if (tipo === 'CARNET_EXTRANJERIA') return schema.required('Campo Obligatorio').matches(/^\d{9}$/, 'Debe tener 9 dígitos');
        return schema.required('Campo Obligatorio').matches(/^[A-Za-z0-9]{5,15}$/, 'Alfanumérico (5-15)');
    }),

    nombres: yup.string().required('Campo Obligatorio').min(2, 'Corto').matches(soloLetrasRegex, 'Solo letras'),
    apellidoPaterno: yup.string().required('Campo Obligatorio').min(2, 'Corto').matches(soloLetrasRegex, 'Solo letras'),
    apellidoMaterno: yup.string().required('Campo Obligatorio').min(2, 'Corto').matches(soloLetrasRegex, 'Solo letras'),

    fechaNacimiento: yup.string().required('Campo Obligatorio').test('fecha-pasada', 'Fecha inválida', (value) => {
        if (!value) return false;
        const hoy = new Date(); hoy.setHours(0, 0, 0, 0);
        return new Date(value) <= hoy;
    }),

    nacionalidad: yup.string().required('Campo Obligatorio'),

    telefono: yup.string().nullable().transform((v, o) => o === '' ? null : v)
        .matches(/^\d{9}$/, { message: '9 dígitos', excludeEmptyString: true })
});

const ventaGrupalSchema = yup.object({
    pasajeros: yup.array().of(pasajeroSchema).min(1, 'Seleccione al menos un asiento')
});

const NACIONALIDADES = [
    "PERUANA",
    "ALEMANA", "ARGENTINA", "AUSTRALIANA", "BOLIVIANA", "BRASILEÑA",
    "BRITÁNICA", "CANADIENSE", "CHILENA", "CHINA", "COLOMBIANA",
    "COSTARRICENSE", "CUBANA", "ECUATORIANA", "ESPAÑOLA", "ESTADOUNIDENSE",
    "FRANCESA", "HOLANDESA", "ISRAELÍ", "ITALIANA", "JAPONESA",
    "MEXICANA", "PANAMEÑA", "PARAGUAYA", "PORTUGUESA", "SUECA",
    "SUIZA", "SURCOREANA", "URUGUAYA", "VENEZOLANA"
];

const calcularFechaEscalaVenta = (fechaSalidaViaje: string, puertosRuta: any[], origenId: string) => {
    if (!fechaSalidaViaje || !puertosRuta || puertosRuta.length === 0) return fechaSalidaViaje;

    let fechaActual = new Date(`${fechaSalidaViaje}T00:00:00`);
    let horaAnterior = puertosRuta[0]?.horaEmbarque || "00:00:00";

    for (const puerto of puertosRuta) {
        const horaActual = puerto.horaEmbarque;
        if (horaActual && horaActual < horaAnterior) {
            fechaActual.setDate(fechaActual.getDate() + 1);
        }
        if (horaActual) {
            horaAnterior = horaActual;
        }

        if (String(puerto.idPuerto) === String(origenId)) {
            break;
        }
    }

    const year = fechaActual.getFullYear();
    const month = String(fechaActual.getMonth() + 1).padStart(2, '0');
    const day = String(fechaActual.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
};

const VentaPage = () => {
    const [viajes, setViajes] = useState<any[]>([]);
    const [puertosRuta, setPuertosRuta] = useState<any[]>([]);
    const [rutasTotales, setRutasTotales] = useState<any[]>([]);
    const [flotaTotal, setFlotaTotal] = useState<any[]>([]);

    const [viajeSeleccionado, setViajeSeleccionado] = useState<any>(null);
    const [origenId, setOrigenId] = useState<string>('');
    const [destinoId, setDestinoId] = useState<string>('');

    const [mapaEstados, setMapaEstados] = useState<Record<string, string>>({});
    const [loadingMapa, setLoadingMapa] = useState(false);
    const [precioTramo, setPrecioTramo] = useState<number>(0);
    
    const [isRefreshingViajes, setIsRefreshingViajes] = useState(false);

    const [mostrarModalPago, setMostrarModalPago] = useState(false);
    const [ticketData, setTicketData] = useState<{ venta: any, pago: any } | null>(null);

    const {
        register,
        control,
        handleSubmit,
        setValue,
        getValues,
        watch,
        formState: { errors }
    } = useForm({
        resolver: yupResolver(ventaGrupalSchema),
        defaultValues: { pasajeros: [] }
    });

    const { fields, append, remove } = useFieldArray({
        control,
        name: "pasajeros"
    });

    const pasajerosWatch = (watch("pasajeros") || []) as any[];
    const totalCarrito = pasajerosWatch.reduce((sum, item) => sum + (item?.precio || 0), 0);

    const formatearFecha = (fecha: string) => {
        if (!fecha) return '';
        const partes = fecha.split('-');
        return partes.length === 3 ? `${partes[2]}/${partes[1]}/${partes[0]}` : fecha;
    };

    const formatearHora = (hora: string) => {
        if (!hora) return '';
        const partes = hora.split(':');
        if (partes.length >= 2) {
            let h = parseInt(partes[0], 10);
            const m = partes[1];
            const ampm = h >= 12 ? 'PM' : 'AM';
            h = h % 12 || 12;
            return `${h}:${m} ${ampm}`;
        }
        return hora;
    };

    const getInputClass = (error: any) =>
        `w-full rounded-lg px-3.5 py-2.5 text-sm transition-all duration-200 outline-none border uppercase ${
            error
                ? 'border-red-300 bg-red-50/50 text-red-900 placeholder-red-300 focus:border-red-500 focus:ring-2 focus:ring-red-500/20'
                : 'border-slate-200 bg-slate-50/50 text-slate-800 placeholder-slate-400 focus:border-[#1ABB9C] focus:bg-white focus:ring-2 focus:ring-[#1ABB9C]/15 hover:border-slate-300'
        }`;

    const cargarViajesDisponibles = async () => {
        setIsRefreshingViajes(true);
        try {
            const data = await getViajesProgramados();
            const hoy = new Date(); hoy.setHours(0, 0, 0, 0);
            setViajes(data.filter(v =>
                v.estado === 'PROGRAMADO' &&
                (!v.fechaSalida || new Date(v.fechaSalida + 'T00:00:00') >= hoy)
            ));
        } catch (error) {
            setViajes([]);
        } finally {
            setIsRefreshingViajes(false);
        }
    };

    useEffect(() => {
        cargarViajesDisponibles();
        getRutas().then(setRutasTotales);
        getEmbarcaciones().then(setFlotaTotal);
    }, []);

    const handleViajeChange = async (idViaje: string) => {
        if (!idViaje) {
            setViajeSeleccionado(null);
            setPuertosRuta([]);
            return;
        }

        const v = viajes.find(viaje => viaje.idViaje === parseInt(idViaje));
        setViajeSeleccionado(v);
        setOrigenId('');
        setDestinoId('');
        setMapaEstados({});
        setPrecioTramo(0);
        remove();
        setPuertosRuta([]);

        if (v) {
            setLoadingMapa(true);
            try {
                const rutaCompleta = rutasTotales.find(r => r.idRuta === v.idRuta);
                if (!rutaCompleta) return;

                const escalas = await getEscalasPorRuta(v.idRuta);

                const listaPuertos = escalas.map((e: any) => ({
                    ...e.puerto,
                    horaEmbarque: e.horaEmbarque || e.hora_embarque 
                }));

                if (listaPuertos.length === 0) {
                    listaPuertos.push({ ...rutaCompleta.origen, horaEmbarque: v.horaZarpe });
                    listaPuertos.push(rutaCompleta.destino);
                } else {
                    if (!listaPuertos.find((p: any) => p.idPuerto === rutaCompleta.origen.idPuerto)) {
                        listaPuertos.unshift({ ...rutaCompleta.origen, horaEmbarque: v.horaZarpe });
                    }
                    if (!listaPuertos.find((p: any) => p.idPuerto === rutaCompleta.destino.idPuerto)) {
                        listaPuertos.push(rutaCompleta.destino);
                    }
                }
                setPuertosRuta(listaPuertos);
            } catch {
                notificarError("Error cargando los puertos");
            } finally {
                setLoadingMapa(false);
            }
        }
    };

    useEffect(() => {
        if (viajeSeleccionado && origenId && destinoId) {
            if (origenId === destinoId) {
                notificarError("El origen y destino no pueden ser iguales");
                setPrecioTramo(0);
                return;
            }
            cargarDatosDeVenta();
            remove();
        } else {
            setMapaEstados({});
            setPrecioTramo(0);
        }
    }, [viajeSeleccionado, origenId, destinoId]);

    const cargarDatosDeVenta = async () => {
        setLoadingMapa(true);
        try {
            const mapa = await getMapaAsientos(
                viajeSeleccionado.idViaje,
                parseInt(origenId),
                parseInt(destinoId)
            );
            setMapaEstados(mapa);
            
            let idRutaReal = viajeSeleccionado?.idRuta 
                          || viajeSeleccionado?.ruta?.idRuta 
                          || viajeSeleccionado?.rutaId; 

            if (!idRutaReal) {
                notificarError("Error: El viaje seleccionado no tiene una ruta válida asignada.");
                setPrecioTramo(0);
                return;
            }

            const tarifa = await getTarifa(idRutaReal, parseInt(origenId), parseInt(destinoId));
            setPrecioTramo(tarifa?.precio || 0);

        } catch (error) {
            setMapaEstados({});
            setPrecioTramo(0);
        } finally {
            setLoadingMapa(false);
        }
    };

    const handleAsientoClick = (asientoStr: string) => {
        if (precioTramo <= 0) return notificarError("⚠️ Tarifa no configurada para este tramo.");
        if (mapaEstados[asientoStr] === 'VENDIDO') return notificarError(`Asiento ${asientoStr} vendido.`);

        const index = fields.findIndex(f => f.numeroAsiento === asientoStr);
        
        if (index !== -1) {
            remove(index);
        } else {
            const pasajerosActuales = getValues("pasajeros") || [];
            const indexSinAsiento = pasajerosActuales.findIndex(p => p.numeroAsiento === '');
            
            if (indexSinAsiento !== -1) {
                setValue(`pasajeros.${indexSinAsiento}.numeroAsiento`, asientoStr, { shouldValidate: true });
                notificarExito(`Asiento ${asientoStr} reasignado al Pasajero ${indexSinAsiento + 1}`);
            } else {
                append({
                    numeroAsiento: asientoStr,
                    precio: precioTramo,
                    tipoDocumento: 'DNI',
                    numeroDocumento: '',
                    nombres: '',
                    apellidoPaterno: '',
                    apellidoMaterno: '',
                    fechaNacimiento: '',
                    nacionalidad: 'PERUANA',
                    telefono: ''
                });
            }
        }
    };

    const buscarPasajero = async (index: number, docAlterno?: string) => {
        const documento = docAlterno || pasajerosWatch[index]?.numeroDocumento;
        if (documento && documento.length >= 8) {
            try {
                const res = await api.get(`/pasajeros/documento/${documento}`);
                if (res.data) {
                    setValue(`pasajeros.${index}.nombres`, res.data.nombres?.toUpperCase(), { shouldValidate: true });
                    setValue(`pasajeros.${index}.apellidoPaterno`, res.data.apellidoPaterno?.toUpperCase(), { shouldValidate: true });
                    setValue(`pasajeros.${index}.apellidoMaterno`, res.data.apellidoMaterno?.toUpperCase(), { shouldValidate: true });
                    if (res.data.fechaNacimiento)
                        setValue(`pasajeros.${index}.fechaNacimiento`, res.data.fechaNacimiento.split('T')[0], { shouldValidate: true });
                    if (res.data.nacionalidad)
                        setValue(`pasajeros.${index}.nacionalidad`, res.data.nacionalidad?.toUpperCase(), { shouldValidate: true });
                    if (res.data.telefono)
                        setValue(`pasajeros.${index}.telefono`, res.data.telefono, { shouldValidate: true });
                    
                    notificarExito(`Pasajero autocompletado en el asiento ${pasajerosWatch[index].numeroAsiento}`);
                }
            } catch {
            }
        }
    };

    const onValidarFormulario = () => {
        const idTurno = localStorage.getItem('idTurnoCajaAbierta');
        if (!idTurno) return notificarError("Debe aperturar su caja antes de vender.");
        
        // Verificamos que no intenten pagar si tienen un pasajero sin asiento
        const haySinAsiento = pasajerosWatch.some(p => p.numeroAsiento === '');
        if (haySinAsiento) {
            return notificarError("Hay pasajeros sin asiento asignado. Por favor, seleccione asientos libres en el mapa.");
        }
        
        setMostrarModalPago(true);
    };

    const procesarPagoGrupal = async (datosPago: DatosPago) => {
        const idTurno = localStorage.getItem('idTurnoCajaAbierta');
        const toastId = notificarCarga("Procesando venta grupal...");

        try {
            const pasajesPayload = pasajerosWatch.map(p => ({
                tipoDocumento: p.tipoDocumento,
                numeroDocumento: p.numeroDocumento,
                nombres: p.nombres,
                apellidoPaterno: p.apellidoPaterno,
                apellidoMaterno: p.apellidoMaterno,
                fechaNacimiento: p.fechaNacimiento,
                nacionalidad: p.nacionalidad,
                telefono: p.telefono,
                precio: p.precio,
                idPuertoOrigen: parseInt(origenId),
                idPuertoDestino: parseInt(destinoId),
                numeroAsientoTexto: p.numeroAsiento
            }));

            const payload = {
                idViaje: viajeSeleccionado.idViaje,
                idTurno: parseInt(idTurno as string),
                tipoComprobante: datosPago.tipoComprobante,
                documentoCliente: datosPago.documentoCliente,
                razonSocialNombre: datosPago.razonSocialNombre?.toUpperCase(),
                metodoPago: datosPago.metodo,
                montoRecibido: datosPago.montoRecibido,
                vuelto: datosPago.vuelto,
                referenciaPago: datosPago.referencia,
                pasajes: pasajesPayload
            };

            const response = await api.post('/ventas/grupal', payload);

            cerrarNotificacion(toastId);
            notificarExito("¡Venta completada con éxito!");
            setMostrarModalPago(false);

            const user: any = getCurrentUser();
            const puertoOrigenSeleccionado = puertosRuta.find(p => p.idPuerto == origenId);

            const fechaEmbarqueFinal = calcularFechaEscalaVenta(viajeSeleccionado.fechaSalida, puertosRuta, origenId);

            setTicketData({
                venta: {
                    serie: response.data.serie,
                    correlativo: response.data.correlativo,
                    fechaSalida: fechaEmbarqueFinal, 
                    nombrePuertoOrigen: puertoOrigenSeleccionado?.nombrePuerto, 
                    direccionEmbarque: puertoOrigenSeleccionado?.direccion,
                    horaEmbarqueElegida: puertoOrigenSeleccionado?.horaEmbarque,
                    origenNombre: puertosRuta.find(p => p.idPuerto == origenId)?.ciudad,
                    destinoNombre: puertosRuta.find(p => p.idPuerto == destinoId)?.ciudad,
                    montoFinal: response.data.total,
                    cajeroNombre: response.data.nombreVendedor || user?.nombreCompleto || 'Cajero Asesor',
                    detallesGrupal: pasajerosWatch
                },
                pago: datosPago
            });

            remove();
            cargarDatosDeVenta();
        } catch (error: any) {
            cerrarNotificacion(toastId);
            
            setMostrarModalPago(false);
            
            const msjError = error.response?.data?.mensaje || error.response?.data || "El asiento ya fue comprado. Verifique disponibilidad.";
            notificarError(msjError);

            getMapaAsientos(viajeSeleccionado.idViaje, parseInt(origenId), parseInt(destinoId))
                .then(mapaFresco => {
                    setMapaEstados(mapaFresco);
                    
                    const pasajerosActuales = getValues("pasajeros") || [];
                    
                    for (let i = pasajerosActuales.length - 1; i >= 0; i--) {
                        if (mapaFresco[pasajerosActuales[i].numeroAsiento] === 'VENDIDO') {
                            // SOLO LE QUITAMOS EL NUMERO DE ASIENTO, PERO CONSERVAMOS LOS DATOS DEL PASAJERO
                            setValue(`pasajeros.${i}.numeroAsiento`, '', { shouldValidate: true }); 
                        }
                    }
                })
                .catch(() => cargarDatosDeVenta()); 
        }
    };

    const naveCompleta = viajeSeleccionado
        ? flotaTotal.find(n => n.idEmbarcacion === viajeSeleccionado.idEmbarcacion)
        : null;

    const estadosVisuales = { ...mapaEstados };
    pasajerosWatch.forEach(c => { 
        if(c.numeroAsiento !== '') {
            estadosVisuales[c.numeroAsiento] = 'SELECCIONADO'; 
        }
    });

    return (
        <MainLayout>
            <div className="max-w-7xl mx-auto pb-6 pt-2 sm:pt-4 px-3 sm:px-6">

                {/* 1. HEADER Y SELECTORES (APILADOS ARRIBA) */}
                <div className="bg-white rounded-2xl shadow-sm border border-slate-200/80 p-4 sm:p-6 mb-6 animate-in slide-in-from-top-4">
                    
                    {/* Título y Tarifa global */}
                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-1 pb-5 border-b border-slate-100">
                        <div>
                            <h1 className="text-xl sm:text-2xl font-black text-[#2A3F54] flex items-center gap-3">
                                <div className="p-2 bg-blue-50 rounded-lg text-[#1ABB9C]"><Ticket size={20} /></div>
                                Punto de Venta
                            </h1>
                        </div>
                        <div className="flex items-center gap-4">
                            <div className={`flex items-center gap-3 sm:gap-2 px-2 sm:px-4 py-1.5 sm:py-2 rounded-xl shadow-sm transition-all duration-300 w-full sm:w-auto justify-between
                                ${precioTramo > 0 ? 'bg-[#2dae94] text-white shadow-lg' : 'bg-gray-50 border border-gray-200 text-gray-400'}`}>
                                <div className="text-left sm:text-right">
                                    <p className={`text-[8px] font-bold uppercase tracking-wider ${precioTramo > 0 ? 'text-white' : 'text-gray-400'}`}>
                                        Tarifa por Pasajero
                                    </p>
                                    {loadingMapa ? (
                                        <div className="h-3 w-20 bg-white/20 animate-pulse rounded mt-1"></div>
                                    ) : (
                                        <div className="flex items-baseline gap-1 sm:justify-end relative overflow-hidden">
                                            <span className="text-sm font-normal">S/</span>
                                            <span key={precioTramo} 
                                                  className={`text-xl sm:text-xl font-black transition-all duration-300 ease-out
                                                    ${precioTramo > 0 ? 'text-white' : 'text-gray-300'}
                                                  `}
                                            >
                                                {precioTramo > 0 ? precioTramo.toFixed(2) : '0.00'}
                                            </span>
                                        </div>
                                    )}
                                </div>
                                <div className={`p-2 rounded-full hidden sm:block ${precioTramo > 0 ? 'bg-white/20 text-white' : 'bg-gray-200 text-gray-400'}`}>
                                    <Ticket size={20} />
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Filtros: Zarpe, Origen, Destino */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 sm:gap-6 mt-4">
                        {/* Zarpe */}
                        <div>
                            {/* HEADER DEL ZARPE CON BOTÓN DE ACTUALIZAR */}
                            <div className="flex items-center justify-between mb-1.5">
                                <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1.5">
                                    <Calendar size={13} className="text-[#1ABB9C]" /> Seleccione Zarpe
                                </label>
                                <button 
                                    type="button"
                                    onClick={cargarViajesDisponibles}
                                    disabled={isRefreshingViajes}
                                    className="text-slate-400 hover:text-[#1ABB9C] transition-colors flex items-center gap-1 text-[9px] font-bold uppercase disabled:opacity-50"
                                    title="Actualizar lista de viajes"
                                >
                                    <RefreshCw size={12} className={isRefreshingViajes ? "animate-spin text-[#1ABB9C]" : ""} />
                                    Actualizar
                                </button>
                            </div>
                            <div className="relative group">
                                <Ship size={17} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-[#1ABB9C] transition-colors" />
                                <ChevronDown size={15} className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                                <select
                                    className="w-full appearance-none bg-slate-50 border border-slate-200 text-slate-700 font-semibold text-sm
                                               pl-10 pr-9 py-2.5 sm:py-3 rounded-xl outline-none transition-all duration-200
                                               focus:border-[#1ABB9C] focus:ring-2 focus:ring-[#1ABB9C]/15 focus:bg-white
                                               hover:border-slate-300 cursor-pointer text-ellipsis overflow-hidden whitespace-nowrap"
                                    onChange={(e) => handleViajeChange(e.target.value)}
                                    value={viajeSeleccionado?.idViaje || ''}
                                >
                                    <option value="">Seleccione un viaje disponible</option>
                                    {viajes.map(v => (
                                        <option key={v.idViaje} value={v.idViaje}>
                                            {formatearFecha(v.fechaSalida)} · {formatearHora(v.horaZarpe)} —  {v.nombreRuta} 
                                        </option>
                                    ))}
                                </select>
                            </div>
                        </div>

                        {/* Origen */}
                        <div>
                            <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1.5 flex items-center gap-1.5 h-[18px]">
                                <MapPin size={13} className="text-blue-500" /> Origen
                            </label>
                            <div className="relative">
                                <ChevronDown size={15} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                                <select
                                    className="w-full appearance-none bg-slate-50 border border-slate-200 text-slate-700 font-semibold text-sm
                                               px-3 sm:px-4 pr-8 py-2.5 sm:py-3 rounded-xl outline-none transition-all duration-200
                                               focus:border-blue-400 focus:ring-2 focus:ring-blue-400/15 focus:bg-white
                                               hover:border-slate-300 disabled:opacity-50 cursor-pointer"
                                    value={origenId}
                                    onChange={(e) => setOrigenId(e.target.value)}
                                    disabled={!viajeSeleccionado || puertosRuta.length === 0}
                                >
                                    <option value="">Seleccione origen</option>
                                    {puertosRuta.map(p => (
                                        <option key={p.idPuerto} value={p.idPuerto}>{p.ciudad}</option>
                                    ))}
                                </select>
                            </div>
                        </div>

                        {/* Destino */}
                        <div>
                            <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1.5 flex items-center gap-1.5 h-[18px]">
                                <MapPin size={13} className="text-red-500" /> Destino
                            </label>
                            <div className="relative">
                                <ChevronDown size={15} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                                <select
                                    className="w-full appearance-none bg-slate-50 border border-slate-200 text-slate-700 font-semibold text-sm
                                               px-3 sm:px-4 pr-8 py-2.5 sm:py-3 rounded-xl outline-none transition-all duration-200
                                               focus:border-red-400 focus:ring-2 focus:ring-red-400/15 focus:bg-white
                                               hover:border-slate-300 disabled:opacity-50 cursor-pointer"
                                    value={destinoId}
                                    onChange={(e) => setDestinoId(e.target.value)}
                                    disabled={!origenId}
                                >
                                    <option value="">Seleccione destino</option>
                                    {puertosRuta.map(p => (
                                        <option key={p.idPuerto} value={p.idPuerto} disabled={p.idPuerto == origenId}>
                                            {p.ciudad} {p.idPuerto == origenId ? '(Origen)' : ''}
                                        </option>
                                    ))}
                                </select>
                            </div>
                        </div>
                    </div>
                </div>

                {/* 2. CONTENIDO PRINCIPAL: MAPA (Izquierda 5 cols) Y FORMULARIO (Derecha 7 cols) */}
                <div className="grid grid-cols-1 xl:grid-cols-12 gap-6 items-start">

                    {/* MAPA DE ASIENTOS */}
                    <div className="xl:col-span-7 w-full xl:sticky xl:top-4">
                        <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm shadow-slate-200/50 overflow-hidden">
                            <div className="px-4 sm:px-6 py-3 sm:py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
                                <div className="flex items-center gap-2 sm:gap-3">
                                    <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-lg bg-slate-200 flex items-center justify-center shadow-inner">
                                        <Anchor size={14} className="text-slate-600" />
                                    </div>
                                    <div>
                                        <h2 className="text-xs sm:text-sm font-extrabold text-[#2A3F54] uppercase tracking-wide">Mapa de Asientos</h2>
                                        <p className="text-[10px] sm:text-[11px] text-slate-500 font-medium truncate max-w-[150px] sm:max-w-xs">
                                            {viajeSeleccionado ? naveCompleta?.nombre || viajeSeleccionado.nombreEmbarcacion : 'Esperando selección'}
                                        </p>
                                    </div>
                                </div>
                                {fields.length > 0 && (
                                    <div className="flex items-center gap-1.5 sm:gap-2 px-2 sm:px-3 py-1 sm:py-1.5 bg-[#1ABB9C]/10 text-[#1ABB9C] rounded-lg text-[10px] sm:text-xs font-bold border border-[#1ABB9C]/20">
                                        <Users size={12} />
                                        {fields.length} <span className="hidden sm:inline">seleccionados</span>
                                    </div>
                                )}
                            </div>

                            <div className="p-2 sm:p-4 lg:p-6 min-h-[400px] xl:min-h-[500px] flex flex-col items-center justify-center relative bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] bg-slate-50/30">
                                {viajeSeleccionado && origenId && destinoId ? (
                                    loadingMapa ? (
                                        <div className="text-center flex flex-col items-center py-10 sm:py-20">
                                            <div className="w-12 h-12 sm:w-14 sm:h-14 rounded-2xl bg-[#1ABB9C]/10 flex items-center justify-center mb-3 sm:mb-4">
                                                <Loader className="animate-spin text-[#1ABB9C]" size={24} />
                                            </div>
                                            <p className="text-slate-500 text-xs sm:text-sm font-semibold">Cargando disponibilidad...</p>
                                        </div>
                                    ) : (
                                        <div className="w-full flex justify-center relative">
                                            <SeatMapVertical
                                                capacidadReal={viajeSeleccionado.cuposDisponibles}
                                                filas={naveCompleta?.numeroFilas}
                                                distribucionColStr={naveCompleta?.distribucionColumnas}
                                                mapaEstados={estadosVisuales}
                                                asientoSeleccionado={null}
                                                onSeleccionarAsiento={handleAsientoClick}
                                                nombreEmbarcacion={viajeSeleccionado.nombreEmbarcacion}
                                            />
                                            {precioTramo <= 0 && (
                                                <div className="absolute inset-0 bg-white/60 backdrop-blur-md z-20 flex flex-col items-center justify-center rounded-3xl p-4">
                                                    <div className="w-12 h-12 sm:w-16 sm:h-16 rounded-2xl bg-red-50 flex items-center justify-center mb-3 sm:mb-4 shadow-sm border border-red-100">
                                                        <AlertCircle size={28} className="text-red-500" />
                                                    </div>
                                                    <h3 className="text-red-600 font-extrabold text-base sm:text-lg text-center">Tarifa no disponible</h3>
                                                </div>
                                            )}
                                        </div>
                                    )
                                ) : (
                                    <div className="text-center py-10 sm:py-20 opacity-60 px-4">
                                        <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-3xl bg-slate-200 flex items-center justify-center mx-auto mb-4 sm:mb-5 shadow-inner">
                                            <Ship className="text-slate-400" size={32} />
                                        </div>
                                        <h3 className="text-slate-600 font-bold text-base sm:text-lg mb-1">Esperando Selección</h3>
                                        <p className="text-slate-500 text-xs sm:text-sm max-w-xs mx-auto">
                                            Configure el zarpe, origen y destino en la parte superior.
                                        </p>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>

                    {/* FORMULARIO DE PASAJEROS */}
                    <div className="xl:col-span-5 w-full h-full">
                        <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm shadow-slate-200/50 flex flex-col overflow-hidden animate-in fade-in slide-in-from-bottom-4 duration-500 w-full min-h-[800px] xl:h-[calc(111vh-120px)]"> 
                            
                            {/* Header del formulario */}
                            <div className="bg-[#2A3F54] px-4 sm:px-5 py-3 sm:py-4 border-b border-[#1c2a38] flex items-center justify-between shrink-0 shadow-sm">
                                <div className="flex items-center gap-2 sm:gap-2.5">
                                    <div className="w-6 h-6 sm:w-7 sm:h-7 rounded-lg bg-[#1ABB9C]/20 flex items-center justify-center">
                                        <FormIcon size={14} className="text-[#1ABB9C]" />
                                    </div>
                                    <h2 className="text-xs sm:text-sm font-extrabold text-white uppercase tracking-wide">
                                        Datos de Pasajeros
                                    </h2>
                                </div>
                                <span className="bg-[#1c2a38] text-[#1ABB9C] px-2.5 sm:px-3 py-1 sm:py-1.5 rounded-lg text-[10px] sm:text-xs font-bold shadow-inner">
                                    {fields.length} asiento{fields.length !== 1 ? 's' : ''}
                                </span>
                            </div>

                            <form onSubmit={handleSubmit(onValidarFormulario)} className="flex flex-col flex-1 overflow-hidden">
                                {/* Lista de pasajeros scrolleable */}
                                <div className="flex-1 overflow-y-auto p-3 sm:p-4 space-y-3 sm:space-y-4 bg-slate-50/50"
                                     style={{ scrollbarWidth: 'thin', scrollbarColor: '#cbd5e1 transparent' }}>
                                    {fields.length === 0 ? (
                                        <div className="text-center py-10 sm:py-16 opacity-70 px-4">
                                            <div className="w-14 h-14 sm:w-16 sm:h-16 rounded-2xl bg-white shadow-sm border border-slate-200 flex items-center justify-center mx-auto mb-3 sm:mb-4">
                                                <Ticket size={24} className="text-slate-300" />
                                            </div>
                                            <p className="text-slate-500 text-xs sm:text-sm font-bold">No hay asientos seleccionados</p>
                                            <p className="text-slate-400 text-[10px] sm:text-xs mt-1 max-w-[200px] sm:max-w-xs mx-auto">Seleccione al menos un asiento libre en el mapa de la izquierda.</p>
                                        </div>
                                    ) : (
                                        fields.map((field, index) => {
                                            const errorPasajero = errors.pasajeros?.[index] as any;
                                            const tipoDoc = pasajerosWatch[index]?.tipoDocumento;
                                            const asientoActual = pasajerosWatch[index]?.numeroAsiento;

                                            return (
                                                <div key={field.id}
                                                     className="bg-white rounded-xl border border-slate-200 shadow-sm p-4 sm:p-5 relative
                                                                hover:border-[#1ABB9C]/40 hover:shadow-md transition-all duration-200 group">
                                                    <button
                                                        type="button"
                                                        onClick={() => remove(index)}
                                                        className="absolute top-3 sm:top-4 right-3 sm:right-4 w-7 h-7 sm:w-8 sm:h-8 rounded-lg bg-slate-50 border border-slate-100 text-slate-400
                                                                   hover:bg-red-50 hover:border-red-100 hover:text-red-500 transition-all flex items-center justify-center"
                                                        title="Liberar asiento"
                                                    >
                                                        <Trash2 size={14} />
                                                    </button>

                                                    {/* Cabecera de tarjeta de pasajero dinámica */}
                                                    <div className="flex items-center gap-2.5 sm:gap-3 mb-4 sm:mb-5 border-b border-slate-100 pb-2.5 sm:pb-3 pr-8 sm:pr-10">
                                                        {asientoActual === '' ? (
                                                            <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-xl bg-red-500 flex items-center justify-center text-white text-xl font-black shadow-sm animate-pulse shadow-red-500/40" title="Seleccione un nuevo asiento">
                                                                !
                                                            </div>
                                                        ) : (
                                                            <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-xl bg-gradient-to-br from-blue-400 to-blue-500 flex items-center justify-center text-white text-base sm:text-lg font-black shadow-sm shadow-blue-500/30">
                                                                {asientoActual}
                                                            </div>
                                                        )}
                                                        <div>
                                                            <h3 className="text-[9px] sm:text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                                                                {asientoActual === '' ? '⚠️ SELECCIONE OTRO ASIENTO' : 'Asiento'}
                                                            </h3>
                                                            <p className={`text-xs sm:text-sm font-bold leading-none mt-1 flex items-center gap-1.5 ${asientoActual === '' ? 'text-red-500' : 'text-[#2A3F54]'}`}>
                                                                <User size={12} className={asientoActual === '' ? 'text-red-500' : 'text-blue-500'}/> 
                                                                Pasajero {index + 1}
                                                            </p>
                                                        </div>
                                                    </div>

                                                    {/* Campos del formulario */}
                                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                                                        {/* Documento */}
                                                        <div className="sm:col-span-2">
                                                            <label className="text-[9px] sm:text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1.5 block">
                                                                Documento de identidad
                                                            </label>
                                                            <div className={`flex rounded-xl overflow-hidden border transition-all duration-200 bg-white ${
                                                                errorPasajero?.numeroDocumento
                                                                    ? 'border-red-300 ring-2 ring-red-300/20'
                                                                    : 'border-slate-200 focus-within:border-[#1ABB9C] focus-within:ring-2 focus-within:ring-[#1ABB9C]/15'
                                                            }`}>
                                                                <select
                                                                    {...register(`pasajeros.${index}.tipoDocumento`)}
                                                                    className="bg-slate-50 border-r border-slate-200 px-2 sm:px-3 py-2 sm:py-3 text-[10px] sm:text-xs outline-none text-slate-700 font-bold cursor-pointer hover:bg-slate-100 transition-colors uppercase"
                                                                >
                                                                    <option value="DNI">DNI</option>
                                                                    <option value="CARNET_EXTRANJERIA">CE</option>
                                                                    <option value="PASAPORTE">PAS</option>
                                                                </select>
                                                                <input
                                                                    {...register(`pasajeros.${index}.numeroDocumento`)}
                                                                    type="text"
                                                                    maxLength={tipoDoc === 'DNI' ? 8 : tipoDoc === 'CARNET_EXTRANJERIA' ? 9 : 15}
                                                                    onBlur={() => buscarPasajero(index)}
                                                                    onInput={(e) => {
                                                                        let val = e.currentTarget.value;
                                                                        if (tipoDoc === 'DNI' || tipoDoc === 'CARNET_EXTRANJERIA') {
                                                                            val = val.replace(/[^0-9]/g, '');
                                                                        } else {
                                                                            val = val.replace(/[^A-Za-z0-9]/g, '').toUpperCase();
                                                                        }
                                                                        e.currentTarget.value = val;

                                                                        if ((tipoDoc === 'DNI' && val.length === 8) || (tipoDoc === 'CARNET_EXTRANJERIA' && val.length === 9)) {
                                                                            buscarPasajero(index, val);
                                                                        }
                                                                    }}
                                                                    placeholder={tipoDoc === 'DNI' ? '8 dígitos' : tipoDoc === 'CARNET_EXTRANJERIA' ? '9 dígitos' : 'Nro. Pasaporte'}
                                                                    className="w-full p-2 sm:p-3 text-xs sm:text-sm outline-none font-mono font-medium text-slate-700 bg-transparent uppercase placeholder:font-sans"
                                                                />
                                                            </div>
                                                            {errorPasajero?.numeroDocumento && (
                                                                <p className="text-red-500 text-[9px] sm:text-[10px] mt-1.5 flex items-center gap-1 font-bold">
                                                                    <AlertCircle size={10} /> {errorPasajero.numeroDocumento.message}
                                                                </p>
                                                            )}
                                                        </div>

                                                        {/* Nombres */}
                                                        <div className="sm:col-span-2">
                                                            <label className="text-[9px] sm:text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1.5 block">
                                                                Nombres
                                                            </label>
                                                            <input
                                                                {...register(`pasajeros.${index}.nombres`)}
                                                                onInput={(e) => e.currentTarget.value = e.currentTarget.value.replace(/[^A-Za-zÑñÁáÉéÍíÓóÚúÜü\s]/g, '').toUpperCase()}
                                                                className={getInputClass(errorPasajero?.nombres)}
                                                                placeholder="EJ: JUAN CARLOS"
                                                            />
                                                            {errorPasajero?.nombres && (
                                                                <p className="text-red-500 text-[9px] sm:text-[10px] mt-1.5 flex items-center gap-1 font-bold">
                                                                    <AlertCircle size={10} />{errorPasajero.nombres.message}
                                                                </p>
                                                            )}
                                                        </div>

                                                        {/* Apellidos */}
                                                        <div>
                                                            <label className="text-[9px] sm:text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1.5 block">
                                                                Apellido Paterno
                                                            </label>
                                                            <input
                                                                {...register(`pasajeros.${index}.apellidoPaterno`)}
                                                                onInput={(e) => e.currentTarget.value = e.currentTarget.value.replace(/[^A-Za-zÑñÁáÉéÍíÓóÚúÜü\s]/g, '').toUpperCase()}
                                                                className={getInputClass(errorPasajero?.apellidoPaterno)}
                                                                placeholder="EJ: PÉREZ"
                                                            />
                                                            {errorPasajero?.apellidoPaterno && (
                                                                <p className="text-red-500 text-[9px] sm:text-[10px] mt-1.5 flex items-center gap-1 font-bold">
                                                                    <AlertCircle size={10} />{errorPasajero.apellidoPaterno.message}
                                                                </p>
                                                            )}
                                                        </div>
                                                        <div>
                                                            <label className="text-[9px] sm:text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1.5 block">
                                                                Apellido Materno
                                                            </label>
                                                            <input
                                                                {...register(`pasajeros.${index}.apellidoMaterno`)}
                                                                onInput={(e) => e.currentTarget.value = e.currentTarget.value.replace(/[^A-Za-zÑñÁáÉéÍíÓóÚúÜü\s]/g, '').toUpperCase()}
                                                                className={getInputClass(errorPasajero?.apellidoMaterno)}
                                                                placeholder="EJ: GARCÍA"
                                                            />
                                                            {errorPasajero?.apellidoMaterno && (
                                                                <p className="text-red-500 text-[9px] sm:text-[10px] mt-1.5 flex items-center gap-1 font-bold">
                                                                    <AlertCircle size={10} />{errorPasajero.apellidoMaterno.message}
                                                                </p>
                                                            )}
                                                        </div>

                                                        {/* Fecha y Nacionalidad */}
                                                        <div>
                                                            <label className="text-[9px] sm:text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1.5 block">
                                                                F. Nacimiento
                                                            </label>
                                                            <input
                                                                type="date"
                                                                {...register(`pasajeros.${index}.fechaNacimiento`)}
                                                                max={new Date().toISOString().split("T")[0]}
                                                                className={getInputClass(errorPasajero?.fechaNacimiento)}
                                                            />
                                                            {errorPasajero?.fechaNacimiento && (
                                                                <p className="text-red-500 text-[9px] sm:text-[10px] mt-1.5 flex items-center gap-1 font-bold">
                                                                    <AlertCircle size={10} />{errorPasajero.fechaNacimiento.message}
                                                                </p>
                                                            )}
                                                        </div>
                                                        <div>
                                                            <label className="text-[9px] sm:text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1.5 flex items-center gap-1">
                                                                <Globe size={11} className="text-slate-400" /> Nacionalidad
                                                            </label>
                                                            <div className="relative">
                                                                <ChevronDown size={15} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                                                                <select
                                                                    {...register(`pasajeros.${index}.nacionalidad`)}
                                                                    className={`${getInputClass(errorPasajero?.nacionalidad)} appearance-none pr-8 cursor-pointer bg-white`}
                                                                >
                                                                    <option value="">SELECCIONE...</option>
                                                                    {NACIONALIDADES.map(nac => (
                                                                        <option key={nac} value={nac}>{nac}</option>
                                                                    ))}
                                                                </select>
                                                            </div>
                                                            {errorPasajero?.nacionalidad && (
                                                            <p className="text-red-500 text-[9px] sm:text-[10px] mt-1.5 flex items-center gap-1 font-bold">
                                                                <AlertCircle size={10} />{errorPasajero.nacionalidad.message}
                                                            </p>
                                                            )}
                                                        </div>

                                                        {/* Teléfono */}
                                                        <div className="sm:col-span-2">
                                                            <label className="text-[9px] sm:text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1.5 flex items-center gap-1">
                                                                <Phone size={11} className="text-slate-400" /> Teléfono <span className="text-slate-300 font-normal lowercase">(opcional)</span>
                                                            </label>
                                                            <input
                                                                type="tel"
                                                                {...register(`pasajeros.${index}.telefono`)}
                                                                maxLength={9}
                                                                onInput={(e) => e.currentTarget.value = e.currentTarget.value.replace(/[^0-9]/g, '')}
                                                                className={getInputClass(errorPasajero?.telefono)}
                                                                placeholder="Ej. 987654321"
                                                            />
                                                            {errorPasajero?.telefono && (
                                                                <p className="text-red-500 text-[9px] sm:text-[10px] mt-1.5 flex items-center gap-1 font-bold">
                                                                    <AlertCircle size={10} />{errorPasajero.telefono.message}
                                                                </p>
                                                            )}
                                                        </div>
                                                    </div>
                                                </div>
                                            );
                                        })
                                    )}
                                </div>

                                {/* Footer: Total y botón de pago */}
                                <div className="p-4 sm:p-5 bg-white border-t border-slate-200 shrink-0 shadow-[0_-4px_15px_rgba(0,0,0,0.02)]">
                                    <div className="bg-slate-50 border border-slate-200 rounded-xl p-3 sm:p-4 mb-3 sm:mb-4">
                                        <div className="flex items-center gap-2 mb-2 sm:mb-3">
                                            <div className="w-5 h-5 sm:w-6 sm:h-6 rounded-md bg-[#2A3F54] flex items-center justify-center">
                                                <CreditCard size={12} className="text-white" />
                                            </div>
                                            <span className="text-[10px] sm:text-[11px] font-extrabold text-[#2A3F54] uppercase tracking-wider">Resumen de Venta</span>
                                        </div>
                                        <div className="flex justify-between items-center bg-white p-2.5 sm:p-3 rounded-lg border border-slate-200 shadow-sm">
                                            <div>
                                                <p className="text-[10px] sm:text-xs text-slate-500 font-medium">Asientos Seleccionados</p>
                                                <p className="text-xs sm:text-sm font-black text-[#2A3F54] mt-0.5">
                                                    {fields.length} pasaje(s)
                                                </p>
                                            </div>
                                            <div className="text-right">
                                                <p className="text-[9px] sm:text-[10px] text-slate-400 font-bold uppercase tracking-wider mb-0.5">Total a Pagar</p>
                                                <p className="text-xl sm:text-2xl font-black text-[#1ABB9C] tracking-tight leading-none">
                                                    S/ {totalCarrito.toFixed(2)}
                                                </p>
                                            </div>
                                        </div>
                                    </div>

                                    <button
                                        type="submit"
                                        disabled={fields.length === 0}
                                        className="w-full py-3 sm:py-4 bg-gradient-to-r from-[#1ABB9C] to-[#15997D] hover:from-[#18c9a5] hover:to-[#1ABB9C]
                                                   text-white font-black text-xs sm:text-sm rounded-xl shadow-[0_8px_20px_rgba(26,187,156,0.25)]
                                                   transition-all duration-300 disabled:opacity-40 disabled:shadow-none
                                                   disabled:cursor-not-allowed flex justify-center items-center gap-2
                                                   active:scale-[0.98] hover:shadow-[0_8px_25px_rgba(26,187,156,0.35)]"
                                    >
                                        <CreditCard size={16} strokeWidth={2.5} />
                                        PROCESAR PAGO
                                    </button>
                                </div>
                            </form>
                        </div>
                    </div>

                </div>

                {/* MODALES */}
                <ModalPagoPOS
                    isOpen={mostrarModalPago}
                    onClose={() => setMostrarModalPago(false)}
                    montoTotal={totalCarrito}
                    pasajeroNombreDefecto={
                        pasajerosWatch[0]?.nombres
                            ? `${pasajerosWatch[0].nombres} ${pasajerosWatch[0].apellidoPaterno} ${pasajerosWatch[0].apellidoMaterno || ''}`.trim()
                            : ''
                    }
                    pasajeroDocumentoDefecto={pasajerosWatch[0]?.numeroDocumento || ''}
                    pasajeroTipoDocDefecto={pasajerosWatch[0]?.tipoDocumento || 'DNI'}
                    onConfirmarPago={procesarPagoGrupal}
                />

                <ModalTicket
                    isOpen={!!ticketData}
                    onClose={() => setTicketData(null)}
                    datosVenta={ticketData?.venta}
                    datosPago={ticketData?.pago}
                />
            </div>
        </MainLayout>
    );
};

export default VentaPage;