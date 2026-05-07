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
    User,Globe,Phone,CreditCard,ChevronDown,ArrowRight, Info, FormIcon
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

    useEffect(() => {
        getViajesProgramados()
            .then((data: any[]) => {
                const hoy = new Date(); hoy.setHours(0, 0, 0, 0);
                setViajes(data.filter(v =>
                    v.estado === 'PROGRAMADO' &&
                    (!v.fechaSalida || new Date(v.fechaSalida + 'T00:00:00') >= hoy)
                ));
            })
            .catch(() => setViajes([]));

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

    const [animandoPrecio, setAnimandoPrecio] = useState(false);

    useEffect(() => {
        if (precioTramo > 0) {
            setAnimandoPrecio(true);
            const t = setTimeout(() => setAnimandoPrecio(false), 300);
            return () => clearTimeout(t);
        }
    }, [precioTramo]);

    const onValidarFormulario = () => {
        const idTurno = localStorage.getItem('idTurnoCajaAbierta');
        if (!idTurno) return notificarError("Debe aperturar su caja antes de vender.");
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
            
            const msjError = error.response?.data?.mensaje || error.response?.data || "El asiento ya fue comprado. Verifique disponibilidad.";
            notificarError(msjError);

            getMapaAsientos(viajeSeleccionado.idViaje, parseInt(origenId), parseInt(destinoId))
                .then(mapaFresco => {
                    setMapaEstados(mapaFresco);
                    
                    const pasajerosActuales = getValues("pasajeros") || [];
                    
                    for (let i = pasajerosActuales.length - 1; i >= 0; i--) {
                        if (mapaFresco[pasajerosActuales[i].numeroAsiento] === 'VENDIDO') {
                            remove(i); 
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
    pasajerosWatch.forEach(c => { estadosVisuales[c.numeroAsiento] = 'SELECCIONADO'; });

    const InfoChip = ({ icon: Icon, label, value, accent = false }: any) => (
        <div className={`flex items-center gap-2.5 px-4 py-2.5 rounded-xl text-sm ${accent ? 'bg-[#1ABB9C]/10 text-[#1ABB9C] font-semibold' : 'bg-slate-50 text-slate-600'}`}>
            <Icon size={15} strokeWidth={2.5} />
            <div className="flex flex-col leading-tight">
                <span className="text-[10px] uppercase tracking-wider font-bold opacity-70">{label}</span>
                <span className="font-semibold">{value}</span>
            </div>
        </div>
    );

    return (
        <MainLayout>
            <div className="max-w-7xl mx-auto pb-3">

                {/* HEADER */}
                <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 mb-8 flex flex-col md:flex-row md:items-center justify-between gap-4 animate-in slide-in-from-top-4">
                    <div>
                        <h1 className="text-2xl font-bold text-[#2A3F54] flex items-center gap-3">
                            <div  className="p-2 bg-blue-50 rounded-lg text-[#1ABB9C]"><Ticket size={20} /></div>
                                Punto de Venta
                        </h1>
                        <p className="text-sm text-gray-400 mt-1 ml-1">
                            Selecciona ruta y asientos para iniciar la venta
                        </p>
                    </div>
                    <div className="flex items-center gap-4">
                        {viajeSeleccionado && (
                            <div className="flex flex-wrap gap-2">
                                <InfoChip
                                    icon={Ship}
                                    label="Embarcación"
                                    value={viajeSeleccionado.nombreEmbarcacion}
                                />
                                <InfoChip
                                    icon={Calendar}
                                    label="Salida"
                                    value={`${formatearFecha(viajeSeleccionado.fechaSalida)} · ${formatearHora(viajeSeleccionado.horaZarpe)}`}
                                    accent
                                />
                            </div>
                        )}
                        <div className={`flex items-center gap-4 px-6 py-3 rounded-xl shadow-sm transition-all duration-300
                            ${precioTramo > 0 ? 'bg-[#2dae94] text-white shadow-lg' : 'bg-gray-50 border border-gray-200 text-gray-400'}`}>
                            <div className="text-right">
                                <p className={`text-[10px] font-bold uppercase tracking-wider ${precioTramo > 0 ? 'text-white' : 'text-gray-400'}`}>
                                    Tarifa por Pasajero
                                </p>
                                {loadingMapa ? (
                                    <div className="h-6 w-20 bg-white/20 animate-pulse rounded mt-1"></div>
                                ) : (
                                    <div className="flex items-baseline gap-1 justify-end relative overflow-hidden">
                                        <span className="text-sm font-medium">S/</span>

                                        <span
                                            key={precioTramo} 
                                            className={`
                                                text-2xl font-black transition-all duration-300 ease-out
                                                ${precioTramo > 0 ? 'text-white' : 'text-gray-300'}
                                                ${animandoPrecio ? 'scale-110 opacity-0' : 'scale-100 opacity-100'}
                                            `}
                                        >
                                            {precioTramo > 0 ? precioTramo.toFixed(2) : '0.00'}
                                        </span>
                                    </div>
                                )}
                            </div>
                            <div className={`p-2 rounded-full ${precioTramo > 0 ? 'bg-white/20 text-white' : 'bg-gray-200 text-gray-400'}`}><Ticket size={20} /></div>
                        </div>
                    </div>
                </div>

                {/* FILTROS DE VIAJE */}
                <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm shadow-slate-200/50 p-1.5 mb-6">
                    <div className="bg-gradient-to-r from-slate-50 to-white rounded-xl p-5 lg:p-6">
                        <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 lg:gap-5 items-end">
                            {/* Selector de Viaje */}
                            <div className="lg:col-span-5">
                                <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                                    <Calendar size={13} className="text-[#1ABB9C]" />
                                    Seleccione Zarpe
                                </label>
                                <div className="relative group">
                                    <Ship size={17} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-[#1ABB9C] transition-colors" />
                                    <ChevronDown size={15} className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                                    <select
                                        className="w-full appearance-none bg-white border border-slate-200 text-slate-700 font-semibold text-sm
                                                   pl-10 pr-9 py-3 rounded-xl outline-none transition-all duration-200
                                                   focus:border-[#1ABB9C] focus:ring-2 focus:ring-[#1ABB9C]/15 focus:bg-white
                                                   hover:border-slate-300 cursor-pointer"
                                        onChange={(e) => handleViajeChange(e.target.value)}
                                        value={viajeSeleccionado?.idViaje || ''}
                                    >
                                        <option value="">Seleccione un viaje disponible</option>
                                        {viajes.map(v => (
                                            <option key={v.idViaje} value={v.idViaje}>
                                                {formatearFecha(v.fechaSalida)} · {formatearHora(v.horaZarpe)} — {v.nombreRuta}
                                            </option>
                                        ))}
                                    </select>
                                </div>
                            </div>

                            <div className="hidden lg:flex lg:col-span-1 justify-center pb-3">
                                <div className="w-px h-10 bg-gradient-to-b from-transparent via-slate-200 to-transparent" />
                            </div>

                            {/* Origen */}
                            <div className="lg:col-span-3">
                                <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                                    <MapPin size={13} className="text-blue-500" />
                                    Puerto de Origen
                                </label>
                                <div className="relative">
                                    <ChevronDown size={15} className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                                    <select
                                        className="w-full appearance-none bg-white border border-slate-200 text-slate-700 font-semibold text-sm
                                                   px-4 pr-9 py-3 rounded-xl outline-none transition-all duration-200
                                                   focus:border-blue-400 focus:ring-2 focus:ring-blue-400/15
                                                   hover:border-slate-300 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
                                        value={origenId}
                                        onChange={(e) => setOrigenId(e.target.value)}
                                        disabled={!viajeSeleccionado || puertosRuta.length === 0}
                                    >
                                        <option value="">Ciudad origen</option>
                                        {puertosRuta.map(p => (
                                            <option key={p.idPuerto} value={p.idPuerto}>{p.ciudad}</option>
                                        ))}
                                    </select>
                                </div>
                            </div>

                            {/* Destino */}
                            <div className="lg:col-span-3">
                                <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                                    <MapPin size={13} className="text-red-500" />
                                    Puerto de Destino
                                </label>
                                <div className="relative">
                                    <ChevronDown size={15} className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                                    <select
                                        className="w-full appearance-none bg-white border border-slate-200 text-slate-700 font-semibold text-sm
                                                   px-4 pr-9 py-3 rounded-xl outline-none transition-all duration-200
                                                   focus:border-red-400 focus:ring-2 focus:ring-red-400/15
                                                   hover:border-slate-300 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
                                        value={destinoId}
                                        onChange={(e) => setDestinoId(e.target.value)}
                                        disabled={!origenId}
                                    >
                                        <option value="">Ciudad destino</option>
                                        {puertosRuta.map(p => (
                                            <option
                                                key={p.idPuerto}
                                                value={p.idPuerto}
                                                disabled={p.idPuerto == origenId}
                                            >
                                                {p.ciudad} {p.idPuerto == origenId ? '(mismo origen)' : ''}
                                            </option>
                                        ))}
                                    </select>
                                </div>
                            </div>
                        </div>

                        {origenId && destinoId && (
                            <div className="mt-4 flex items-center gap-3 px-4 py-3 bg-[#1ABB9C]/5 border border-[#1ABB9C]/20 rounded-xl">
                                <Info size={15} className="text-[#1ABB9C] shrink-0" />
                                <div className="flex items-center gap-2 text-sm">
                                    <span className="font-bold text-slate-700">
                                        {puertosRuta.find(p => p.idPuerto == origenId)?.ciudad}
                                    </span>
                                    <ArrowRight size={14} className="text-[#1ABB9C]" />
                                    <span className="font-bold text-slate-700">
                                        {puertosRuta.find(p => p.idPuerto == destinoId)?.ciudad}
                                    </span>
                                    <span className="text-slate-400 mx-1">|</span>
                                    <span className="text-[#1ABB9C] font-extrabold">S/ {precioTramo.toFixed(2)}</span>
                                    <span className="text-slate-400">por pasaje</span>
                                </div>
                            </div>
                        )}
                    </div>
                </div>

                {/* CONTENIDO PRINCIPAL: MAPA | FORMULARIO */}
                <div className="grid grid-cols-1 xl:grid-cols-12 gap-6">

                    {/* MAPA DE ASIENTOS (8 cols) */}
                    <div className="xl:col-span-7">
                        <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm shadow-slate-200/50 overflow-hidden">
                            <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
                                <div className="flex items-center gap-3">
                                    <div className="w-8 h-8 rounded-lg bg-slate-100 flex items-center justify-center">
                                        <Anchor size={16} className="text-slate-500" />
                                    </div>
                                    <div>
                                        <h2 className="text-sm font-extrabold text-slate-700 uppercase tracking-wide">Mapa de Asientos</h2>
                                        <p className="text-[11px] text-slate-400 font-medium">
                                            {viajeSeleccionado ? naveCompleta?.nombre || viajeSeleccionado.nombreEmbarcacion : 'Seleccione un viaje'}
                                        </p>
                                    </div>
                                </div>
                                {fields.length > 0 && (
                                    <div className="flex items-center gap-2 px-3 py-1.5 bg-[#1ABB9C]/10 text-[#1ABB9C] rounded-lg text-xs font-bold">
                                        <Users size={13} />
                                        {fields.length} seleccionados
                                    </div>
                                )}
                            </div>

                            <div className="p-4 lg:p-6 bg-slate-50/50 min-h-[580px] flex flex-col items-center justify-center relative">
                                {viajeSeleccionado && origenId && destinoId ? (
                                    loadingMapa ? (
                                        <div className="text-center flex flex-col items-center py-20">
                                            <div className="w-14 h-14 rounded-2xl bg-[#1ABB9C]/10 flex items-center justify-center mb-4">
                                                <Loader className="animate-spin text-[#1ABB9C]" size={28} />
                                            </div>
                                            <p className="text-slate-500 text-sm font-semibold">Cargando disponibilidad...</p>
                                            <p className="text-slate-400 text-xs mt-1">Obteniendo mapa de asientos en tiempo real</p>
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
                                                <div className="absolute inset-0 bg-white/60 backdrop-blur-md z-20 flex flex-col items-center justify-center rounded-3xl">
                                                    <div className="w-16 h-16 rounded-2xl bg-red-50 flex items-center justify-center mb-4">
                                                        <AlertCircle size={32} className="text-red-500" />
                                                    </div>
                                                    <h3 className="text-red-600 font-extrabold text-lg">Tarifa no disponible</h3>
                                                    <p className="text-slate-500 text-sm mt-1 max-w-xs text-center">
                                                        No se ha configurado un precio para el tramo seleccionado. Contacte al administrador.
                                                    </p>
                                                </div>
                                            )}
                                        </div>
                                    )
                                ) : (
                                    <div className="text-center py-20">
                                        <div className="w-20 h-20 rounded-3xl bg-slate-100 flex items-center justify-center mx-auto mb-5">
                                            <Anchor className="text-slate-300" size={40} />
                                        </div>
                                        <h3 className="text-slate-500 font-bold text-lg mb-1">Mapa de Asientos</h3>
                                        <p className="text-slate-400 text-sm max-w-xs mx-auto">
                                            Complete la información del viaje, origen y destino para visualizar los asientos disponibles.
                                        </p>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>

                    {/* FORMULARIO Y PAGO (4 cols) */}
                    <div className="xl:col-span-5 flex flex-col gap-6">

                        {/* Panel de pasajeros */}
                        <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm shadow-slate-200/50 flex flex-col overflow-hidden"
                             style={{ maxHeight: 'calc(100vh - 100px)' }}> 

                            {/* Header del formulario */}
                            <div className=" bg-[#2A3F54] px-5 py-4 border-b border-slate-100 flex items-center justify-between shrink-0">
                                <div className="flex items-center gap-2.5">
                                    <div className="w-7 h-7 rounded-lg bg-[#1ABB9C]/10 flex items-center justify-center">
                                        <FormIcon size={16} className="text-[#1ABB9C]" />
                                    </div>
                                    <h2 className="text-sm font-extrabold text-[#FFFF] uppercase tracking-wide">
                                        formulario de venta
                                    </h2>
                                </div>
                                <span className="bg-slate-100 text-blue-600 px-2.5 py-1 rounded-lg text-xs font-bold border border-slate-200">
                                    {fields.length} asiento{fields.length !== 1 ? 's' : ''}
                                </span>
                            </div>

                            <form onSubmit={handleSubmit(onValidarFormulario)} className="flex flex-col flex-1 overflow-hidden">
                                {/* Lista de pasajeros scrolleable */}
                                <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-white"
                                     style={{ scrollbarWidth: 'thin', scrollbarColor: '#cbd5e1 transparent' }}>
                                    {fields.length === 0 ? (
                                        <div className="text-center py-16">
                                            <div className="w-14 h-14 rounded-2xl bg-slate-100 flex items-center justify-center mx-auto mb-4">
                                                <Ticket size={24} className="text-slate-300" />
                                            </div>
                                            <p className="text-slate-400 text-sm font-medium">No hay asientos seleccionados</p>
                                            <p className="text-slate-300 text-xs mt-1">Haga clic en el mapa para agregar pasajeros</p>
                                        </div>
                                    ) : (
                                        fields.map((field, index) => {
                                            const errorPasajero = errors.pasajeros?.[index] as any;
                                            const tipoDoc = pasajerosWatch[index]?.tipoDocumento;

                                            return (
                                                <div key={field.id}
                                                     className="bg-white rounded-xl border border-slate-200 p-4 relative
                                                                hover:border-slate-300 hover:shadow-md transition-all duration-200 group">
                                                    <button
                                                        type="button"
                                                        onClick={() => remove(index)}
                                                        className="absolute top-3 right-3 w-7 h-7 rounded-lg bg-slate-100 text-slate-400
                                                                   hover:bg-red-50 hover:text-red-500 transition-all flex items-center justify-center"
                                                        title="Liberar asiento"
                                                    >
                                                        <Trash2 size={14} />
                                                    </button>

                                                    {/* Cabecera de tarjeta */}
                                                    <div className="flex items-end gap-2 mb-4 pr-8">
                                                        <h3 className="text-sm font-bold text-[#2A3F54] uppercase mb-4 flex items-center gap-2 border-b border-gray-200 pb-2">
                                                            <User size={16} className="text-[#1ABB9C]"/> 
                                                            Datos del Pasajero - <span className="text-[#1ABB9C]">Asiento</span>
                                                            <span className="w-8 h-8 rounded-lg bg-gradient-to-br from-[#1ABB9C] to-[#169d82] flex items-center justify-center text-white text-[16px] font-extrabold">{field.numeroAsiento}</span>
                                                        </h3>
                                                    </div>

                                                    {/* Campos del formulario */}
                                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                                        {/* Documento */}
                                                        <div className="sm:col-span-2">
                                                            <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1 block">
                                                                Documento de identidad
                                                            </label>
                                                            <div className={`flex rounded-lg overflow-hidden border transition-all duration-200 ${
                                                                errorPasajero?.numeroDocumento
                                                                    ? 'border-red-300 ring-1 ring-red-300'
                                                                    : 'border-slate-200 focus-within:border-[#1ABB9C] focus-within:ring-1 focus-within:ring-[#1ABB9C]/20'
                                                            }`}>
                                                                <select
                                                                    {...register(`pasajeros.${index}.tipoDocumento`)}
                                                                    className="bg-slate-100 border-r border-slate-200 px-2.5 text-xs outline-none text-slate-600 font-bold cursor-pointer hover:bg-slate-200 transition-colors uppercase"
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
                                                                    className="w-full p-2.5 text-sm outline-none font-mono text-slate-700 bg-white uppercase"
                                                                />
                                                            </div>
                                                            {errorPasajero?.numeroDocumento && (
                                                                <p className="text-red-500 text-[10px] mt-1 flex items-center gap-1 font-medium">
                                                                    <AlertCircle size={10} /> {errorPasajero.numeroDocumento.message}
                                                                </p>
                                                            )}
                                                        </div>

                                                        {/* Nombres */}
                                                        <div className="sm:col-span-2">
                                                            <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1 block">
                                                                Nombres
                                                            </label>
                                                            <input
                                                                {...register(`pasajeros.${index}.nombres`)}
                                                                onInput={(e) => e.currentTarget.value = e.currentTarget.value.replace(/[^A-Za-zÑñÁáÉéÍíÓóÚúÜü\s]/g, '').toUpperCase()}
                                                                className={getInputClass(errorPasajero?.nombres)}
                                                                placeholder="EJ: JUAN CARLOS"
                                                            />
                                                            {errorPasajero?.nombres && (
                                                                <p className="text-red-500 text-[10px] mt-1 flex items-center gap-1 font-medium">
                                                                    <AlertCircle size={10} />{errorPasajero.nombres.message}
                                                                </p>
                                                            )}
                                                        </div>

                                                        {/* Apellidos */}
                                                        <div>
                                                            <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1 block">
                                                                Apellido Paterno
                                                            </label>
                                                            <input
                                                                {...register(`pasajeros.${index}.apellidoPaterno`)}
                                                                onInput={(e) => e.currentTarget.value = e.currentTarget.value.replace(/[^A-Za-zÑñÁáÉéÍíÓóÚúÜü\s]/g, '').toUpperCase()}
                                                                className={getInputClass(errorPasajero?.apellidoPaterno)}
                                                                placeholder="EJ: PÉREZ"
                                                            />
                                                            {errorPasajero?.apellidoPaterno && (
                                                                <p className="text-red-500 text-[10px] mt-1 flex items-center gap-1 font-medium">
                                                                    <AlertCircle size={10} />{errorPasajero.apellidoPaterno.message}
                                                                </p>
                                                            )}
                                                        </div>
                                                        <div>
                                                            <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1 block">
                                                                Apellido Materno
                                                            </label>
                                                            <input
                                                                {...register(`pasajeros.${index}.apellidoMaterno`)}
                                                                onInput={(e) => e.currentTarget.value = e.currentTarget.value.replace(/[^A-Za-zÑñÁáÉéÍíÓóÚúÜü\s]/g, '').toUpperCase()}
                                                                className={getInputClass(errorPasajero?.apellidoMaterno)}
                                                                placeholder="EJ: GARCÍA"
                                                            />
                                                            {errorPasajero?.apellidoMaterno && (
                                                                <p className="text-red-500 text-[10px] mt-1 flex items-center gap-1 font-medium">
                                                                    <AlertCircle size={10} />{errorPasajero.apellidoMaterno.message}
                                                                </p>
                                                            )}
                                                        </div>

                                                        {/* Fecha y Nacionalidad */}
                                                        <div>
                                                            <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1 block">
                                                                F. Nacimiento
                                                            </label>
                                                            <input
                                                                type="date"
                                                                {...register(`pasajeros.${index}.fechaNacimiento`)}
                                                                max={new Date().toISOString().split("T")[0]}
                                                                className={getInputClass(errorPasajero?.fechaNacimiento)}
                                                            />
                                                            {errorPasajero?.fechaNacimiento && (
                                                                <p className="text-red-500 text-[10px] mt-1 flex items-center gap-1 font-medium">
                                                                    <AlertCircle size={10} />{errorPasajero.fechaNacimiento.message}
                                                                </p>
                                                            )}
                                                        </div>
                                                        <div>
                                                            <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1 flex items-center gap-1">
                                                                <Globe size={10} /> Nacionalidad
                                                            </label>
                                                            <input
                                                                type="text"
                                                                {...register(`pasajeros.${index}.nacionalidad`)}
                                                                onInput={(e) => e.currentTarget.value = e.currentTarget.value.replace(/[^A-Za-zÑñÁáÉéÍíÓóÚúÜü\s]/g, '').toUpperCase()}
                                                                className={getInputClass(errorPasajero?.nacionalidad)}
                                                                placeholder="EJ: PERUANA"
                                                            />
                                                            {errorPasajero?.nacionalidad && (
                                                                <p className="text-red-500 text-[10px] mt-1 flex items-center gap-1 font-medium">
                                                                    <AlertCircle size={10} />{errorPasajero.nacionalidad.message}
                                                                </p>
                                                            )}
                                                        </div>

                                                        {/* Teléfono */}
                                                        <div className="sm:col-span-2">
                                                            <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1 flex items-center gap-1">
                                                                <Phone size={10} /> Teléfono <span className="text-slate-300 font-normal">(opcional)</span>
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
                                                                <p className="text-red-500 text-[10px] mt-1 flex items-center gap-1 font-medium">
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
                                <div className="p-5 bg-[#FFFF] border-t border-slate-200 shrink-0">
                                    {/* Resumen de pago */}
                                    <div className="bg-blue-50 border border-blue-100 rounded-xl p-4 mb-4 shadow-sm">
                                        <div className="flex items-center gap-2 mb-3">
                                            <div className="w-6 h-6 rounded-md bg-[#1ABB9C]/15 flex items-center justify-center">
                                                <CreditCard size={13} className="text-[#1ABB9C]" />
                                            </div>
                                            <span className="text-[12px] font-bold text-black uppercase tracking-wider">Resumen de pago</span>
                                        </div>
                                        <div className="flex justify-between items-center bg-white p-3 rounded border border-blue-100 shadow-sm">
                                            <div>
                                                <p className="text-xs text-black font-medium">{fields.length} pasaje(s) seleccionados</p>
                                                <p className="text-[10px] font-bold text-blue-600 mt-0.5">
                                                    {origenId && destinoId
                                                        ? `${puertosRuta.find(p => p.idPuerto == origenId)?.ciudad} → ${puertosRuta.find(p => p.idPuerto == destinoId)?.ciudad}`
                                                        : 'Seleccione origen y destino'
                                                    }
                                                </p>
                                            </div>
                                            <div className="text-right">
                                                <p className="text-[10px] text-black font-bold uppercase">Total</p>
                                                <p className="text-2xl font-black text-[#2A3F54] tracking-tight">
                                                    S/ {totalCarrito.toFixed(2)}
                                                </p>
                                            </div>
                                        </div>
                                    </div>

                                    <button
                                        type="submit"
                                        disabled={fields.length === 0}
                                        className="w-full py-3.5 bg-gradient-to-r from-[#1ABB9C] to-[#15997D] hover:from-[#18c9a5] hover:to-[#1ABB9C]
                                                   text-white font-extrabold text-sm rounded-xl shadow-lg shadow-[#1ABB9C]/25
                                                   transition-all duration-200 disabled:opacity-30 disabled:shadow-none
                                                   disabled:cursor-not-allowed flex justify-center items-center gap-2
                                                   active:scale-[0.98] hover:shadow-xl hover:shadow-[#1ABB9C]/30"
                                    >
                                        <CreditCard size={18} strokeWidth={2.5} />
                                        PROCEDER AL PAGO
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
                            ? `${pasajerosWatch[0].nombres} ${pasajerosWatch[0].apellidoPaterno}`
                            : ''
                    }
                    pasajeroDocumentoDefecto={pasajerosWatch[0]?.numeroDocumento || ''}
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