import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import MainLayout from '../../layouts/MainLayout';
import { getViajes, getEmbarcaciones } from '../../services/configService';
import { getManifiesto } from '../../services/ventaService';
import { getCurrentUser } from '../../services/authService';
import ModalCaja from '../../components/ModalCaja';
import { 
    Ticket, Users, Ship, AlertTriangle, ArrowRight, 
    Calendar, Activity, CheckCircle, Clock, Timer, Lock,
    ChevronLeft,
    ChevronRight
} from 'lucide-react';
import { AreaChart, Area, PieChart, Pie, Cell, Tooltip as RechartsTooltip, ResponsiveContainer, XAxis } from 'recharts';

interface SalidaOperativa {
    id: number;
    ruta: string;
    origen: string;
    destino: string;
    hora: string;
    fecha: string;
    fechaRaw: any; 
    nave: string;
    ocupados: number;
    total: number;
    estadoBackend: string;
    estadoVisual: 'A TIEMPO' | 'RETRASADO' | 'LLENO' | 'CANCELADO' | 'EN CURSO';
    fechaObjeto: Date;
}

interface AlertaOperativa {
    id: string;
    titulo: string;
    mensaje: string;
    tipo: 'URGENTE' | 'INFO' | 'EXITO';
    hora: string;
}

