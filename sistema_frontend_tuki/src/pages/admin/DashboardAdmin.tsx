import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import MainLayout from '../../layouts/MainLayout';
import { getViajes, getEmbarcaciones } from '../../services/configService'; 
import { getManifiesto } from '../../services/ventaService';
import { 
    DollarSign, Ticket, Ship, Users, Ban, 
    TrendingUp, MapPin, Clock, Activity, Tag, CreditCard
} from 'lucide-react';
import { notificarError } from '../../services/feedbackService';

import { 
    LineChart, Line, BarChart, Bar, PieChart, Pie, Cell, 
    XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer 
} from 'recharts';

const DashboardAdmin = () => {
    const navigate = useNavigate();
    const [loading, setLoading] = useState(true);
    const [horaSistema, setHoraSistema] = useState(new Date());
    
    const [kpis, setKpis] = useState({
        ingresosHoy: 0, ingresosGlobal: 0,
        boletosHoy: 0, boletosGlobal: 0,
        viajesHoy: 0, ticketPromedio: 0,
        pasajerosHoy: 0, anuladasGlobal: 0, 
        navesOperativas: 0, navesMantenimiento: 0
    });

    const [graficoVentasDia, setGraficoVentasDia] = useState<any[]>([]);
    const [graficoRutas, setGraficoRutas] = useState<any[]>([]); 
    const [graficoNaves, setGraficoNaves] = useState<any[]>([]);
    const [graficoPagos, setGraficoPagos] = useState<any[]>([]);
    
    const [ultimasVentas, setUltimasVentas] = useState<any[]>([]);
    const [viajesDelDia, setViajesDelDia] = useState<any[]>([]);

    const COLORES_PAGO = ['#10B981', '#3B82F6', '#F59E0B', '#8B5CF6', '#EC4899', '#06B6D4'];

    useEffect(() => {
        const intReloj = setInterval(() => setHoraSistema(new Date()), 1000);
        return () => clearInterval(intReloj);
    }, []);

    useEffect(() => {
        let componenteMontado = true;
        let temporizador: any;
        let primeraCarga = true; 

        const motorDeActualizacion = async () => {
            if (primeraCarga) {
                setLoading(true);
                primeraCarga = false;
            }

            await cargarDashboard();

            if (componenteMontado) {
                setLoading(false); 
                temporizador = setTimeout(() => {
                    motorDeActualizacion();
                }, 10000); 
            }
        };

        motorDeActualizacion();

        return () => {
            componenteMontado = false;
            clearTimeout(temporizador);
        };
    }, []);

    const extraerArray = (res: any) => Array.isArray(res) ? res : (res?.data || res?.content || []);
    
    const normalizarFecha = (fechaObj: any) => {
        if (!fechaObj) return '';
        if (Array.isArray(fechaObj)) return `${fechaObj[0]}-${String(fechaObj[1]).padStart(2, '0')}-${String(fechaObj[2]).padStart(2, '0')}`;
        return String(fechaObj).split('T')[0];
    };

    const formatearHora12 = (horaVal: any) => {
        if (!horaVal) return '00:00 AM';
        let hStr = Array.isArray(horaVal) ? `${String(horaVal[0]).padStart(2, '0')}:${String(horaVal[1] || 0).padStart(2, '0')}` : String(horaVal);
        const [h, m] = hStr.split(':');
        if (!h || !m) return hStr;
        let hInt = parseInt(h, 10);
        const ampm = hInt >= 12 ? 'PM' : 'AM';
        hInt = hInt % 12 || 12;
        return `${hInt.toString().padStart(2, '0')}:${m.padStart(2, '0')} ${ampm}`;
    };

    const formatMoney = (amount: number) => new Intl.NumberFormat('es-PE', { style: 'currency', currency: 'PEN' }).format(amount || 0);

    const obtenerFechaLocal = (diasAtras = 0) => {
        const d = new Date();
        d.setDate(d.getDate() - diasAtras);
        const offset = d.getTimezoneOffset();
        const local = new Date(d.getTime() - (offset * 60 * 1000));
        return local.toISOString().split('T')[0];
    };

    const cargarDashboard = async () => { 
        try {
            const [viajesRes, navesRes] = await Promise.all([
                getViajes().catch(() => []),
                getEmbarcaciones().catch(() => [])
            ]);

            const viajes = extraerArray(viajesRes);
            const naves = extraerArray(navesRes);
            
            const hoyStr = obtenerFechaLocal(0);

            let ingHoy = 0, bolHoy = 0, viaHoy = 0, pasHoy = 0, anuGlobal = 0; 
            let ingGlobal = 0, bolGlobal = 0;
            
            const historialGlobal: any[] = [];
            const viajesHoyTemp: any[] = [];
            const mapDias: Record<string, { ingresos: number, perdidas: number }> = {}; 
            const mapRutas: Record<string, number> = {}; 
            const mapNaves: Record<string, number> = {};
            const mapPagos: Record<string, number> = {};

            for(let i = 0; i < 7; i++) {
                mapDias[obtenerFechaLocal(6 - i)] = { ingresos: 0, perdidas: 0 };
            }

            await Promise.all(viajes.map(async (v: any) => {
                const fechaSalida = normalizarFecha(v.fechaSalida);
                const estadoViaje = String(v.estado || '').toUpperCase();
                
                if (estadoViaje === 'ELIMINADO') return;

                const origen = v.ruta?.origen?.ciudad || v.origen?.ciudad || v.puertoOrigen?.ciudad || '';
                const destino = v.ruta?.destino?.ciudad || v.destino?.ciudad || v.puertoDestino?.ciudad || '';
                const nombreRuta = v.ruta?.nombreRuta || v.nombreRuta || (origen && destino ? `${origen} - ${destino}` : 'Ruta Gral');
                const nombreNave = v.embarcacion?.nombre || v.nombreEmbarcacion || 'Nave N/A';

                if (fechaSalida === hoyStr && estadoViaje !== 'CANCELADO') {
                    viaHoy++;
                }

                if (fechaSalida >= hoyStr && estadoViaje === 'PROGRAMADO') {
                    viajesHoyTemp.push({ ...v, nombreRuta, nombreNave, horaLimpia: formatearHora12(v.horaZarpe) });
                }

                try {
                    const idBusqueda = v.idViaje || v.id_viaje || v.id;
                    if (!idBusqueda) return;

                    const mRes = await getManifiesto(idBusqueda);
                    const ventasArray = extraerArray(mRes);
                    
                    ventasArray.forEach((venta: any) => {
                        const vPadre = venta.venta || {}; 

                        const estadoVenta = String(venta.estadoPasaje || venta.estado || vPadre.estado || 'VÁLIDO').toUpperCase();
                        const monto = parseFloat(venta.precioUnitario ?? venta.precio ?? venta.montoFinal ?? venta.monto ?? vPadre.total ?? 0) || 0;
                        const idVentaReal = vPadre.idVenta ?? vPadre.id ?? venta.idDetalle ?? venta.idVentaDetalle ?? venta.idReserva ?? 0;
                        
                        const objPasajero = venta.pasajero || {};
                        const pNom = objPasajero.nombres || objPasajero.nombre || venta.nombres || '';
                        const pApe = objPasajero.apellidos || objPasajero.apellidoPaterno || venta.apellidos || venta.apellidoPaterno || '';
                        const pMat = objPasajero.apellidoMaterno || venta.apellidoMaterno || '';
                        let pasajeroNombre = `${pNom} ${pApe} ${pMat}`.trim().replace(/\s+/g, ' ');
                        if (!pasajeroNombre) pasajeroNombre = objPasajero.nombreCompleto || venta.nombreCompletoPasajero || venta.pasajero || 'Pasajero S/N';

                        const pOri = venta.puertoOrigen || venta.origen || vPadre.puertoOrigen || {};
                        const pDes = venta.puertoDestino || venta.destino || vPadre.puertoDestino || {};
                        const origenEsc = pOri.ciudad || pOri.nombrePuerto || (typeof pOri === 'string' ? pOri : '');
                        const destinoEsc = pDes.ciudad || pDes.nombrePuerto || (typeof pDes === 'string' ? pDes : '');
                        const trayectoEscala = (origenEsc && destinoEsc) ? `${origenEsc} - ${destinoEsc}` : nombreRuta;

                        const arrPagos = vPadre.pagos || venta.pagos || [];
                        const objPago = arrPagos.length > 0 ? arrPagos[0] : {};
                        const metodoPago = String(objPago.metodo || objPago.metodoPago || objPago.tipoPago || venta.metodoPago || 'EFECTIVO').toUpperCase();

                        let fechaTransaccion = vPadre.fecha || vPadre.fechaVenta || venta.fechaVenta || venta.fecha || venta.fechaCreacion || venta.fechaReserva;
                        if (fechaTransaccion && typeof fechaTransaccion === 'string' && fechaTransaccion.includes('T')) {
                            fechaTransaccion = fechaTransaccion.split('T')[0];
                        }
                        if (!fechaTransaccion) fechaTransaccion = v.fechaSalida;
                        fechaTransaccion = normalizarFecha(fechaTransaccion);

                        if (estadoVenta === 'VÁLIDO' || estadoVenta === 'VENDIDO') {
                            ingGlobal += monto;
                            bolGlobal++;
                            
                            historialGlobal.push({ 
                                idVenta: idVentaReal, 
                                pasajero: pasajeroNombre, 
                                monto: monto, 
                                trayecto: trayectoEscala, 
                                nombreNave, 
                                fecha: fechaTransaccion 
                            });

                            if (fechaTransaccion === hoyStr) {
                                ingHoy += monto;
                                bolHoy++;
                                pasHoy++;
                            }

                            if (mapDias[fechaTransaccion]) mapDias[fechaTransaccion].ingresos += monto;
                            
                            mapRutas[trayectoEscala] = (mapRutas[trayectoEscala] || 0) + monto;
                            mapNaves[nombreNave] = (mapNaves[nombreNave] || 0) + 1; 
                            mapPagos[metodoPago] = (mapPagos[metodoPago] || 0) + monto;
                            
                        } else if (estadoVenta === 'CANCELADO' || estadoVenta === 'ANULADO') {
                            anuGlobal++; 
                            
                            if (mapDias[fechaTransaccion]) mapDias[fechaTransaccion].perdidas += monto;
                        }
                    });
                } catch (e) {
                }
            }));

            const navesOp = naves.filter((n: any) => String(n.estado).toUpperCase() === 'ACTIVO' || String(n.estado).toUpperCase() === 'OPERATIVO').length;
            const navesMant = naves.filter((n: any) => String(n.estado).toUpperCase() === 'MANTENIMIENTO').length;

            setKpis({
                ingresosHoy: ingHoy, ingresosGlobal: ingGlobal,
                boletosHoy: bolHoy, boletosGlobal: bolGlobal,
                viajesHoy: viaHoy, ticketPromedio: bolGlobal > 0 ? ingGlobal / bolGlobal : 0, 
                pasajerosHoy: pasHoy, anuladasGlobal: anuGlobal, 
                navesOperativas: navesOp, navesMantenimiento: navesMant
            });

            setGraficoVentasDia(Object.entries(mapDias)
                .sort((a, b) => a[0].localeCompare(b[0]))
                .map(([f, val]) => ({ 
                    fecha: f.split('-').slice(1).reverse().join('/'), 
                    ingresos: val.ingresos, 
                    perdidas: val.perdidas 
                }))
                .slice(-7) 
            );

            setGraficoRutas(Object.entries(mapRutas).map(([ruta, ingresos]) => ({ ruta, ingresos })).sort((a, b) => b.ingresos - a.ingresos));
            setGraficoNaves(Object.entries(mapNaves).map(([nave, boletos]) => ({ nave, boletos })).sort((a, b) => b.boletos - a.boletos).slice(0, 5));
            
            setGraficoPagos(Object.entries(mapPagos).map(([name, value]) => ({ name, value })).sort((a, b) => b.value - a.value));

            historialGlobal.sort((a, b) => {
                const diff = new Date(b.fecha).getTime() - new Date(a.fecha).getTime();
                return diff === 0 ? b.idVenta - a.idVenta : diff;
            });
            setUltimasVentas(historialGlobal.slice(0, 4));
            
            viajesHoyTemp.sort((a, b) => {
                const fA = normalizarFecha(a.fechaSalida);
                const fB = normalizarFecha(b.fechaSalida);
                const timeA = Array.isArray(a.horaZarpe) ? `${String(a.horaZarpe[0]).padStart(2,'0')}:${String(a.horaZarpe[1]||0).padStart(2,'0')}` : String(a.horaZarpe || '00:00').substring(0,5);
                const timeB = Array.isArray(b.horaZarpe) ? `${String(b.horaZarpe[0]).padStart(2,'0')}:${String(b.horaZarpe[1]||0).padStart(2,'0')}` : String(b.horaZarpe || '00:00').substring(0,5);
                const datetimeA = `${fA}T${timeA}`;
                const datetimeB = `${fB}T${timeB}`;
                return datetimeA.localeCompare(datetimeB);
            });
            setViajesDelDia(viajesHoyTemp.slice(0, 4));

        } catch (error) {
            notificarError("Error conectando con el servidor de la base de datos.");
        }
    };

    const CustomTooltipMoney = ({ active, payload, label }: any) => {
        if (active && payload && payload.length) {
            return (
                <div className="bg-[#2A3F54] text-white p-3 rounded-lg shadow-xl border border-gray-700 text-xs z-50">
                    <p className="font-bold mb-1 text-gray-300">{label || payload[0].name}</p>
                    <p className="text-[#1ABB9C] font-black text-sm">{formatMoney(payload[0].value)}</p>
                </div>
            );
        }
        return null;
    };

    const CustomTooltipLine = ({ active, payload, label }: any) => {
        if (active && payload && payload.length) {
            return (
                <div className="bg-[#2A3F54] text-white p-3 rounded-lg shadow-xl border border-gray-700 text-xs z-50 min-w-[150px]">
                    <p className="font-bold mb-2 text-gray-300 border-b border-gray-600 pb-1">{label}</p>
                    {payload.map((entry: any, index: number) => (
                        <div key={index} className="flex justify-between items-center gap-4 mb-1">
                            <div className="flex items-center gap-1.5">
                                <div className="w-2 h-2 rounded-full" style={{backgroundColor: entry.color}}></div>
                                <span className="text-gray-300 font-medium">{entry.name}:</span>
                            </div>
                            <span className="font-black" style={{color: entry.color}}>{formatMoney(entry.value)}</span>
                        </div>
                    ))}
                </div>
            );
        }
        return null;
    };

    const renderCustomizedLabel = ({ cx, cy, midAngle, innerRadius, outerRadius, percent }: any) => {
        const RADIAN = Math.PI / 180;
        const radius = innerRadius + (outerRadius - innerRadius) * 0.5;
        const x = cx + radius * Math.cos(-midAngle * RADIAN);
        const y = cy + radius * Math.sin(-midAngle * RADIAN);
        if(percent < 0.05) return null; 
        return (
            <text x={x} y={y} fill="white" fontSize={11} fontWeight="bold" textAnchor="middle" dominantBaseline="central">
                {`${(percent * 100).toFixed(0)}%`}
            </text>
        );
    };

    return (
        <MainLayout>
            <div className="max-w-7xl mx-auto pb-6">
                
                {/* HEADER  */}
                <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 mb-8 flex flex-col md:flex-row md:items-center justify-between gap-4 animate-in slide-in-from-top-4">
                    <div>
                        <h1 className="text-2xl font-bold text-[#2A3F54] flex items-center gap-3">
                            <div className="p-2 bg-blue-50 rounded-lg text-[#1ABB9C]">
                                <Activity size={24} strokeWidth={2.5}/>
                            </div>
                            Resumen Ejecutivo
                        </h1>
                        <p className="text-sm text-gray-400 mt-1 ml-1">Resultados operativos en tiempo real ({new Date().toLocaleDateString('es-PE')})</p>
                    </div>
                    <div className="text-right hidden sm:block bg-white px-5 py-2.5 rounded-xl shadow-sm border border-gray-100">
                        <div className="text-2xl font-mono font-black text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-indigo-600 tracking-tight">
                            {horaSistema.toLocaleTimeString('es-PE', { timeZone: 'America/Lima', hour: '2-digit', minute:'2-digit', second:'2-digit' })}
                        </div>
                        <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Hora Local</p>
                    </div>
                </div>

                {loading ? (
                    <div className="flex flex-col justify-center items-center py-32 text-blue-600">
                        <div className="animate-spin rounded-full h-14 w-14 border-b-4 border-blue-600 mb-4 shadow-lg shadow-blue-200"></div>
                        <p className="font-bold text-[#2A3F54] text-lg animate-pulse">Analizando base de datos...</p>
                    </div>
                ) : (
                    <div className="space-y-6 animate-in fade-in duration-500">
                        
                        {/* 1. KPIs CLAVE */}
                        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
                            <div className="bg-gradient-to-br from-emerald-500 to-teal-600 text-white p-5 rounded-2xl shadow-lg shadow-emerald-500/30 relative overflow-hidden group hover:-translate-y-1 transition-all flex flex-col justify-between min-h-[110px]">
                                <div className="absolute -right-2 -top-2 p-2 opacity-20 group-hover:scale-125 group-hover:rotate-12 transition-all duration-500 pointer-events-none">
                                    <DollarSign size={64} />
                                </div>
                                <div className="relative z-10">
                                    <p className="text-emerald-100 text-[10px] font-bold uppercase tracking-widest mb-1 flex items-center gap-1"><DollarSign size={12}/> Ingresos Hoy</p>
                                    <h2 className="text-2xl lg:text-3xl font-black truncate">{formatMoney(kpis.ingresosHoy)}</h2>
                                </div>
                                <div className="mt-2 relative z-10">
                                    <p className="text-[9px] text-emerald-50 font-bold bg-white/20 w-fit px-2 py-0.5 rounded backdrop-blur-sm border border-white/10">Global: {formatMoney(kpis.ingresosGlobal)}</p>
                                </div>
                            </div>

                            <div className="bg-gradient-to-br from-blue-500 to-indigo-600 text-white p-5 rounded-2xl shadow-lg shadow-blue-500/30 relative overflow-hidden group hover:-translate-y-1 transition-all flex flex-col justify-between min-h-[110px]">
                                <div className="absolute -right-2 -top-2 p-2 opacity-20 group-hover:scale-125 group-hover:-rotate-12 transition-all duration-500 pointer-events-none">
                                    <Ticket size={64} />
                                </div>
                                <div className="relative z-10">
                                    <p className="text-blue-100 text-[10px] font-bold uppercase tracking-widest mb-1 flex items-center gap-1"><Ticket size={12}/> Boletos Hoy</p>
                                    <h2 className="text-2xl lg:text-3xl font-black truncate">{kpis.boletosHoy}</h2>
                                </div>
                                <div className="mt-2 relative z-10">
                                    <p className="text-[9px] text-blue-50 font-bold bg-white/20 w-fit px-2 py-0.5 rounded backdrop-blur-sm border border-white/10">Global: {kpis.boletosGlobal} tkts</p>
                                </div>
                            </div>

                            <div className="bg-gradient-to-br from-teal-500 to-emerald-700 text-white p-5 rounded-2xl shadow-lg shadow-teal-500/30 relative overflow-hidden group hover:-translate-y-1 transition-all flex flex-col justify-between min-h-[110px]">
                                <div className="absolute -right-2 -top-2 p-2 opacity-20 group-hover:scale-125 group-hover:rotate-12 transition-all duration-500 pointer-events-none">
                                    <Tag size={64} />
                                </div>
                                <div className="relative z-10">
                                    <p className="text-teal-100 text-[10px] font-bold uppercase tracking-widest mb-1 flex items-center gap-1"><Tag size={12}/> Ticket Promed.</p>
                                    <h2 className="text-2xl lg:text-3xl font-black truncate">{formatMoney(kpis.ticketPromedio)}</h2>
                                </div>
                                <div className="mt-2 relative z-10">
                                    <p className="text-[9px] text-teal-50 font-bold bg-white/20 w-fit px-2 py-0.5 rounded backdrop-blur-sm border border-white/10">Promedio General</p>
                                </div>
                            </div>

                            <div className="bg-gradient-to-br from-cyan-500 to-blue-500 text-white p-5 rounded-2xl shadow-lg shadow-cyan-500/30 relative overflow-hidden group hover:-translate-y-1 transition-all flex flex-col justify-between min-h-[110px]">
                                <div className="absolute -right-2 -top-2 p-2 opacity-20 group-hover:scale-125 group-hover:-rotate-12 transition-all duration-500 pointer-events-none">
                                    <Ship size={64} />
                                </div>
                                <div className="relative z-10">
                                    <p className="text-cyan-100 text-[10px] font-bold uppercase tracking-widest mb-1 flex items-center gap-1"><Ship size={12}/> Viajes Hoy</p>
                                    <h2 className="text-2xl lg:text-3xl font-black truncate">{kpis.viajesHoy}</h2>
                                </div>
                                <div className="mt-2 relative z-10">
                                    <p className="text-[9px] text-cyan-50 font-bold bg-white/20 w-fit px-2 py-0.5 rounded backdrop-blur-sm border border-white/10">Zarpes en itinerario</p>
                                </div>
                            </div>

                            <div className="bg-gradient-to-br from-indigo-500 to-violet-600 text-white p-5 rounded-2xl shadow-lg shadow-indigo-500/30 relative overflow-hidden group hover:-translate-y-1 transition-all flex flex-col justify-between min-h-[110px]">
                                <div className="absolute -right-2 -top-2 p-2 opacity-20 group-hover:scale-125 group-hover:rotate-12 transition-all duration-500 pointer-events-none">
                                    <Users size={64} />
                                </div>
                                <div className="relative z-10">
                                    <p className="text-indigo-100 text-[10px] font-bold uppercase tracking-widest mb-1 flex items-center gap-1"><Users size={12}/> Pasajeros Hoy</p>
                                    <h2 className="text-2xl lg:text-3xl font-black truncate">{kpis.pasajerosHoy}</h2>
                                </div>
                                <div className="mt-2 relative z-10">
                                    <p className="text-[9px] text-indigo-50 font-bold bg-white/20 w-fit px-2 py-0.5 rounded backdrop-blur-sm border border-white/10">Puestos efectivos</p>
                                </div>
                            </div>

                            {/* TARJETA PÉRDIDAS  */}
                            <div className="bg-gradient-to-br from-rose-500 to-red-600 text-white p-5 rounded-2xl shadow-lg shadow-rose-500/30 relative overflow-hidden group hover:-translate-y-1 transition-all flex flex-col justify-between min-h-[110px]">
                                <div className="absolute -right-2 -top-2 p-2 opacity-20 group-hover:scale-125 group-hover:-rotate-12 transition-all duration-500 pointer-events-none">
                                    <Ban size={64} />
                                </div>
                                <div className="relative z-10">
                                    <p className="text-rose-100 text-[10px] font-bold uppercase tracking-widest mb-1 flex items-center gap-1"><Ban size={12}/> Anulaciones (Total)</p>
                                    <h2 className="text-2xl lg:text-3xl font-black truncate">{kpis.anuladasGlobal} tkts</h2>
                                </div>
                                <div className="mt-2 relative z-10">
                                    <p className="text-[9px] text-rose-50 font-bold bg-white/20 w-fit px-2 py-0.5 rounded backdrop-blur-sm border border-white/10">Histórico Acumulado</p>
                                </div>
                            </div>
                        </div>

                        {/*  2. GRÁFICOS  */}
                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                            
                            {/* Gráfico 1: Ventas y Pérdidas */}
                            <div className="bg-gradient-to-b from-emerald-50/50 to-white p-6 rounded-2xl shadow-lg shadow-emerald-100/50 border border-emerald-50">
                                <h3 className="text-sm font-black text-emerald-800 mb-6 flex items-center gap-2">
                                    <TrendingUp size={18} className="text-emerald-500"/> Ingresos y Devoluciones (Últimos 7 Días)
                                </h3>
                                <div className="h-64 w-full">
                                    {graficoVentasDia.length === 0 ? (
                                        <div className="flex h-full items-center justify-center text-emerald-400 text-sm italic font-medium">Sin datos registrados</div>
                                    ) : (
                                        <ResponsiveContainer width="100%" height="100%">
                                            <LineChart data={graficoVentasDia} margin={{ top: 5, right: 20, left: -20, bottom: 0 }}>
                                                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E5E7EB" />
                                                <XAxis dataKey="fecha" axisLine={false} tickLine={false} tick={{fontSize: 10, fill: '#6B7280', fontWeight: 600}} dy={10} />
                                                <YAxis axisLine={false} tickLine={false} tick={{fontSize: 10, fill: '#6B7280'}} tickFormatter={(val) => `S/${val}`} />
                                                <Tooltip content={<CustomTooltipLine />} cursor={{stroke: '#9CA3AF', strokeWidth: 1, strokeDasharray: '4 4'}} />
                                                <Legend wrapperStyle={{fontSize: '11px', fontWeight: 'bold'}} verticalAlign="top" height={36}/>
                                                <Line name="Ingresos" type="monotone" dataKey="ingresos" stroke="#10B981" strokeWidth={4} dot={{r: 4, fill: '#10B981', strokeWidth: 2, stroke: '#fff'}} activeDot={{r: 6}} />
                                                <Line name="Devoluciones" type="monotone" dataKey="perdidas" stroke="#EF4444" strokeWidth={4} dot={{r: 4, fill: '#EF4444', strokeWidth: 2, stroke: '#fff'}} activeDot={{r: 6}} />
                                            </LineChart>
                                        </ResponsiveContainer>
                                    )}
                                </div>
                            </div>

                            {/* Gráfico 2: Rutas (SCROLL HORIZONTAL) */}
                            <div className="bg-gradient-to-b from-blue-50/50 to-white p-6 rounded-2xl shadow-lg shadow-blue-100/50 border border-blue-50 flex flex-col h-[380px]">
                                <h3 className="text-sm font-black text-blue-800 mb-6 flex items-center gap-2">
                                    <MapPin size={18} className="text-blue-500"/> Top Ingresos por Escala (Global)
                                </h3>
                                <div className="flex-1 w-full overflow-x-auto custom-scrollbar pb-2">
                                    {graficoRutas.length === 0 ? (
                                        <div className="flex h-full items-center justify-center text-blue-400 text-sm italic font-medium">Sin datos registrados</div>
                                    ) : (
                                        <div style={{ width: Math.max(500, graficoRutas.length * 90), height: '100%' }}>
                                            <ResponsiveContainer width="100%" height="100%">
                                                <BarChart data={graficoRutas} margin={{ top: 5, right: 5, left: -20, bottom: 60 }}>
                                                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#DBEAFE" />
                                                    <XAxis 
                                                        dataKey="ruta" 
                                                        axisLine={false} 
                                                        tickLine={false} 
                                                        tick={{fontSize: 10, fill: '#1E3A8A', fontWeight: 600}} 
                                                        interval={0}
                                                        angle={-35}
                                                        textAnchor="end"
                                                        dy={10} 
                                                    />
                                                    <YAxis axisLine={false} tickLine={false} tick={{fontSize: 10, fill: '#1E3A8A'}} tickFormatter={(val) => `S/${val}`} />
                                                    <Tooltip content={<CustomTooltipMoney />} cursor={{fill: '#EFF6FF'}} />
                                                    <Bar dataKey="ingresos" fill="#3B82F6" radius={[6, 6, 0, 0]} barSize={45}>
                                                        {graficoRutas.map((entry, index) => (
                                                            <Cell key={`cell-${index}`} fill={index === 0 ? '#2563EB' : '#60A5FA'} />
                                                        ))}
                                                    </Bar>
                                                </BarChart>
                                            </ResponsiveContainer>
                                        </div>
                                    )}
                                </div>
                            </div>

                            {/* Gráfico 3: Pagos (GRÁFICO DE PASTEL CON PORCENTAJES) */}
                            <div className="bg-gradient-to-b from-orange-50/50 to-white p-6 rounded-2xl shadow-lg shadow-orange-100/50 border border-orange-50">
                                <h3 className="text-sm font-black text-orange-800 mb-2 flex items-center gap-2">
                                    <CreditCard size={18} className="text-orange-500"/> Medios de Pago (Global)
                                </h3>
                                <div className="h-64 w-full">
                                    {graficoPagos.length === 0 ? (
                                        <div className="flex h-full items-center justify-center text-orange-400 text-sm italic font-medium">Sin datos registrados</div>
                                    ) : (
                                        <ResponsiveContainer width="100%" height="100%">
                                            <PieChart>
                                                <Pie 
                                                    data={graficoPagos} 
                                                    cx="50%" 
                                                    cy="50%" 
                                                    innerRadius={0} 
                                                    outerRadius={100} 
                                                    dataKey="value" 
                                                    stroke="white" 
                                                    strokeWidth={2}
                                                    labelLine={false}
                                                    label={renderCustomizedLabel} 
                                                >
                                                    {graficoPagos.map((entry, index) => (
                                                        <Cell key={`cell-${index}`} fill={COLORES_PAGO[index % COLORES_PAGO.length]} />
                                                    ))}
                                                </Pie>
                                                <Tooltip content={<CustomTooltipMoney />} />
                                                <Legend iconType="circle" wrapperStyle={{fontSize: '12px', fontWeight: 'bold', color: '#7C2D12'}} />
                                            </PieChart>
                                        </ResponsiveContainer>
                                    )}
                                </div>
                            </div>

                            {/* Gráfico 4: Naves */}
                            <div className="bg-gradient-to-b from-indigo-50/50 to-white p-6 rounded-2xl shadow-lg shadow-indigo-100/50 border border-indigo-50">
                                <h3 className="text-sm font-black text-indigo-800 mb-6 flex items-center gap-2">
                                    <Ship size={18} className="text-indigo-500"/> Demanda por Nave (Boletos)
                                </h3>
                                <div className="h-64 w-full">
                                    {graficoNaves.length === 0 ? (
                                        <div className="flex h-full items-center justify-center text-indigo-400 text-sm italic font-medium">Sin datos registrados</div>
                                    ) : (
                                        <ResponsiveContainer width="100%" height="100%">
                                            <BarChart data={graficoNaves} layout="vertical" margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
                                                <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#E0E7FF" />
                                                <XAxis type="number" axisLine={false} tickLine={false} tick={{fontSize: 10, fill: '#312E81', fontWeight: 600}} />
                                                <YAxis dataKey="nave" type="category" axisLine={false} tickLine={false} tick={{fontSize: 10, fill: '#312E81', fontWeight: 'bold'}} width={100} />
                                                <Tooltip cursor={{fill: '#EEF2FF'}} contentStyle={{borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)'}} />
                                                <Bar dataKey="boletos" radius={[0, 6, 6, 0]} barSize={25}>
                                                    {graficoNaves.map((entry, index) => (
                                                        <Cell key={`cell-${index}`} fill={index === 0 ? '#4F46E5' : '#818CF8'} />
                                                    ))}
                                                </Bar>
                                            </BarChart>
                                        </ResponsiveContainer>
                                    )}
                                </div>
                            </div>

                        </div>

                        {/* 3. TABLAS RESUMEN */}
                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                            
                            {/* Tabla 1: Últimas Ventas */}
                            <div className="bg-white rounded-2xl shadow-lg shadow-emerald-100/50 border border-emerald-100 overflow-hidden flex flex-col h-full">
                                <div className="p-4 flex justify-between items-center bg-gradient-to-r from-emerald-500 to-teal-500 text-white">
                                    <h3 className="font-bold text-sm flex items-center gap-2"><Ticket size={16} className="text-emerald-100"/> Últimas Ventas Generales</h3>
                                </div>
                                <div className="overflow-x-auto flex-1">
                                    <table className="w-full text-xs text-left">
                                        <thead className="text-emerald-700 uppercase bg-emerald-50/50 border-b border-emerald-100 font-bold">
                                            <tr>
                                                <th className="px-4 py-3">Pasajero / Ticket</th>
                                                <th className="px-4 py-3">Trayecto / Nave</th>
                                                <th className="px-4 py-3 text-right">Monto</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-emerald-50">
                                            {ultimasVentas.length === 0 ? (
                                                <tr><td colSpan={3} className="p-10 text-center text-emerald-400 italic font-medium">No hay ventas registradas</td></tr>
                                            ) : ultimasVentas.map((v, i) => (
                                                <tr key={i} className="hover:bg-emerald-50/40 transition-colors">
                                                    <td className="px-4 py-3">
                                                        <div className="font-bold text-[#2A3F54] truncate max-w-[150px]">{v.pasajero}</div>
                                                        <div className="text-[10px] text-gray-400 font-mono">TKT-{v.idVenta}</div>
                                                    </td>
                                                    <td className="px-4 py-3">
                                                        <div className="font-bold text-gray-600 truncate max-w-[150px]">{v.trayecto}</div>
                                                        <div className="text-[10px] text-gray-400">{v.nombreNave}</div>
                                                    </td>
                                                    <td className="px-4 py-3 text-right">
                                                        <span className="font-black text-emerald-600 block bg-white px-2 py-1 rounded w-fit ml-auto border border-emerald-100 shadow-sm">
                                                            {formatMoney(v.monto)}
                                                        </span>
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            </div>

                            {/* Tabla 2: Viajes */}
                            <div className="bg-white rounded-2xl shadow-lg shadow-blue-100/50 border border-blue-100 overflow-hidden flex flex-col h-full">
                                <div className="p-4 flex justify-between items-center bg-gradient-to-r from-blue-500 to-indigo-500 text-white">
                                    <h3 className="font-bold text-sm flex items-center gap-2"><Clock size={16} className="text-blue-100"/> Próximos Viajes Programados</h3>
                                </div>
                                <div className="overflow-x-auto flex-1">
                                    <table className="w-full text-xs text-left">
                                        <thead className="text-blue-700 uppercase bg-blue-50/50 border-b border-blue-100 font-bold">
                                            <tr>
                                                <th className="px-4 py-3">Salida</th>
                                                <th className="px-4 py-3">Ruta / Embarcación</th>
                                                <th className="px-4 py-3 text-center">Estado</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-blue-50">
                                            {viajesDelDia.length === 0 ? (
                                                <tr><td colSpan={3} className="p-10 text-center text-blue-400 italic font-medium">No hay próximos viajes programados</td></tr>
                                            ) : viajesDelDia.map((v, i) => (
                                                <tr key={i} className="hover:bg-blue-50/40 transition-colors">
                                                    <td className="px-4 py-3 font-mono font-black text-[#2A3F54] whitespace-nowrap">
                                                        {v.horaLimpia}
                                                        <div className="text-[10px] text-gray-500 font-sans font-medium mt-0.5">{normalizarFecha(v.fechaSalida)}</div>
                                                    </td>
                                                    <td className="px-4 py-3">
                                                        <div className="font-bold text-gray-700 truncate max-w-[150px]">{v.nombreRuta}</div>
                                                        <div className="text-[10px] text-gray-500 flex items-center gap-1 font-medium mt-0.5"><Ship size={10}/> {v.nombreNave}</div>
                                                    </td>
                                                    <td className="px-4 py-3 text-center">
                                                        <span className={`px-2.5 py-1 rounded-md text-[9px] font-black tracking-widest border shadow-sm ${
                                                            v.estado === 'FINALIZADO' ? 'bg-green-50 text-green-600 border-green-200' :
                                                            v.estado === 'PROGRAMADO' ? 'bg-blue-50 text-blue-600 border-blue-200' : 'bg-red-50 text-red-600 border-red-200'
                                                        }`}>
                                                            {v.estado}
                                                        </span>
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            </div>

                        </div>
                    </div>
                )}
            </div>
        </MainLayout>
    );
};

export default DashboardAdmin;