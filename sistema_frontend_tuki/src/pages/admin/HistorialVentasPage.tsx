import React, { useState, useEffect, useMemo } from 'react';
import MainLayout from '../../layouts/MainLayout';
import { 
    History, Search, Calendar, FileSpreadsheet, 
    User, MapPin, Ticket, CheckCircle, XCircle,
    ChevronLeft, ChevronRight, Ship, CreditCard, Filter, AlertTriangle,
    DollarSign, Tag
} from 'lucide-react';
import { getViajes } from '../../services/configService';
import { getManifiesto } from '../../services/ventaService';
import { notificarError } from '../../services/feedbackService';
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts';

const HistorialVentasPage = () => {
    const [loading, setLoading] = useState(true);
    const [ventasGlobales, setVentasGlobales] = useState<any[]>([]);
    
    const [busqueda, setBusqueda] = useState('');
    const [fechaInicio, setFechaInicio] = useState(''); 
    const [fechaFin, setFechaFin] = useState('');
    const [filtroRuta, setFiltroRuta] = useState('');
    const [filtroNave, setFiltroNave] = useState('');
    const [filtroVendedor, setFiltroVendedor] = useState('');
    const [filtroPago, setFiltroPago] = useState('');
    const [filtroEstado, setFiltroEstado] = useState('');

    const [opciones, setOpciones] = useState({
        rutas: new Set<string>(), naves: new Set<string>(),
        vendedores: new Set<string>(), pagos: new Set<string>()
    });

    const [currentPage, setCurrentPage] = useState(1);
    const itemsPerPage = 5;

    useEffect(() => {
        cargarDatos();
    }, []);

    const formatearFecha = (fechaRaw: any) => {
        if (!fechaRaw) return '---';
        try {
            let d;
            if (Array.isArray(fechaRaw)) {
                d = new Date(fechaRaw[0], fechaRaw[1] - 1, fechaRaw[2]);
            } else {
                d = new Date(fechaRaw);
            }
            if (isNaN(d.getTime())) return '---';
            const dia = String(d.getDate()).padStart(2, '0');
            const mes = String(d.getMonth() + 1).padStart(2, '0');
            const anio = d.getFullYear();
            return `${dia}-${mes}-${anio}`; 
        } catch { return '---'; }
    };

    const formatearHora12 = (horaRaw: any) => {
        if (!horaRaw) return '---';
        try {
            let h = 0, m = 0;
            if (Array.isArray(horaRaw)) {
                h = parseInt(String(horaRaw[0]), 10);
                m = parseInt(String(horaRaw[1] || '0'), 10);
            } else if (typeof horaRaw === 'string') {
                const parts = horaRaw.split('T')[1]?.split(':') || horaRaw.split(':');
                h = parseInt(parts[0], 10);
                m = parseInt(parts[1] || '0', 10); 
            }
            if (isNaN(h)) return '---';
            const ampm = h >= 12 ? 'PM' : 'AM';
            const h12 = h % 12 || 12;
            return `${String(h12).padStart(2, '0')}:${String(m).padStart(2, '0')} ${ampm}`;
        } catch { return '---'; }
    };

    const formatMoney = (amount: number) => new Intl.NumberFormat('es-PE', { style: 'currency', currency: 'PEN' }).format(amount || 0);

    const cargarDatos = async () => {
        setLoading(true);
        try {
            const viajesData = await getViajes().catch(() => []);
            const viajes = Array.isArray(viajesData) ? viajesData : [];
            
            const historialExtraido: any[] = [];
            const rSet = new Set<string>(); const nSet = new Set<string>();
            const vSet = new Set<string>(); const pSet = new Set<string>();

            const viajesRecientes = viajes.slice(0, 60);

            await Promise.all(viajesRecientes.map(async (v: any) => {
                if (String(v.estado || '').toUpperCase() === 'ELIMINADO') return;

                const origenRutaGral = typeof v.puertoOrigen === 'object' ? v.puertoOrigen?.ciudad : (v.origen?.ciudad || v.origen || '');
                const destinoRutaGral = typeof v.puertoDestino === 'object' ? v.puertoDestino?.ciudad : (v.destino?.ciudad || v.destino || '');
                const nombreRuta = (origenRutaGral && destinoRutaGral) ? `${origenRutaGral} - ${destinoRutaGral}` : (v.nombreRuta || v.ruta?.nombreRuta || 'Ruta Gral');
                const nombreNave = v.nombreEmbarcacion || v.embarcacion?.nombre || 'Nave N/A';

                try {
                    const mRes = await getManifiesto(v.idViaje || v.id_viaje);
                    const ventasArray = Array.isArray(mRes) ? mRes : (mRes?.data || mRes?.content || []);
                    
                    ventasArray.forEach((venta: any) => {
                        
                        const vPadre = venta.venta || {}; 

                        const idVentaReal = vPadre.idVenta ?? vPadre.id ?? venta.idDetalle ?? venta.idVentaDetalle ?? venta.idReserva ?? 0;
                        const estadoVenta = String(venta.estadoPasaje || venta.estado || vPadre.estado || 'VÁLIDO').toUpperCase();
                        const monto = parseFloat(venta.precioUnitario ?? venta.precio ?? venta.montoFinal ?? venta.monto ?? vPadre.total ?? 0) || 0;

                        const objPasajero = venta.pasajero || {};
                        const pNom = objPasajero.nombres || objPasajero.nombre || venta.nombres || '';
                        const pApe = objPasajero.apellidos || objPasajero.apellidoPaterno || venta.apellidos || venta.apellidoPaterno || '';
                        const pMat = objPasajero.apellidoMaterno || venta.apellidoMaterno || '';
                        
                        let pasajeroFinal = `${pNom} ${pApe} ${pMat}`.trim().replace(/\s+/g, ' ');
                        if (!pasajeroFinal) pasajeroFinal = objPasajero.nombreCompleto || venta.nombreCompletoPasajero || venta.pasajero || 'Pasajero S/N';
                        
                        const dni = objPasajero.numeroDocumento || objPasajero.documento || venta.numeroDocumento || venta.documento || 'S/D';

                        const pOri = venta.puertoOrigen || venta.origen || vPadre.puertoOrigen || {};
                        const pDes = venta.puertoDestino || venta.destino || vPadre.puertoDestino || {};
                        const origenEsc = pOri.ciudad || pOri.nombrePuerto || (typeof pOri === 'string' ? pOri : '');
                        const destinoEsc = pDes.ciudad || pDes.nombrePuerto || (typeof pDes === 'string' ? pDes : '');
                        const trayectoEscala = (origenEsc && destinoEsc) ? `${origenEsc} - ${destinoEsc}` : nombreRuta;

                        const objAsiento = venta.asiento || {};
                        const asiento = objAsiento.numero || objAsiento.numeroAsiento || venta.numeroAsiento || venta.asiento || 'S/A';

                        const objComp = vPadre.comprobante || venta.comprobante || {};
                        const cSerie = objComp.serie || venta.serie || '';
                        const cNum = objComp.numero || objComp.numeroCorrelativo || objComp.correlativo || venta.numero || venta.numeroCorrelativo || venta.correlativo || '';
                        const comprobanteFormat = (cSerie && cNum) ? `${cSerie}-${String(cNum).padStart(6, '0')}` : `TKT-${idVentaReal}`;

                        const objUsuario = vPadre.usuario || vPadre.usuarioVendedor || venta.usuario || {};
                        const vendedorFinal = objUsuario.nombreCompleto || objUsuario.nombres || (typeof venta.vendedor === 'string' ? venta.vendedor : '') || 'SISTEMA';

                        const objAgencia = objUsuario.agencia || vPadre.agencia || venta.agencia || {};
                        const agenciaFinal = objAgencia.nombreAgencia || objAgencia.nombre || (typeof venta.agencia === 'string' ? venta.agencia : '') || 'Sede Principal';

                        const arrPagos = vPadre.pagos || venta.pagos || [];
                        const objPago = arrPagos.length > 0 ? arrPagos[0] : {};
                        const metodoPagoFinal = String(objPago.metodo || objPago.metodoPago || objPago.tipoPago || venta.metodoPago || 'EFECTIVO').toUpperCase();

                        let fVenta = vPadre.fecha || vPadre.fechaVenta || venta.fechaVenta || venta.fecha || venta.fechaCreacion || venta.fechaReserva;
                        let hVenta = vPadre.hora || vPadre.horaVenta || venta.horaVenta || venta.hora || venta.horaReserva;

                        if (fVenta && typeof fVenta === 'string' && fVenta.includes('T')) {
                            const partes = fVenta.split('T');
                            fVenta = partes[0];
                            if (!hVenta) hVenta = partes[1].substring(0, 8); 
                        }

                        if (!fVenta) fVenta = v.fechaSalida;
                        if (!hVenta) hVenta = v.horaZarpe;

                        const fFormateada = formatearFecha(fVenta);
                        const hFormateada = formatearHora12(hVenta);
                        
                        let fechaFiltroObj = new Date();
                        if(typeof fVenta === 'string') fechaFiltroObj = new Date(fVenta.split('T')[0]);
                        const fechaParaFiltroInput = isNaN(fechaFiltroObj.getTime()) ? '' : fechaFiltroObj.toISOString().split('T')[0];

                        historialExtraido.push({
                            id: idVentaReal,
                            comprobante: comprobanteFormat, 
                            fechaFiltro: fechaParaFiltroInput,
                            fechaVis: fFormateada,
                            horaVis: hFormateada,
                            ruta: trayectoEscala,
                            nave: nombreNave,
                            pasajero: pasajeroFinal, 
                            dni, asiento, 
                            vendedor: vendedorFinal, 
                            agencia: agenciaFinal, 
                            metodoPago: metodoPagoFinal, 
                            monto, estado: estadoVenta,
                            orden: fechaFiltroObj.getTime() || idVentaReal
                        });

                        rSet.add(trayectoEscala); nSet.add(nombreNave); vSet.add(vendedorFinal); pSet.add(metodoPagoFinal);
                    });
                } catch (e) {}
            }));

            historialExtraido.sort((a, b) => b.orden - a.orden); 
            setVentasGlobales(historialExtraido);
            setOpciones({ rutas: rSet, naves: nSet, vendedores: vSet, pagos: pSet });

        } catch (error) {
            notificarError("Error extrayendo historial.");
        } finally {
            setLoading(false);
        }
    };

    const ventasFiltradas = useMemo(() => {
        return ventasGlobales.filter(v => {
            if (fechaInicio && v.fechaFiltro < fechaInicio) return false;
            if (fechaFin && v.fechaFiltro > fechaFin) return false;
            if (filtroRuta && v.ruta !== filtroRuta) return false;
            if (filtroNave && v.nave !== filtroNave) return false;
            if (filtroVendedor && v.vendedor !== filtroVendedor) return false;
            if (filtroPago && v.metodoPago !== filtroPago) return false;
            
            if (filtroEstado) {
                if (filtroEstado === 'VÁLIDO' && v.estado !== 'VÁLIDO' && v.estado !== 'VENDIDO') return false;
                if (filtroEstado === 'ANULADO' && v.estado !== 'ANULADO' && v.estado !== 'CANCELADO') return false;
            }

            if (busqueda) {
                const q = busqueda.toLowerCase();
                return v.pasajero.toLowerCase().includes(q) 
                    || v.dni.toLowerCase().includes(q) 
                    || v.comprobante.toLowerCase().includes(q) 
                    || v.asiento.toLowerCase().includes(q);
            }
            return true;
        });
    }, [ventasGlobales, fechaInicio, fechaFin, filtroRuta, filtroNave, filtroVendedor, filtroPago, filtroEstado, busqueda]);

    const metricas = useMemo(() => {
        let total = 0, boletos = 0, anulados = 0;
        ventasFiltradas.forEach(v => {
            if (v.estado === 'VÁLIDO' || v.estado === 'VENDIDO') { total += v.monto; boletos++; } 
            else if (v.estado === 'ANULADO' || v.estado === 'CANCELADO') anulados++;
        });
        const totalTransacciones = boletos + anulados;
        const pctAnulacion = totalTransacciones > 0 ? ((anulados / totalTransacciones) * 100).toFixed(1) : 0;
        return { total, boletos, promedio: boletos > 0 ? (total / boletos) : 0, pctAnulacion, anulados };
    }, [ventasFiltradas]);

    const graficos = useMemo(() => {
        const porDia: Record<string, number> = {};
        const porAgencia: Record<string, number> = {}; 
        const porRuta: Record<string, number> = {};

        ventasFiltradas.forEach(v => {
            if (v.estado === 'VÁLIDO' || v.estado === 'VENDIDO') {
                const fCorta = v.fechaVis.substring(0, 5); 
                porDia[fCorta] = (porDia[fCorta] || 0) + v.monto;
                
                const nombreAgencia = v.agencia; 
                porAgencia[nombreAgencia] = (porAgencia[nombreAgencia] || 0) + v.monto;
                
                porRuta[v.ruta] = (porRuta[v.ruta] || 0) + v.monto;
            }
        });

        return {
            dias: Object.entries(porDia).map(([f, m]) => ({ name: f, value: m })).sort((a,b) => a.name.localeCompare(b.name)).slice(-10),
            agencias: Object.entries(porAgencia).map(([n, m]) => ({ name: n, value: m })).sort((a,b) => b.value - a.value),
            rutas: Object.entries(porRuta).map(([r, m]) => ({ name: r, value: m })).sort((a,b) => b.value - a.value),
        };
    }, [ventasFiltradas]);

    const indexOfLastItem = currentPage * itemsPerPage;
    const indexOfFirstItem = indexOfLastItem - itemsPerPage;
    const currentItems = ventasFiltradas.slice(indexOfFirstItem, indexOfLastItem);
    const totalPages = Math.ceil(ventasFiltradas.length / itemsPerPage);

    useEffect(() => { setCurrentPage(1); }, [ventasFiltradas.length]);

    const limpiarFiltros = () => {
        setBusqueda(''); setFechaInicio(''); setFechaFin('');
        setFiltroRuta(''); setFiltroNave(''); setFiltroVendedor(''); setFiltroPago(''); setFiltroEstado('');
    };

    const CustomTooltip = ({ active, payload, label }: any) => {
        if (active && payload && payload.length) {
            return (
                <div className="bg-[#2A3F54] text-white p-2 rounded-lg shadow-lg text-xs border border-gray-700 z-50">
                    <p className="font-bold">{label}</p>
                    <p className="text-[#1ABB9C] font-black">{formatMoney(payload[0].value)}</p>
                </div>
            );
        }
        return null;
    };

    return (
        <MainLayout>
            <div className="max-w-[1400px] mx-auto pb-6 space-y-6">
                
                {/* HEADER */}
                <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 mb-8 flex flex-col md:flex-row md:items-center justify-between gap-4 animate-in slide-in-from-top-4">
                    <div>
                        <h1 className="text-2xl font-bold text-[#2A3F54] flex items-center gap-3">
                            <div className="p-2 bg-blue-50 rounded-lg text-[#1ABB9C]">
                                <History size={24} strokeWidth={2.5}/>
                            </div>
                            Auditoría de Ventas
                        </h1>
                        <p className="text-sm text-gray-400 mt-1 ml-1">Explorador general de boletos y trazabilidad de ingresos.</p>
                    </div>
                </div>

                {loading ? (
                    <div className="flex flex-col justify-center items-center py-32 text-emerald-500">
                        <div className="animate-spin rounded-full h-14 w-14 border-b-4 border-emerald-600 mb-4 shadow-lg shadow-emerald-200"></div>
                        <p className="font-bold text-[#2A3F54] text-lg animate-pulse">Sincronizando historial...</p>
                    </div>
                ) : (
                    <div className="space-y-6 animate-in fade-in duration-500">

                        {/* PANEL DE FILTROS */}
                        <div className="bg-white p-5 rounded-2xl shadow-sm border border-gray-100">
                            <div className="flex items-center gap-2 mb-4 text-[#2A3F54] font-black border-b border-gray-100 pb-3">
                                <Filter size={18} className="text-emerald-500"/> Filtros de Búsqueda
                                <button onClick={limpiarFiltros} className="ml-auto text-xs font-bold text-red-500 hover:text-red-700 bg-red-50 hover:bg-red-100 px-3 py-1.5 rounded-lg transition-colors border border-red-100">Limpiar Filtros</button>
                            </div>
                            
                            <div className="grid grid-cols-1 md:grid-cols-4 xl:grid-cols-8 gap-4">
                                <div className="xl:col-span-2 relative">
                                    <Search className="absolute left-3 top-2.5 text-emerald-500" size={16} />
                                    <input 
                                        type="text" placeholder="Pasajero, DNI o Serie..." value={busqueda} onChange={e => setBusqueda(e.target.value)}
                                        className="pl-9 pr-3 py-2 w-full text-sm font-medium border border-gray-200 rounded-xl focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 outline-none bg-gray-50"
                                    />
                                </div>
                                <div className="xl:col-span-2 flex items-center gap-2 bg-gray-50 px-3 py-2 rounded-xl border border-gray-200 focus-within:border-emerald-500 transition-colors">
                                    <Calendar size={14} className="text-emerald-500"/>
                                    <input type="date" value={fechaInicio} onChange={e => setFechaInicio(e.target.value)} className="bg-transparent text-xs font-bold outline-none w-full text-gray-700"/>
                                    <span className="text-gray-300">-</span>
                                    <input type="date" value={fechaFin} onChange={e => setFechaFin(e.target.value)} className="bg-transparent text-xs font-bold outline-none w-full text-gray-700"/>
                                </div>
                                <select value={filtroRuta} onChange={e => setFiltroRuta(e.target.value)} className="py-2 px-3 text-xs font-medium border border-gray-200 rounded-xl focus:border-emerald-500 outline-none bg-gray-50 text-gray-700">
                                    <option value="">Todas las Rutas/Escalas</option>
                                    {Array.from(opciones.rutas).map(r => <option key={r} value={r}>{r}</option>)}
                                </select>
                                <select value={filtroNave} onChange={e => setFiltroNave(e.target.value)} className="py-2 px-3 text-xs font-medium border border-gray-200 rounded-xl focus:border-emerald-500 outline-none bg-gray-50 text-gray-700">
                                    <option value="">Todas las Naves</option>
                                    {Array.from(opciones.naves).map(n => <option key={n} value={n}>{n}</option>)}
                                </select>
                                <select value={filtroVendedor} onChange={e => setFiltroVendedor(e.target.value)} className="py-2 px-3 text-xs font-medium border border-gray-200 rounded-xl focus:border-emerald-500 outline-none bg-gray-50 text-gray-700">
                                    <option value="">Vendedores</option>
                                    {Array.from(opciones.vendedores).map(v => <option key={v} value={v}>{v}</option>)}
                                </select>
                                <select value={filtroEstado} onChange={e => setFiltroEstado(e.target.value)} className="py-2 px-3 text-xs font-medium border border-gray-200 rounded-xl focus:border-emerald-500 outline-none bg-gray-50 text-gray-700">
                                    <option value="">Estado</option>
                                    <option value="VÁLIDO">Vendidos (Activos)</option>
                                    <option value="ANULADO">Anulados / Cancelados</option>
                                </select>
                            </div>
                        </div>

                        {/* KPIs */}
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                            <div className="bg-gradient-to-br from-[#2A3F54] to-gray-800 text-white p-5 rounded-2xl shadow-xl shadow-gray-900/20 relative overflow-hidden group hover:-translate-y-1 transition-all">
                                <DollarSign className="absolute right-[-10px] top-[-10px] text-gray-700/50 group-hover:scale-110 transition-transform duration-500" size={90}/>
                                <p className="text-gray-300 text-[10px] font-bold uppercase tracking-widest mb-1 relative z-10">Monto Filtrado</p>
                                <h2 className="text-3xl font-black text-emerald-400 relative z-10 truncate">{formatMoney(metricas.total)}</h2>
                            </div>
                            <div className="bg-gradient-to-br from-emerald-500 to-teal-600 text-white p-5 rounded-2xl shadow-lg shadow-emerald-500/30 relative overflow-hidden group hover:-translate-y-1 transition-all">
                                <Ticket className="absolute right-0 top-0 p-2 opacity-20 group-hover:scale-125 transition-transform duration-500" size={80}/>
                                <p className="text-emerald-100 text-[10px] font-bold uppercase tracking-widest mb-1 relative z-10">Boletos Efectivos</p>
                                <h2 className="text-3xl font-black relative z-10">{metricas.boletos}</h2>
                            </div>
                            <div className="bg-gradient-to-br from-blue-500 to-indigo-600 text-white p-5 rounded-2xl shadow-lg shadow-blue-500/30 relative overflow-hidden group hover:-translate-y-1 transition-all">
                                <Tag className="absolute right-0 top-0 p-2 opacity-20 group-hover:scale-125 transition-transform duration-500" size={80}/>
                                <p className="text-blue-100 text-[10px] font-bold uppercase tracking-widest mb-1 relative z-10">Ticket Promedio</p>
                                <h2 className="text-3xl font-black relative z-10">{formatMoney(metricas.promedio)}</h2>
                            </div>
                            <div className="bg-gradient-to-br from-rose-500 to-red-600 text-white p-5 rounded-2xl shadow-lg shadow-rose-500/30 relative overflow-hidden group hover:-translate-y-1 transition-all">
                                <AlertTriangle className="absolute right-0 top-0 p-2 opacity-20 group-hover:scale-125 transition-transform duration-500" size={80}/>
                                <p className="text-rose-100 text-[10px] font-bold uppercase tracking-widest mb-1 relative z-10">Tasa de Anulación</p>
                                <div className="flex items-baseline gap-2 relative z-10">
                                    <h2 className="text-3xl font-black">{metricas.pctAnulacion}%</h2>
                                    <span className="text-[10px] font-bold text-rose-200">({metricas.anulados} tkts)</span>
                                </div>
                            </div>
                        </div>

                        {/* GRÁFICOS DINÁMICOS TINTADOS */}
                        {metricas.total > 0 && (
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                                <div className="bg-gradient-to-b from-emerald-50/50 to-white p-5 rounded-2xl shadow-sm border border-emerald-50 h-64">
                                    <p className="text-xs font-black text-emerald-800 mb-4 text-center uppercase tracking-wider">Ventas por Día</p>
                                    <ResponsiveContainer width="100%" height="100%">
                                        <LineChart data={graficos.dias}>
                                            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#D1FAE5"/>
                                            <XAxis dataKey="name" tick={{fontSize: 9, fill: '#064E3B', fontWeight: 600}} axisLine={false} tickLine={false} dy={5}/>
                                            <Tooltip content={<CustomTooltip/>}/>
                                            <Line type="monotone" dataKey="value" stroke="#10B981" strokeWidth={3} dot={{r: 4, fill: '#10B981', strokeWidth: 2, stroke: '#fff'}} />
                                        </LineChart>
                                    </ResponsiveContainer>
                                </div>
                                
                                {/* GRÁFICO 1: Desempeño por Agencia (Scroll Vertical) */}
                                <div className="bg-gradient-to-b from-blue-50/50 to-white p-5 rounded-2xl shadow-sm border border-blue-50 h-64 flex flex-col">
                                    <p className="text-xs font-black text-blue-800 mb-4 text-center uppercase tracking-wider">Desempeño por Agencia</p>
                                    <div className="flex-1 w-full overflow-y-auto pr-2 custom-scrollbar">
                                        <ResponsiveContainer width="100%" height={Math.max(200, graficos.agencias.length * 45)}>
                                            <BarChart data={graficos.agencias} layout="vertical" margin={{left: 20, right: 20, top: 0, bottom: 0}}>
                                                <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#DBEAFE"/>
                                                <XAxis type="number" hide />
                                                <YAxis dataKey="name" type="category" tick={{fontSize: 9, fill: '#1E3A8A', fontWeight: 'bold'}} axisLine={false} tickLine={false} width={80}/>
                                                <Tooltip content={<CustomTooltip/>}/>
                                                <Bar dataKey="value" radius={[0,4,4,0]} barSize={20}>
                                                    {graficos.agencias.map((e, idx) => <Cell key={idx} fill={idx === 0 ? '#3B82F6' : '#93C5FD'}/>)}
                                                </Bar>
                                            </BarChart>
                                        </ResponsiveContainer>
                                    </div>
                                </div>
                                
                                {/* GRÁFICO 2: Ingresos por Escalas (Scroll Horizontal) */}
                                <div className="bg-gradient-to-b from-orange-50/50 to-white p-5 rounded-2xl shadow-sm border border-orange-50 h-64 flex flex-col">
                                    <p className="text-xs font-black text-orange-800 mb-4 text-center uppercase tracking-wider">Ingresos por Escalas</p>
                                    <div className="flex-1 w-full overflow-x-auto pb-2 custom-scrollbar">
                                        <ResponsiveContainer width={Math.max(300, graficos.rutas.length * 70)} height="100%">
                                            <BarChart data={graficos.rutas} margin={{top: 10, right: 10, left: -20, bottom: 0}}>
                                                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#FFEDD5"/>
                                                <XAxis dataKey="name" tick={{fontSize: 9, fill: '#9A3412', fontWeight: 600}} axisLine={false} tickLine={false} dy={5}/>
                                                <YAxis hide />
                                                <Tooltip content={<CustomTooltip/>}/>
                                                <Bar dataKey="value" radius={[4,4,0,0]} barSize={35}>
                                                    {graficos.rutas.map((e, idx) => <Cell key={idx} fill={idx === 0 ? '#F59E0B' : '#FCD34D'}/>)}
                                                </Bar>
                                            </BarChart>
                                        </ResponsiveContainer>
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* MEGA-TABLA DE TRAZABILIDAD VIBRANTE */}
                        <div className="bg-white rounded-2xl shadow-lg shadow-emerald-100/50 border border-emerald-100 flex flex-col overflow-hidden">
                            <div className="p-4 flex justify-between items-center bg-gradient-to-r from-emerald-500 to-teal-600 text-white">
                                <h3 className="font-bold text-sm flex items-center gap-2">
                                    <FileSpreadsheet size={18} className="text-emerald-100"/> Registros Detallados de Auditoría
                                </h3>
                                <span className="bg-white text-emerald-700 text-[10px] font-black px-3 py-1 rounded-md shadow-sm">{ventasFiltradas.length} encontrados</span>
                            </div>
                            
                            <div className="overflow-x-auto">
                                <table className="w-full text-xs text-left whitespace-nowrap">
                                    <thead className="text-emerald-800 uppercase bg-emerald-50/50 border-b border-emerald-100 font-bold tracking-wider text-[10px]">
                                        <tr>
                                            <th className="px-4 py-4 w-10 text-center">N°</th>
                                            <th className="px-4 py-4">Comprobante / F. Venta</th>
                                            <th className="px-4 py-4">Pasajero / DNI</th>
                                            <th className="px-4 py-4">Ruta / Nave</th>
                                            <th className="px-4 py-4 text-center">Asiento</th>
                                            <th className="px-4 py-4">Vendedor / Pago</th>
                                            <th className="px-4 py-4 text-center">Estado</th>
                                            <th className="px-4 py-4 text-right">Precio</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-emerald-50">
                                        {currentItems.length === 0 ? (
                                            <tr><td colSpan={8} className="p-12 text-center text-emerald-500 font-medium italic">No se encontraron ventas con los filtros aplicados.</td></tr>
                                        ) : (
                                            currentItems.map((v, i) => {
                                                const isAnulado = v.estado === 'ANULADO' || v.estado === 'CANCELADO';
                                                return (
                                                    <tr key={`${v.id}-${i}`} className={`hover:bg-emerald-50/40 transition-colors ${isAnulado ? 'opacity-60 bg-red-50/20 hover:bg-red-50/40' : ''}`}>
                                                        <td className="px-4 py-3 text-center text-gray-400 font-bold">{indexOfFirstItem + i + 1}</td>
                                                        <td className="px-4 py-3">
                                                            <div className="font-black text-[#2A3F54] font-mono text-sm">{v.comprobante}</div>
                                                            <div className="text-[10px] text-gray-500 flex items-center gap-1 mt-0.5 font-medium"><Calendar size={10} className="text-emerald-500"/> {v.fechaVis} {v.horaVis}</div>
                                                        </td>
                                                        <td className="px-4 py-3">
                                                            <div className="font-bold text-[#2A3F54]">{v.pasajero}</div>
                                                            <div className="text-[10px] text-gray-500 flex items-center gap-1 mt-0.5 font-medium"><User size={10}/> {v.dni}</div>
                                                        </td>
                                                        <td className="px-4 py-3">
                                                            <div className="font-bold text-gray-700 flex items-center gap-1.5"><MapPin size={12} className="text-emerald-500"/> {v.ruta}</div>
                                                            <div className="text-[10px] text-gray-500 flex items-center gap-1 mt-0.5 ml-4 font-medium"><Ship size={10}/> {v.nave}</div>
                                                        </td>
                                                        <td className="px-4 py-3 text-center">
                                                            <span className="bg-gray-100 text-gray-700 px-2.5 py-1 rounded-md text-[10px] font-black border border-gray-200">{v.asiento}</span>
                                                        </td>
                                                        <td className="px-4 py-3">
                                                            <div className="font-bold text-gray-700">{v.vendedor}</div>
                                                            <div className="text-[10px] text-gray-500 flex items-center gap-1 mt-0.5 font-medium"><CreditCard size={10} className="text-blue-500"/> {v.metodoPago}</div>
                                                        </td>
                                                        <td className="px-4 py-3 text-center">
                                                            <span className={`px-2.5 py-1 rounded-md text-[9px] font-black tracking-widest border shadow-sm flex items-center justify-center gap-1 w-fit mx-auto ${
                                                                !isAnulado ? 'bg-green-50 text-green-600 border-green-200' : 'bg-red-50 text-red-600 border-red-200'
                                                            }`}>
                                                                {!isAnulado ? <CheckCircle size={10}/> : <XCircle size={10}/>} {v.estado}
                                                            </span>
                                                        </td>
                                                        <td className="px-4 py-3 text-right">
                                                            <span className={`font-mono font-black text-sm block ${isAnulado ? 'text-red-400 line-through' : 'text-emerald-600'}`}>
                                                                {formatMoney(v.monto)}
                                                            </span>
                                                        </td>
                                                    </tr>
                                                );
                                            })
                                        )}
                                    </tbody>
                                </table>
                            </div>

                            {/* Paginación */}
                            {totalPages > 1 && (
                                <div className="p-4 border-t border-emerald-100 bg-emerald-50/30 flex justify-between items-center">
                                    <span className="text-xs text-gray-500 font-bold">Mostrando <span className="text-[#2A3F54]">{indexOfFirstItem + 1} - {Math.min(indexOfLastItem, ventasFiltradas.length)}</span> de {ventasFiltradas.length}</span>
                                    <div className="flex gap-2">
                                        <button onClick={() => setCurrentPage(p => p - 1)} disabled={currentPage === 1} className="p-1.5 bg-white border border-emerald-200 text-emerald-600 rounded-md hover:bg-emerald-50 disabled:opacity-50 transition-colors shadow-sm"><ChevronLeft size={16}/></button>
                                        <button onClick={() => setCurrentPage(p => p + 1)} disabled={currentPage === totalPages} className="p-1.5 bg-white border border-emerald-200 text-emerald-600 rounded-md hover:bg-emerald-50 disabled:opacity-50 transition-colors shadow-sm"><ChevronRight size={16}/></button>
                                    </div>
                                </div>
                            )}
                        </div>

                    </div>
                )}
            </div>
        </MainLayout>
    );
};

export default HistorialVentasPage;