const DashboardAsesor = () => {
    const navigate = useNavigate();
    const [salidas, setSalidas] = useState<SalidaOperativa[]>([]);
    const [alertas, setAlertas] = useState<AlertaOperativa[]>([]);
    const [loading, setLoading] = useState(true);
    const [modalCajaAbierto, setModalCajaAbierto] = useState(false);
    
    const [horaPeru, setHoraPeru] = useState(new Date());

    // 🔥 ESTADOS PARA LA PAGINACIÓN 🔥
    const [paginaActual, setPaginaActual] = useState(1);
    const salidasPorPagina = 5;

    useEffect(() => {
        const timer = setInterval(() => setHoraPeru(new Date()), 1000);
        return () => clearInterval(timer);
    }, []);
    
    const [graficoVentas, setGraficoVentas] = useState<any[]>([]);
    const [graficoPagos, setGraficoPagos] = useState<any[]>([]);
    const COLORES_PAGO = ['#10B981', '#3B82F6', '#F59E0B', '#8B5CF6'];

    const [kpis, setKpis] = useState({
        ventasMiasHoy: 0,
        dineroMioHoy: 0,
        misVentasSemana: 0,
        proximoZarpe: null as SalidaOperativa | null
    });

    const obtenerRangoSemanal = () => {
        const hoy = new Date();
        const diaSemana = hoy.getDay(); 
        const diff = hoy.getDate() - diaSemana + (diaSemana === 0 ? -6 : 1); 
        const lunes = new Date(hoy);
        lunes.setDate(diff);
        lunes.setHours(0, 0, 0, 0); 
        const domingo = new Date(lunes);
        domingo.setDate(lunes.getDate() + 6);
        domingo.setHours(23, 59, 59, 999); 
        return { lunes, domingo };
    };

    const formatearHora = (horaRaw: any) => {
        if (!horaRaw) return '';
        let h = 0, m = '00';
        if (Array.isArray(horaRaw)) {
            h = horaRaw[0]; m = String(horaRaw[1] || 0).padStart(2, '0');
        } else {
            const parts = String(horaRaw).split(':');
            h = parseInt(parts[0]);
            m = String(parts[1] || '0').padStart(2, '0');
        }
        const ampm = h >= 12 ? 'PM' : 'AM';
        h = h % 12 || 12; 
        return `${h}:${m} ${ampm}`;
    };

    const formatearFecha = (fechaRaw: any) => {
        if (!fechaRaw) return '';
        if (Array.isArray(fechaRaw)) return `${String(fechaRaw[2]).padStart(2,'0')}/${String(fechaRaw[1]).padStart(2,'0')}/${fechaRaw[0]}`;
        const [y, m, d] = String(fechaRaw).split('T')[0].split('-');
        return `${d}/${m}/${y}`;
    };

    const parsearAObjetoFecha = (f: any, h: any) => {
        let y = 2024, m = 1, d = 1, hr = 0, min = 0;
        if (Array.isArray(f)) { y = f[0]; m = f[1]; d = f[2]; } 
        else if (f) { const p = String(f).split('T')[0].split('-'); y = parseInt(p[0]); m = parseInt(p[1]); d = parseInt(p[2]); }
        if (Array.isArray(h)) { hr = h[0]; min = h[1] || 0; } 
        else if (h) { const hp = String(h).split(':'); hr = parseInt(hp[0]); min = parseInt(hp[1] || '0'); }
        return new Date(y, m - 1, d, hr, min);
    };

    const extraeStringFecha = (f: any) => {
        if (!f) return '';
        if (Array.isArray(f)) return `${f[0]}-${String(f[1]).padStart(2,'0')}-${String(f[2]).padStart(2,'0')}`;
        return String(f).split('T')[0];
    };

    const calcPorcentaje = (ocupados: number, total: number) => total > 0 ? Math.round((ocupados / total) * 100) : 0;

    const getColorBarra = (pct: number) => {
        if (pct >= 100) return 'bg-red-500';      
        if (pct >= 80) return 'bg-orange-400';    
        return 'bg-[#1ABB9C]';                    
    };

    const cargarDashboard = async () => {
        setLoading(true);
        try {
            const usuarioActual = getCurrentUser();
            const miNombre = String(usuarioActual?.nombreCompleto || '').trim().toLowerCase();

            const [data, flotaData] = await Promise.all([
                getViajes(),
                getEmbarcaciones().catch(() => []) 
            ]);

            const { lunes, domingo } = obtenerRangoSemanal();
            const ahora = new Date();
            
            const tzOffset = ahora.getTimezoneOffset() * 60000;
            const localISOTime = (new Date(ahora.getTime() - tzOffset)).toISOString().slice(0, -1);
            const hoyFormat = localISOTime.split('T')[0];

            let misVentasHoy = 0;
            let miDineroHoy = 0;
            let misVentasSemana = 0;

            const historicoDias: any = {};
            const metodosPago: any = {};
            const viajesProcesados: SalidaOperativa[] = [];

            const viajesRecientes = Array.isArray(data) ? data.slice(0, 50) : [];

            for (const vBase of viajesRecientes) {
                const v = vBase as any;

                if (String(v.estado || '').toUpperCase() === 'ELIMINADO') continue;

                const fechaObj = parsearAObjetoFecha(v.fechaSalida, v.horaZarpe);
                const fechaSalidaStr = extraeStringFecha(v.fechaSalida);
                const esDeEstaSemana = fechaObj >= lunes && fechaObj <= domingo;
                
                const idNaveReal = v.idEmbarcacion || v.embarcacion?.idEmbarcacion;
                const naveReal = (flotaData as any[]).find(n => n.idEmbarcacion === idNaveReal);
                let ocupadosReales = 0;

                try {
                    const manifiesto = await getManifiesto(v.idViaje || v.id_viaje);
                    const activos = Array.isArray(manifiesto) ? manifiesto.filter((p: any) => p.estado === 'VENDIDO' || p.estado === 'RESERVADO') : [];
                    ocupadosReales = activos.length;

                    activos.forEach((p: any) => {
                        const vendedorTicket = String(p.vendedor || p.nombreVendedor || '').trim().toLowerCase();
                        
                        const primerNombreAsesor = miNombre.split(' ')[0];
                        const esMiVenta = (vendedorTicket === miNombre) || (primerNombreAsesor && vendedorTicket.includes(primerNombreAsesor));

                        if (esMiVenta) {
                            const diaVenta = p.fechaVenta ? extraeStringFecha(p.fechaVenta) : fechaSalidaStr;
                            const [vy, vm, vd] = diaVenta.split('-').map(Number);
                            const fechaVentaObj = new Date(vy, vm - 1, vd);

                            if (fechaVentaObj >= lunes && fechaVentaObj <= domingo) {
                                misVentasSemana++;
                                const fCorta = diaVenta.substring(5, 10);
                                historicoDias[fCorta] = (historicoDias[fCorta] || 0) + 1;
                            }

                            if (diaVenta === hoyFormat) {
                                misVentasHoy++;
                                miDineroHoy += parseFloat(p.montoFinal ?? p.monto ?? p.precio ?? 0);
                                const pago = p.metodoPago || 'EFECTIVO';
                                metodosPago[pago] = (metodosPago[pago] || 0) + 1;
                            }
                        }
                    });
                } catch (e) {}

                if (esDeEstaSemana || fechaObj > ahora) {
                    const capacidadReal = naveReal?.capacidad || (v.cuposDisponibles + ocupadosReales) || 0;
                    let estadoVis: any = 'A TIEMPO';
                    if (ocupadosReales >= capacidadReal && capacidadReal > 0) estadoVis = 'LLENO';
                    if (v.estado === 'CANCELADO') estadoVis = 'CANCELADO';
                    if (fechaObj < ahora && v.estado !== 'CANCELADO') estadoVis = 'EN CURSO';

                    const nombreRutaFinal = v.nombreRuta || v.ruta?.nombreRuta || 'Ruta Desconocida';
                    const nombreNaveFinal = v.nombreEmbarcacion || v.embarcacion?.nombre || 'Nave Desconocida';
                    const origenFinal = v.puertoOrigen?.ciudad || v.ruta?.origen?.ciudad || nombreRutaFinal.split('-')[0]?.trim() || '';
                    const destinoFinal = v.puertoDestino?.ciudad || v.ruta?.destino?.ciudad || nombreRutaFinal.split('-')[1]?.trim() || '';

                    viajesProcesados.push({
                        id: v.idViaje || v.id_viaje,
                        ruta: nombreRutaFinal,
                        origen: origenFinal,
                        destino: destinoFinal,
                        hora: formatearHora(v.horaZarpe),
                        fecha: formatearFecha(v.fechaSalida),
                        fechaRaw: v.fechaSalida, 
                        nave: nombreNaveFinal,
                        ocupados: ocupadosReales,
                        total: capacidadReal,
                        estadoBackend: v.estado,
                        estadoVisual: estadoVis,
                        fechaObjeto: fechaObj
                    });
                }
            }

            viajesProcesados.sort((a, b) => a.fechaObjeto.getTime() - b.fechaObjeto.getTime());
            setSalidas(viajesProcesados);
            setPaginaActual(1); // Reiniciar paginación al recargar datos

            const proximo = viajesProcesados.find(v => v.fechaObjeto > ahora && v.estadoVisual !== 'CANCELADO');

            setKpis({
                ventasMiasHoy: misVentasHoy,
                dineroMioHoy: miDineroHoy,
                misVentasSemana: misVentasSemana,
                proximoZarpe: proximo || null
            });

            setGraficoVentas(Object.entries(historicoDias).map(([name, value]) => ({ name, value })).sort((a,b) => a.name.localeCompare(b.name)));
            setGraficoPagos(Object.entries(metodosPago).map(([name, value]) => ({ name, value })));

            // Aunque calculemos alertas, ya no las mostraremos visualmente para dar todo el espacio a la caja
            const nuevasAlertas: AlertaOperativa[] = [];
            // ... (Se mantiene lógica por debajo por si se ocupa en el futuro)
            setAlertas(nuevasAlertas);

        } catch (error) {
            console.error("Error cargando dashboard:", error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => { cargarDashboard(); }, []);

    // 🔥 LÓGICA DE PAGINACIÓN CALCULADA 🔥
    const indexUltimaSalida = paginaActual * salidasPorPagina;
    const indexPrimeraSalida = indexUltimaSalida - salidasPorPagina;
    const salidasPaginadas = salidas.slice(indexPrimeraSalida, indexUltimaSalida);
    const totalPaginas = Math.ceil(salidas.length / salidasPorPagina);

    const irPaginaAnterior = () => setPaginaActual((prev) => Math.max(prev - 1, 1));
    const irPaginaSiguiente = () => setPaginaActual((prev) => Math.min(prev + 1, totalPaginas));

    return (
        <MainLayout>
            <div className="max-w-7xl mx-auto pb-3 relative">
                
                {/* HEADER */}
                <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 mb-8 flex flex-col md:flex-row md:items-center justify-between gap-4 animate-in slide-in-from-top-4">
                    <div>
                        <h1 className="text-2xl font-bold text-[#2A3F54] flex items-center gap-3">
                            <div className="p-2 bg-blue-50 rounded-lg text-[#1ABB9C]">
                                <Activity size={24}/>
                            </div>
                            Mi Panel Comercial
                        </h1>
                        <p className="text-sm text-gray-400 mt-1 ml-1">
                            {new Date().toLocaleDateString('es-PE', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
                        </p>
                    </div>
                    <div className="text-right hidden sm:block bg-white px-5 py-2 rounded-2xl shadow-sm border border-gray-100">
                        <div className="text-2xl font-mono font-black text-[#1ABB9C] tracking-tight">
                            {horaPeru.toLocaleTimeString('es-PE', { 
                                timeZone: 'America/Lima', 
                                hour: '2-digit', 
                                minute: '2-digit',
                                second:'2-digit' 
                            })}
                        </div>
                        <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Hora de Perú</p>
                    </div>
                </div>

                {loading ? (
                    <div className="flex flex-col justify-center items-center py-20 text-emerald-500">
                        <div className="animate-spin rounded-full h-12 w-12 border-b-4 border-emerald-500 mb-4"></div>
                        <p className="font-bold text-[#2A3F54] animate-pulse">Sincronizando tus ventas...</p>
                    </div>
                ) : (
                    <>
                        {/* 1. ACCIONES PRINCIPALES */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
                            <button 
                                type="button" 
                                onClick={() => navigate('/asesor/ventas')} 
                                className="group relative overflow-hidden bg-gradient-to-br from-[#1ABB9C] to-[#16a085] text-white p-8 rounded-2xl shadow-lg shadow-green-200/50 hover:shadow-xl transition-all transform hover:-translate-y-1 text-left h-32 flex flex-col justify-center"
                            >
                                <div className="absolute right-0 top-0 p-4 opacity-10 group-hover:opacity-20 group-hover:scale-110 transition-all duration-500">
                                    <Ticket size={100} />
                                </div>
                                <div className="relative z-10 flex items-center gap-4">
                                    <div className="bg-white/20 p-4 rounded-full backdrop-blur-sm">
                                        <Ticket size={32} />
                                    </div>
                                    <div>
                                        <h3 className="text-3xl font-bold tracking-tight">Vender Pasaje</h3>
                                        <p className="text-green-50 text-sm mt-1 opacity-90 font-medium flex items-center gap-1"> Iniciar nueva venta <ArrowRight size={14}/> </p>
                                    </div>
                                </div>
                            </button>

                            <button 
                                type="button"
                                onClick={() => navigate('/asesor/pasajeros')} 
                                className="group relative overflow-hidden bg-white border-2 border-gray-100 text-[#2A3F54] p-8 rounded-2xl shadow-sm hover:border-[#1ABB9C] hover:shadow-md transition-all text-left h-32 flex flex-col justify-center"
                            >
                                <div className="absolute right-0 top-0 p-4 text-gray-100 group-hover:text-[#1ABB9C]/10 transition-colors duration-500">
                                    <Users size={100} />
                                </div>
                                <div className="relative z-10 flex items-center gap-4">
                                    <div className="bg-gray-100 group-hover:bg-[#1ABB9C]/10 group-hover:text-[#1ABB9C] p-4 rounded-full transition-colors">
                                        <Users size={32} />
                                    </div>
                                    <div>
                                        <h3 className="text-3xl font-bold tracking-tight group-hover:text-[#1ABB9C] transition-colors">Manifiesto</h3>
                                        <p className="text-gray-400 text-sm mt-1 font-medium">Ver listas de pasajeros</p>
                                    </div>
                                </div>
                            </button>
                        </div>

                        {/* 2. TARJETAS DE KPIs (PERSONALES) */}
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
                            <div className="bg-gradient-to-br from-[#4B8AD1] to-[#7CAFE8] transition-colors p-5 rounded-2xl shadow-sm border border-gray-100 flex items-center gap-4">
                                <div className="p-4 bg-emerald-50 text-[#4B8AD1] rounded-xl"><CheckCircle size={28} /></div>
                                <div>
                                    <p className="text-[10px] font-bold text-white uppercase tracking-wider">Mis Ventas Hoy</p>
                                    <h3 className="text-3xl font-black text-white">{kpis.ventasMiasHoy} tkts</h3>
                                </div>
                            </div>

                            <div className="bg-gradient-to-br from-[#10B981] to-[#34D399] p-5 rounded-2xl shadow-sm border border-gray-100 flex items-center gap-4">
                                <div className="p-4 bg-emerald-50 text-[#10B981] rounded-xl"><Activity size={28} /></div>
                                <div>
                                    <p className="text-[10px] font-bold text-white uppercase tracking-wider">Mi Caja Hoy</p>
                                    <h3 className="text-3xl font-black text-white">S/ {kpis.dineroMioHoy.toFixed(2)}</h3>
                                </div>
                            </div>

                            <div className="bg-gradient-to-br from-[#E67E22] to-[#F5A55B] p-5 rounded-2xl shadow-sm border border-gray-100 flex items-center gap-4">
                                <div className="p-4 bg-blue-50 text-[#E67E22] rounded-xl"><Clock size={28} /></div>
                                <div>
                                    <p className="text-[10px] font-bold text-white uppercase tracking-wider">Total Semana</p>
                                    <h3 className="text-3xl font-black text-white">{kpis.misVentasSemana} tkts</h3>
                                </div>
                            </div>

                            <div className="bg-[#2A3F54] text-white p-5 rounded-2xl shadow-lg relative overflow-hidden flex flex-col justify-center">
                                <div className="absolute -right-6 -top-6 text-white/5 rotate-12"><Ship size={100}/></div>
                                <p className="text-[10px] font-bold text-[#1ABB9C] uppercase tracking-wide mb-1 flex items-center gap-1">
                                    <Timer size={12}/> Próxima Salida
                                </p>
                                {kpis.proximoZarpe ? (
                                    <div className="relative z-10">
                                        <h3 className="text-2xl font-bold leading-none">{kpis.proximoZarpe.hora}</h3>
                                        <p className="text-xs text-gray-300 mt-1 truncate">Hacia {kpis.proximoZarpe.destino || kpis.proximoZarpe.ruta}</p>
                                    </div>
                                ) : (
                                    <h3 className="text-lg font-bold">Sin salidas</h3>
                                )}
                            </div>
                        </div>

                        {/* 3. GRÁFICOS DE DESEMPEÑO DEL ASESOR */}
                        {graficoVentas.length > 0 && (
                            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
                                <div className="lg:col-span-2 bg-white p-5 rounded-2xl shadow-sm border border-gray-100 h-64">
                                    <h3 className="text-xs font-black text-gray-500 uppercase tracking-widest mb-4">Mi rendimiento en la semana</h3>
                                    <ResponsiveContainer width="100%" height="100%">
                                        <AreaChart data={graficoVentas}>
                                            <defs>
                                                <linearGradient id="colorVentas" x1="0" y1="0" x2="0" y2="1">
                                                    <stop offset="5%" stopColor="#4B8AD1" stopOpacity={0.4}/>
                                                    <stop offset="95%" stopColor="#4B8AD1" stopOpacity={0}/>
                                                </linearGradient>
                                            </defs>
                                            <XAxis dataKey="name" tick={{fontSize: 10}} axisLine={false} tickLine={false}/>
                                            <RechartsTooltip 
                                                formatter={(val: any) => [`${val} pasajes`, 'Vendidos']} 
                                                contentStyle={{borderRadius: '8px', fontSize: '12px', fontWeight: 'bold'}} 
                                            />
                                            <Area type="monotone" dataKey="value" stroke="#4B8AD1" strokeWidth={3} fillOpacity={1} fill="url(#colorVentas)" />
                                        </AreaChart>
                                    </ResponsiveContainer>
                                </div>
                                <div className="bg-white p-5 rounded-2xl shadow-sm border border-gray-100 h-64 flex flex-col justify-between">
                                    <h3 className="text-xs font-black text-gray-500 uppercase tracking-widest mb-2 text-center">Mis cobros de hoy</h3>
                                    {graficoPagos.length > 0 ? (
                                        <>
                                            <ResponsiveContainer width="100%" height="100%">
                                                <PieChart>
                                                    <Pie data={graficoPagos} innerRadius={40} outerRadius={70} paddingAngle={2} dataKey="value" stroke="none">
                                                        {graficoPagos.map((e, idx) => <Cell key={idx} fill={COLORES_PAGO[idx % COLORES_PAGO.length]} />)}
                                                    </Pie>
                                                    <RechartsTooltip 
                                                        formatter={(val: any) => [`${val} pasajes`, 'Cantidad']} 
                                                        contentStyle={{borderRadius: '8px', fontSize: '12px'}} 
                                                    />
                                                </PieChart>
                                            </ResponsiveContainer>
                                            <div className="flex justify-center flex-wrap gap-3 text-[10px] font-bold text-gray-500 mt-2">
                                                {graficoPagos.map((g, i) => (
                                                    <div key={i} className="flex items-center gap-1"><div className="w-2 h-2 rounded-full" style={{backgroundColor: COLORES_PAGO[i]}}></div>{g.name}</div>
                                                ))}
                                            </div>
                                        </>
                                    ) : (
                                        <p className="text-xs text-gray-400 italic text-center mt-10">Aún no hay ventas registradas.</p>
                                    )}
                                </div>
                            </div>
                        )}

                        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
                            {/* IZQUIERDA: ITINERARIO */}
                            <div className="lg:col-span-8 flex flex-col gap-6">
                                <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden flex-1 flex flex-col">
                                    <div className="px-6 py-5 border-b border-gray-100 flex justify-between items-center bg-gray-50/50">
                                        <div>
                                            <h2 className="font-bold text-[#2A3F54] text-lg flex items-center gap-2">
                                                <Calendar size={20} className="text-[#1ABB9C]" /> Itinerario Semanal
                                            </h2>
                                        </div>
                                    </div>
                                    
                                    <div className="overflow-x-auto flex-1">
                                        <table className="w-full text-sm text-left">
                                            <thead className="text-xs text-gray-400 uppercase bg-white border-b border-gray-100">
                                                <tr>
                                                    <th className="px-6 py-4 font-semibold">Salida</th>
                                                    <th className="px-6 py-4 font-semibold">Ruta & Nave</th>
                                                    <th className="px-6 py-4 font-semibold w-1/3 text-center">Ocupación General</th>
                                                    <th className="px-6 py-4 font-semibold text-right">Acción</th>
                                                </tr>
                                            </thead>
                                            <tbody className="divide-y divide-gray-50">
                                                {salidasPaginadas.length === 0 ? (
                                                    <tr><td colSpan={4} className="p-12 text-center text-gray-400 bg-gray-50">No hay viajes programados para esta semana.</td></tr>
                                                ) : (
                                                    salidasPaginadas.map((salida) => {
                                                        const porcentaje = calcPorcentaje(salida.ocupados, salida.total);
                                                        return (
                                                            <tr key={salida.id} className="hover:bg-blue-50/30 transition-colors group">
                                                                <td className="px-6 py-4">
                                                                    <div className="flex flex-col">
                                                                        <span className="font-mono font-bold text-base text-[#2A3F54]">{salida.hora}</span>
                                                                        <span className="text-[11px] text-gray-400 font-medium">{salida.fecha}</span>
                                                                    </div>
                                                                </td>
                                                                <td className="px-6 py-4">
                                                                    <div className="font-bold text-[#2A3F54]">{salida.ruta}</div>
                                                                    <div className="text-xs text-gray-500 mt-1 flex items-center gap-1">
                                                                        <Ship size={12} className="text-blue-400"/> {salida.nave}
                                                                    </div>
                                                                </td>
                                                                <td className="px-6 py-4">
                                                                    <div className="flex justify-between text-xs mb-1.5 font-semibold">
                                                                        <span className={porcentaje >= 90 ? 'text-red-500' : 'text-[#2A3F54]'}>
                                                                            {salida.ocupados} pasajeros
                                                                        </span>
                                                                        <span className="text-gray-400 font-normal">
                                                                            {Math.max(0, salida.total - salida.ocupados)} libres
                                                                        </span>
                                                                    </div>
                                                                    <div className="w-full bg-gray-100 rounded-full h-2 overflow-hidden">
                                                                        <div 
                                                                            className={`h-full rounded-full transition-all duration-500 ${getColorBarra(porcentaje)}`} 
                                                                            style={{ width: `${porcentaje}%` }}
                                                                        ></div>
                                                                    </div>
                                                                </td>
                                                                <td className="px-6 py-4 text-right">
                                                                    {salida.estadoVisual === 'LLENO' ? (
                                                                        <span className="text-xs font-bold text-red-500 bg-red-50 px-3 py-1.5 rounded-lg border border-red-100 inline-block">LLENO</span>
                                                                    ) : salida.estadoVisual === 'EN CURSO' ? (
                                                                        <span className="text-xs font-bold text-gray-500 bg-gray-100 px-3 py-1.5 rounded-lg border border-gray-200 inline-block">ZARPÓ</span>
                                                                    ) : salida.estadoVisual === 'CANCELADO' ? (
                                                                        <span className="text-xs font-bold text-red-500 bg-red-50 px-3 py-1.5 rounded-lg border border-red-100 inline-block">CANCELADO</span>
                                                                    ) : (
                                                                        <button 
                                                                            type="button"
                                                                            onClick={() => navigate(`/asesor/ventas?viaje=${salida.id}`)}
                                                                            className="bg-white border border-[#1ABB9C] text-[#1ABB9C] hover:bg-[#1ABB9C] hover:text-white text-xs font-bold px-4 py-2 rounded-lg transition-all shadow-sm active:scale-95 flex items-center gap-2 ml-auto"
                                                                        >
                                                                            Vender <Ticket size={14} />
                                                                        </button>
                                                                    )}
                                                                </td>
                                                            </tr>
                                                        );
                                                    })
                                                )}
                                            </tbody>
                                        </table>
                                    </div>
                                    
                                    {/* CONTROLES DE PAGINACIÓN */}
                                    {totalPaginas > 1 && (
                                        <div className="px-6 py-4 border-t border-gray-100 flex flex-wrap items-center justify-between bg-gray-50/50 gap-4">
                                            <span className="text-xs text-gray-500 font-medium">
                                                Mostrando {indexPrimeraSalida + 1} - {Math.min(indexUltimaSalida, salidas.length)} de {salidas.length} salidas
                                            </span>
                                            <div className="flex items-center gap-2">
                                                <button 
                                                    onClick={irPaginaAnterior} 
                                                    disabled={paginaActual === 1}
                                                    className="px-3 py-1.5 text-xs font-bold text-gray-600 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 hover:text-[#1ABB9C] hover:border-[#1ABB9C] disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                                                >
                                                    <ChevronLeft size={16}/>
                                                </button>
                                                <button 
                                                    onClick={irPaginaSiguiente} 
                                                    disabled={paginaActual === totalPaginas}
                                                    className="px-3 py-1.5 text-xs font-bold text-gray-600 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 hover:text-[#1ABB9C] hover:border-[#1ABB9C] disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                                                >
                                                    <ChevronRight size={16}/>
                                                </button>
                                            </div>
                                        </div>
                                    )}

                                </div>
                            </div>

                            {/* 🔥 DERECHA: CAJA VIBRANTE REDISEÑADA Y COMPACTA 🔥 */}
                            <div className="lg:col-span-4 self-start">
                                <div className="bg-gradient-to-br from-amber-400 via-orange-500 to-rose-500 rounded-2xl shadow-xl shadow-orange-300/40 overflow-hidden w-full flex flex-col relative group p-8">
                                    {/* Elementos decorativos de fondo */}
                                    <div className="absolute -right-10 -top-10 text-white/10 group-hover:rotate-12 group-hover:scale-110 transition-all duration-700 pointer-events-none">
                                        <Lock size={180} />
                                    </div>
                                    <div className="absolute -left-10 -bottom-10 w-40 h-40 bg-white/10 rounded-full blur-2xl pointer-events-none"></div>
                                    
                                    <div className="relative z-10 flex flex-col items-center justify-center text-center">
                                        <div className="bg-white/20 p-5 rounded-full backdrop-blur-md border border-white/30 shadow-inner mb-5 group-hover:-translate-y-2 transition-transform duration-500">
                                            <Lock size={48} className="text-white drop-shadow-md" />
                                        </div>
                                        
                                        <h3 className="text-3xl font-black text-white tracking-tight mb-3 drop-shadow-md">
                                            Gestión de Caja
                                        </h3>
                                        
                                        <p className="text-orange-50 text-sm font-medium leading-relaxed opacity-90 px-2 mb-8">
                                            Controla tus ingresos del turno. Abre tu caja al iniciar tu jornada y ciérrala antes de retirarte.
                                        </p>
                                        
                                        <button 
                                            onClick={() => setModalCajaAbierto(true)}
                                            className="w-full bg-white text-orange-600 hover:text-rose-600 font-black py-4 px-6 rounded-xl shadow-[0_8px_20px_rgba(0,0,0,0.15)] hover:shadow-[0_8px_25px_rgba(0,0,0,0.2)] hover:-translate-y-1 transition-all active:scale-95 flex items-center justify-center gap-3 text-base border-b-4 border-orange-100"
                                        >
                                            <Activity size={20} className="animate-pulse" /> 
                                            Abrir Panel de Caja
                                        </button>
                                    </div>
                                </div>
                            </div>

                        </div>
                    </>
                )}
                
                {/* MODAL DE CAJA */}
                <ModalCaja 
                    isOpen={modalCajaAbierto} 
                    onClose={() => setModalCajaAbierto(false)} 
                    onSuccess={() => { /* KPIs aquí llamando a cargarDashboard() */ }}
                />
                
            </div>
        </MainLayout>
    );
};

export default DashboardAsesor;