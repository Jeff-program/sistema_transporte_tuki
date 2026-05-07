import React, { useState, useEffect, useMemo } from 'react';
import MainLayout from '../../layouts/MainLayout';
import { Tooltip, ResponsiveContainer, Cell, PieChart, Pie, Legend } from 'recharts';
import { 
    Store, AlertTriangle, Clock, CheckCircle, Search, Activity, User, ChevronRight, ChevronLeft, 
    FileText, Calendar, Filter, XCircle, TrendingDown, Target, AlertOctagon, Zap, MapPin
} from 'lucide-react';
import { getViajes } from '../../services/configService';
import { getManifiesto } from '../../services/ventaService';
import { notificarError } from '../../services/feedbackService';
import api from '../../services/api';

const ControlCajaPage = () => {
    const [loading, setLoading] = useState(true);
    const [datosCajas, setDatosCajas] = useState<any[]>([]);
    const [movimientos, setMovimientos] = useState<any[]>([]);
    
    const [busqueda, setBusqueda] = useState('');
    const [fechaInicio, setFechaInicio] = useState(''); 
    const [fechaFin, setFechaFin] = useState('');
    const [filtroAgencia, setFiltroAgencia] = useState('');
    const [filtroAsesor, setFiltroAsesor] = useState('');
    const [filtroCuadre, setFiltroCuadre] = useState(''); 
    const [filtroTipoMov, setFiltroTipoMov] = useState(''); 

    const [opciones, setOpciones] = useState({ agencias: new Set<string>(), asesores: new Set<string>() });

    const [paginaMovs, setPaginaMovs] = useState(1);
    const [paginaCajas, setPaginaCajas] = useState(1);
    const ITEMS_POR_PAGINA = 5;

    const [paginaAgencias, setPaginaAgencias] = useState(1);
    const [paginaAlertas, setPaginaAlertas] = useState(1);
    const ITEMS_SECUNDARIOS = 4;

    useEffect(() => { cargarAuditoria(); }, []);

    const formatMoney = (amount: number) => new Intl.NumberFormat('es-PE', { style: 'currency', currency: 'PEN' }).format(amount || 0);

    const calcularHoras = (fechaInicio: string, fechaFin: string | null) => {
        if (!fechaInicio) return 0;
        const inicio = new Date(fechaInicio).getTime();
        const fin = fechaFin ? new Date(fechaFin).getTime() : new Date().getTime();
        return parseFloat(((fin - inicio) / (1000 * 60 * 60)).toFixed(1)); 
    };

    const calcularTiempoExacto = (fechaInicio: string, fechaFin: string | null) => {
        if (!fechaInicio) return '0h 0m';
        const inicio = new Date(fechaInicio).getTime();
        const fin = fechaFin ? new Date(fechaFin).getTime() : new Date().getTime();
        const diffMs = fin - inicio;
        
        const hrs = Math.floor(diffMs / (1000 * 60 * 60));
        const mins = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));
        return `${hrs}h ${mins}m`;
    };

    const formatearHoraExacta = (fechaRaw: any) => {
        if (!fechaRaw) return '--:--';
        try {
            let d;
            if (Array.isArray(fechaRaw)) {
                d = new Date(fechaRaw[0], fechaRaw[1] - 1, fechaRaw[2], fechaRaw[3] || 0, fechaRaw[4] || 0, fechaRaw[5] || 0);
            } else {
                d = new Date(fechaRaw);
            }
            if(isNaN(d.getTime())) return String(fechaRaw);
            return d.toLocaleTimeString('es-PE', { hour: '2-digit', minute: '2-digit', hour12: true });
        } catch { return String(fechaRaw); }
    };

    const formatearFechaYHora = (fechaRaw: any) => {
        if (!fechaRaw) return '--';
        try {
            let d;
            if (Array.isArray(fechaRaw)) {
                d = new Date(fechaRaw[0], fechaRaw[1] - 1, fechaRaw[2], fechaRaw[3] || 0, fechaRaw[4] || 0, fechaRaw[5] || 0);
            } else {
                d = new Date(fechaRaw);
            }
            if(isNaN(d.getTime())) return String(fechaRaw);
            return d.toLocaleString('es-PE', { 
                day: '2-digit', month: '2-digit', year: 'numeric', 
                hour: '2-digit', minute: '2-digit', hour12: true 
            });
        } catch { return String(fechaRaw); }
    };

    const cargarAuditoria = async () => {
        setLoading(true);
        try {
            const [resCajas, resMovs] = await Promise.all([
                api.get('/reportes/auditoria-cajas'),
                api.get('/reportes/movimientos')
            ]);
            
            const dataCajas = resCajas.data;
            const dataMovs = resMovs.data;

            const cajasArray = dataCajas.map((c: any) => {
                return {
                    id: c.idTurno,
                    asesor: c.asesor,
                    agencia: c.agencia,
                    estado: c.estado,
                    fechaApertura: c.fechaApertura,
                    fechaCierre: c.fechaCierre,
                    fechaFiltro: c.fechaApertura ? c.fechaApertura.split('T')[0] : '',
                    saldoInicial: c.saldoInicial,
                    saldoFinal: c.saldoFinal,
                    diferencia: c.diferencia,
                    ingresos: c.ingresos,
                    devoluciones: c.devoluciones,
                    
                    totalEsperado: c.saldoInicial + c.ingresos - c.devoluciones,
                    totalDeclarado: c.saldoInicial + c.ingresos - c.devoluciones + c.diferencia,
                    horasActivo: calcularHoras(c.fechaApertura, c.fechaCierre),
                    tiempoExactoStr: calcularTiempoExacto(c.fechaApertura, c.fechaCierre),
                    estadoCuadre: c.estado === 'ABIERTO' ? 'PENDIENTE' 
                                : c.diferencia === 0 ? 'CUADRADO' 
                                : c.diferencia < 0 ? 'FALTANTE' : 'SOBRANTE'
                };
            });

            const movsArray = dataMovs.map((m: any) => ({
                ...m,
                fechaFiltro: m.hora ? m.hora.split('T')[0] : '',
                color: m.tipo === 'CIERRE' ? 'text-indigo-600 bg-indigo-50' :
                       m.tipo === 'APERTURA' ? 'text-blue-600 bg-blue-50' :
                       m.tipo === 'VENTA' ? 'text-emerald-600 bg-emerald-50' :
                       'text-rose-600 bg-rose-50'
            }));

            setDatosCajas(cajasArray);
            setMovimientos(movsArray); 
            
            const agSet = new Set<string>();
            const asSet = new Set<string>();
            cajasArray.forEach((c: any) => {
                agSet.add(c.agencia);
                asSet.add(c.asesor);
            });
            setOpciones({ agencias: agSet, asesores: asSet });

        } catch (error) { 
            console.error("Detalle del error:", error);
            notificarError("Error cargando los datos del reporte."); 
        } finally { 
            setLoading(false); 
        }
    };

    const cajasFiltradas = useMemo(() => {
        return datosCajas.filter(c => {
            if (fechaInicio && c.fechaFiltro < fechaInicio) return false;
            if (fechaFin && c.fechaFiltro > fechaFin) return false;
            if (filtroAgencia && c.agencia !== filtroAgencia) return false;
            if (filtroAsesor && c.asesor !== filtroAsesor) return false;
            if (filtroCuadre && c.estadoCuadre !== filtroCuadre) return false;
            if (busqueda && !c.asesor.toLowerCase().includes(busqueda.toLowerCase()) && !c.agencia.toLowerCase().includes(busqueda.toLowerCase())) return false;
            return true;
        });
    }, [datosCajas, fechaInicio, fechaFin, filtroAgencia, filtroAsesor, filtroCuadre, busqueda]);

    const analitica = useMemo(() => {
        let cuadradas = 0, faltantesCount = 0, sobrantesCount = 0, cerradas = 0;
        let totalFaltante = 0, totalSobrante = 0, totalDevoluciones = 0, sumaHoras = 0;
        
        const agenciasMap: Record<string, any> = {};
        const alertasActivas: any[] = [];

        cajasFiltradas.forEach(c => {
            totalDevoluciones += c.devoluciones;

            if (!agenciasMap[c.agencia]) agenciasMap[c.agencia] = { nombre: c.agencia, ingresos: 0, diferenciasAbs: 0 };
            agenciasMap[c.agencia].ingresos += c.ingresos;
            if (c.estado === 'CERRADO') agenciasMap[c.agencia].diferenciasAbs += Math.abs(c.diferencia);
            
            if (c.estado === 'CERRADO') {
                cerradas++;
                sumaHoras += c.horasActivo;

                if (c.diferencia === 0) {
                    cuadradas++;
                } else {
                    if (c.diferencia < 0) {
                        faltantesCount++;
                        totalFaltante += Math.abs(c.diferencia);
                        if (c.diferencia <= -20) {
                            alertasActivas.push({ tipo: 'CRÍTICO', msj: `Faltante de ${formatMoney(c.diferencia)} en caja de ${c.asesor} (${c.fechaFiltro})`});
                        }
                    } else {
                        sobrantesCount++;
                        totalSobrante += c.diferencia;
                    }
                }
            }
        });

        const rankingAgencias = Object.values(agenciasMap).map((a:any) => ({
            ...a,
            riesgo: a.ingresos > 0 ? ((a.diferenciasAbs / a.ingresos) * 100).toFixed(2) : 0
        })).sort((a:any, b:any) => b.riesgo - a.riesgo);

        const tasaError = cerradas > 0 ? ((faltantesCount + sobrantesCount) / cerradas) * 100 : 0;
        const semaforo = tasaError < 10 ? 'SALUDABLE' : tasaError <= 30 ? 'RIESGO MEDIO' : 'ALTO RIESGO';
        const semaforoColor = tasaError < 10 ? 'text-emerald-500 bg-emerald-50 border-emerald-300' : tasaError <= 30 ? 'text-amber-500 bg-amber-50 border-amber-300' : 'text-red-600 bg-red-50 border-red-300';

        return {
            cerradas, cuadradas, faltantesCount, sobrantesCount, totalFaltante, totalSobrante, totalDevoluciones,
            promedioHoras: cerradas > 0 ? (sumaHoras / cerradas).toFixed(1) : 0,
            eficiencia: cerradas > 0 ? ((cuadradas / cerradas) * 100).toFixed(1) : 0,
            alertas: alertasActivas, semaforo, semaforoColor, tasaError: tasaError.toFixed(1),
            rankingAgencias
        };
    }, [cajasFiltradas]);

    const cajasOrdenadas = useMemo(() => {
        return [...cajasFiltradas].sort((a, b) => {
            const getMs = (val: any) => {
                if(!val) return 0;
                if(Array.isArray(val)) return new Date(val[0], val[1]-1, val[2], val[3]||0, val[4]||0, val[5]||0).getTime();
                return new Date(val).getTime();
            };
            return getMs(b.fechaApertura) - getMs(a.fechaApertura);
        });
    }, [cajasFiltradas]);

    const dataGraficoDif = useMemo(() => {
        const agruparAsesores: Record<string, number> = {};
        cajasFiltradas.filter(c => c.estado === 'CERRADO' && c.diferencia !== 0).forEach(c => {
            const nombreCorta = c.asesor.split(' ')[0];
            agruparAsesores[nombreCorta] = (agruparAsesores[nombreCorta] || 0) + c.diferencia;
        });
        return Object.entries(agruparAsesores).map(([asesor, diferencia]) => ({ asesor, diferencia })).sort((a,b) => a.diferencia - b.diferencia);
    }, [cajasFiltradas]);

    const dataPieCuadre = [
        { name: 'Cuadrado Exacto', value: analitica.cuadradas, color: '#10B981' }, 
        { name: 'Sobrante en Caja', value: analitica.sobrantesCount, color: '#F59E0B' }, 
        { name: 'Faltante (Pérdida)', value: analitica.faltantesCount, color: '#EF4444' }  
    ].filter(d => d.value > 0);

    const movsFiltrados = movimientos.filter(m => {
        if (fechaInicio && m.fechaFiltro < fechaInicio) return false;
        if (fechaFin && m.fechaFiltro > fechaFin) return false;
        if (filtroAgencia && m.agencia !== filtroAgencia) return false;
        if (filtroAsesor && m.usuario !== filtroAsesor) return false;
        if (filtroTipoMov && m.tipo !== filtroTipoMov) return false;
        if (busqueda && !m.usuario.toLowerCase().includes(busqueda.toLowerCase()) && !m.tipo.toLowerCase().includes(busqueda.toLowerCase())) return false;
        return true;
    });

    const alertasTiempoFiltradas = cajasFiltradas.filter(c => c.horasActivo > 12 || c.horasActivo < 2);

    const totalPaginasMovs = Math.ceil(movsFiltrados.length / ITEMS_POR_PAGINA);
    const movsPaginados = movsFiltrados.slice((paginaMovs - 1) * ITEMS_POR_PAGINA, paginaMovs * ITEMS_POR_PAGINA);
    
    const totalPaginasCajas = Math.ceil(cajasOrdenadas.length / ITEMS_POR_PAGINA);
    const cajasPaginadas = cajasOrdenadas.slice((paginaCajas - 1) * ITEMS_POR_PAGINA, paginaCajas * ITEMS_POR_PAGINA);

    const totalPaginasAgencias = Math.ceil(analitica.rankingAgencias.length / ITEMS_SECUNDARIOS);
    const agenciasPaginadas = analitica.rankingAgencias.slice((paginaAgencias - 1) * ITEMS_SECUNDARIOS, paginaAgencias * ITEMS_SECUNDARIOS);

    const totalPaginasAlertas = Math.ceil(alertasTiempoFiltradas.length / ITEMS_SECUNDARIOS);
    const alertasPaginadas = alertasTiempoFiltradas.slice((paginaAlertas - 1) * ITEMS_SECUNDARIOS, paginaAlertas * ITEMS_SECUNDARIOS);

    useEffect(() => { 
        setPaginaMovs(1); setPaginaCajas(1); setPaginaAgencias(1); setPaginaAlertas(1); 
    }, [filtroAgencia, filtroAsesor, filtroCuadre, filtroTipoMov, busqueda, fechaInicio, fechaFin]);

    const limpiarFiltros = () => {
        setFechaInicio(''); setFechaFin(''); setBusqueda('');
        setFiltroAgencia(''); setFiltroAsesor(''); setFiltroCuadre(''); setFiltroTipoMov('');
    };

    const renderCustomizedLabel = ({ cx, cy, midAngle, innerRadius, outerRadius, percent }: any) => {
        const radius = innerRadius + (outerRadius - innerRadius) * 0.5;
        const x = cx + radius * Math.cos(-midAngle * Math.PI / 180);
        const y = cy + radius * Math.sin(-midAngle * Math.PI / 180);
        if(percent < 0.05) return null; 
        return (
            <text x={x} y={y} fill="white" fontSize={12} fontWeight="bold" textAnchor="middle" dominantBaseline="central" style={{ filter: 'drop-shadow(0px 2px 2px rgba(0,0,0,0.5))' }}>
                {`${(percent * 100).toFixed(0)}%`}
            </text>
        );
    };

    return (
        <MainLayout>
            <div className="max-w-[1400px] mx-auto pb-10 space-y-6 ">
                
                {/* HEADER Y SEMÁFORO GLOBAL  */}
                <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 mb-8 flex flex-col md:flex-row md:items-center justify-between gap-4 animate-in slide-in-from-top-4">
                    <div className="relative z-10">
                        <h1 className="text-2xl font-bold text-[#2A3F54] flex items-center gap-3"><Activity size={36} className="p-2 bg-blue-50 rounded-lg text-[#1ABB9C]"/> Auditoría y Control de Cajas</h1>
                        <p className="text-sm text-gray-400 mt-1 ml-1">Monitoreo gerencial de turnos, detección de fugas y evaluación financiera.</p>
                    </div>
                    <div className={`relative z-10 px-8 py-4 rounded-2xl border-2 flex flex-col items-center justify-center min-w-[220px] shadow-xl backdrop-blur-sm ${analitica.semaforoColor.replace('bg-', 'bg-opacity-90 bg-')}`}>
                        <p className="text-[10px] font-black uppercase tracking-widest opacity-80 mb-1">Estado del Sistema</p>
                        <div className="flex items-center gap-2">
                            {analitica.semaforo === 'SALUDABLE' ? <CheckCircle size={28}/> : <AlertOctagon size={28}/>}
                            <h2 className="text-2xl font-black">{analitica.semaforo}</h2>
                        </div>
                        <p className="text-xs font-bold mt-1 opacity-90">{analitica.tasaError}% de cajas con descuadre</p>
                    </div>
                </div>

                {/* ALERTAS CRÍTICAS */}
                {analitica.alertas.length > 0 && (
                    <div className="bg-gradient-to-r from-red-50 to-rose-50 border-l-4 border-red-500 rounded-2xl p-5 shadow-md">
                        <h3 className="text-red-800 font-black text-sm mb-3 flex items-center gap-2"><AlertTriangle size={18}/> Detecciones Automáticas de Riesgo</h3>
                        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
                            {analitica.alertas.slice(0, 6).map((al, idx) => (
                                <div key={idx} className="bg-white p-3 rounded-xl border border-red-100 flex items-start gap-3 shadow-sm hover:shadow-md transition-shadow">
                                    <div className={`p-1.5 rounded-lg ${al.tipo === 'CRÍTICO' ? 'bg-red-100 text-red-600' : 'bg-orange-100 text-orange-600'}`}><Zap size={14}/></div>
                                    <p className="text-xs text-gray-700 font-bold leading-tight pt-0.5">{al.msj}</p>
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {/* PANEL DE FILTROS GERENCIALES */}
                <div className="bg-white p-6 rounded-3xl shadow-lg border border-indigo-50 relative overflow-hidden">
                    <div className="absolute top-0 left-0 w-1 h-full bg-gradient-to-b from-indigo-500 to-cyan-500"></div>
                    <div className="flex items-center justify-between mb-4 text-[#2A3F54] font-black border-b border-gray-100 pb-3">
                        <div className="flex items-center gap-2"><Filter size={18} className="text-indigo-500"/> Filtros Globales de Auditoría</div>
                        <button onClick={limpiarFiltros} className="text-xs font-bold text-red-500 hover:text-white hover:bg-red-500 bg-red-50 px-4 py-2 rounded-xl transition-colors border border-red-100 flex items-center gap-1"><XCircle size={14}/> Limpiar Todo</button>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-3 xl:grid-cols-6 gap-4">
                        <div className="xl:col-span-2 relative group">
                            <Search className="absolute left-3 top-3 text-indigo-400 group-focus-within:text-indigo-600 transition-colors" size={16} />
                            <input type="text" placeholder="Buscar por asesor o agencia..." value={busqueda} onChange={e => setBusqueda(e.target.value)} className="pl-10 pr-3 py-2.5 w-full text-sm font-bold border border-gray-200 rounded-xl focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 outline-none bg-gray-50 hover:bg-white transition-all"/>
                        </div>
                        <div className="xl:col-span-2 flex items-center gap-2 bg-gray-50 px-4 py-2.5 rounded-xl border border-gray-200 focus-within:border-indigo-500 focus-within:ring-2 focus-within:ring-indigo-100 transition-all hover:bg-white">
                            <Calendar size={16} className="text-indigo-400"/>
                            <input type="date" value={fechaInicio} onChange={e => setFechaInicio(e.target.value)} className="bg-transparent text-xs font-bold outline-none w-full text-[#2A3F54]"/>
                            <span className="text-gray-300">-</span>
                            <input type="date" value={fechaFin} onChange={e => setFechaFin(e.target.value)} className="bg-transparent text-xs font-bold outline-none w-full text-[#2A3F54]"/>
                        </div>
                        <select value={filtroAgencia} onChange={e => setFiltroAgencia(e.target.value)} className="py-2.5 px-4 text-xs font-bold border border-gray-200 rounded-xl focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 outline-none bg-gray-50 hover:bg-white transition-all text-[#2A3F54] cursor-pointer">
                            <option value="">Todas las Agencias</option>
                            {Array.from(opciones.agencias).map(a => <option key={a} value={a}>{a}</option>)}
                        </select>
                        <select value={filtroCuadre} onChange={e => setFiltroCuadre(e.target.value)} className="py-2.5 px-4 text-xs font-bold border border-gray-200 rounded-xl focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 outline-none bg-gray-50 hover:bg-white transition-all text-[#2A3F54] cursor-pointer">
                            <option value="">Estado de Cuadre</option>
                            <option value="CUADRADO">🟢 Cuadre Exacto</option>
                            <option value="FALTANTE">🔴 Faltantes</option>
                            <option value="SOBRANTE">🟡 Sobrantes</option>
                            <option value="PENDIENTE">⏳ Cajas Abiertas</option>
                        </select>
                    </div>
                </div>

                {loading ? (
                    <div className="flex justify-center items-center py-20"><div className="animate-spin rounded-full h-12 w-12 border-b-4 border-indigo-500"></div></div>
                ) : (
                    <>
                        {/* 1. KPIs */}
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-5">
                            <div className="bg-gradient-to-br from-emerald-400 to-green-600 p-6 rounded-3xl shadow-lg shadow-emerald-500/30 text-white relative overflow-hidden group hover:-translate-y-1 transition-transform">
                                <CheckCircle className="absolute -right-4 -bottom-4 opacity-20 group-hover:scale-110 transition-transform" size={100}/>
                                <p className="text-[11px] font-black uppercase tracking-widest mb-1 opacity-90">Cajas Cuadradas</p>
                                <h2 className="text-4xl font-black relative z-10">{analitica.cuadradas}</h2>
                            </div>
                            <div className="bg-gradient-to-br from-rose-500 to-red-700 p-6 rounded-3xl shadow-lg shadow-rose-500/30 text-white relative overflow-hidden group hover:-translate-y-1 transition-transform">
                                <AlertTriangle className="absolute -right-4 -bottom-4 opacity-20 group-hover:scale-110 transition-transform" size={100}/>
                                <p className="text-[11px] font-black uppercase tracking-widest mb-1 opacity-90">Faltantes Totales</p>
                                <h2 className="text-4xl font-black relative z-10">{formatMoney(analitica.totalFaltante)}</h2>
                            </div>
                            <div className="bg-gradient-to-br from-amber-400 to-orange-500 p-6 rounded-3xl shadow-lg shadow-amber-500/30 text-white relative overflow-hidden group hover:-translate-y-1 transition-transform">
                                <TrendingDown className="absolute -right-4 -bottom-4 opacity-20 group-hover:scale-110 transition-transform" size={100}/>
                                <p className="text-[11px] font-black uppercase tracking-widest mb-1 opacity-90">Devoluciones (Caja)</p>
                                <h2 className="text-4xl font-black relative z-10">{formatMoney(analitica.totalDevoluciones)}</h2>
                            </div>
                            <div className="bg-gradient-to-br from-blue-500 to-indigo-600 p-6 rounded-3xl shadow-lg shadow-blue-500/30 text-white relative overflow-hidden group hover:-translate-y-1 transition-transform">
                                <Clock className="absolute -right-4 -bottom-4 opacity-20 group-hover:scale-110 transition-transform" size={100}/>
                                <p className="text-[11px] font-black uppercase tracking-widest mb-1 opacity-90">T. Promedio (Hrs)</p>
                                <h2 className="text-4xl font-black relative z-10">{analitica.promedioHoras} h</h2>
                            </div>
                        </div>

                        {/* GRÁFICOS GERENCIALES Y EXTRACTO DE MOVIMIENTOS */}
                        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                            
                            {/* 📈 Extracto de Movimientos (Reemplaza a Tendencia) */}
                            <div className="bg-white rounded-3xl shadow-xl shadow-indigo-100/40 border border-indigo-50 lg:col-span-2 flex flex-col h-[350px] overflow-hidden">
                                <div className="p-4 bg-gradient-to-r from-emerald-500 to-teal-600 flex flex-col md:flex-row justify-between items-start md:items-center gap-2 text-white">
                                    <div>
                                        <h3 className="font-black flex items-center gap-2 text-sm"><FileText size={18} className="text-emerald-200"/> Extracto de Movimientos</h3>
                                        <p className="text-[10px] font-medium text-emerald-100 tracking-wide mt-1">Línea de tiempo con hora exacta.</p>
                                    </div>
                                    <select value={filtroTipoMov} onChange={e => setFiltroTipoMov(e.target.value)} className="py-1 px-3 text-[10px] font-black border border-emerald-400/30 rounded-lg outline-none bg-white text-emerald-900 shadow-sm w-full md:w-auto cursor-pointer focus:border-emerald-300 transition-colors">
                                        <option value="">Todos los Movimientos</option>
                                        <option value="APERTURA">Aperturas</option>
                                        <option value="VENTA">Ventas</option>
                                        <option value="DEVOLUCIÓN">Devoluciones</option>
                                        <option value="CIERRE">Cierres</option>
                                    </select>
                                </div>
                                <div className="flex-1 overflow-x-auto overflow-y-auto p-0 custom-scrollbar">
                                    <table className="w-full text-xs text-left whitespace-nowrap">
                                        <thead className="text-emerald-800 bg-emerald-50/50 sticky top-0 font-black uppercase text-[9px] z-10">
                                            <tr>
                                                <th className="p-3 w-10 text-center">N°</th>
                                                <th className="p-3">Tipo</th>
                                                <th className="p-3 text-right">Monto</th>
                                                <th className="p-3">Fecha y Hora Exacta</th>
                                                <th className="p-3">Usuario y Agencia</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-emerald-50">
                                            {movsPaginados.length === 0 ? (
                                                <tr><td colSpan={5} className="p-8 text-center text-gray-400 italic font-bold">No hay movimientos que coincidan.</td></tr>
                                            ) : movsPaginados.map((m, i) => (
                                                <tr key={i} className="hover:bg-emerald-50/40 transition-colors rounded-xl">
                                                    <td className="p-3 text-center font-bold text-gray-400">{(paginaMovs - 1) * ITEMS_POR_PAGINA + i + 1}</td>
                                                    <td className="p-3"><span className={`px-2.5 py-1 rounded-lg font-black text-[9px] tracking-widest ${m.color}`}>{m.tipo}</span></td>
                                                    <td className={`p-3 text-right font-mono font-black text-sm ${
                                                        m.tipo === 'CIERRE' ? 'text-indigo-600' : 
                                                        m.tipo === 'APERTURA' ? 'text-blue-600' :
                                                        m.monto > 0 ? 'text-emerald-600' : 
                                                        m.monto < 0 ? 'text-rose-600' : 'text-gray-400'
                                                    }`}>
                                                        {m.monto !== 0 ? (m.tipo === 'VENTA' ? `+${formatMoney(m.monto)}` : formatMoney(m.monto)) : formatMoney(0)}
                                                    </td>
                                                    <td className="p-3 font-mono font-bold text-gray-600">{formatearFechaYHora(m.hora)}</td>
                                                    <td className="p-3"><div className="font-bold text-[#2A3F54] flex items-center gap-1.5"><User size={12} className="text-emerald-500"/> {m.usuario}</div><div className="text-[9px] font-bold text-emerald-600/70 mt-0.5 ml-4">{m.agencia}</div></td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                                {/* Paginación*/}
                                {totalPaginasMovs > 1 && (
                                    <div className="p-3 bg-emerald-50/50 border-t border-emerald-100 flex justify-between items-center text-[10px] text-emerald-800 font-black">
                                        <span>Pág {paginaMovs} de {totalPaginasMovs}</span>
                                        <div className="flex gap-2">
                                            <button onClick={() => setPaginaMovs(p => Math.max(1, p - 1))} disabled={paginaMovs === 1} className="px-3 py-1.5 rounded-lg bg-white border border-emerald-200 shadow-sm disabled:opacity-50 hover:bg-emerald-50 transition-colors"><ChevronLeft size={14}/></button>
                                            <button onClick={() => setPaginaMovs(p => Math.min(totalPaginasMovs, p + 1))} disabled={paginaMovs === totalPaginasMovs} className="px-3 py-1.5 rounded-lg bg-white border border-emerald-200 shadow-sm disabled:opacity-50 hover:bg-emerald-50 transition-colors"><ChevronRight size={14}/></button>
                                        </div>
                                    </div>
                                )}
                            </div>

                            {/* Disciplina de Cuadre */}
                            <div className="bg-white p-6 rounded-3xl shadow-xl shadow-indigo-100/40 border border-indigo-50 flex flex-col h-[350px]">
                                <h3 className="text-sm font-black text-[#2A3F54] mb-1 flex items-center gap-2"><Target size={18} className="text-indigo-500"/> Disciplina de Cuadre</h3>
                                <p className="text-[10px] font-bold text-gray-400 mb-2 uppercase tracking-wider">Proporción de estados de cierre.</p>
                                <div className="flex-1 w-full">
                                    {dataPieCuadre.length === 0 ? <div className="flex h-full items-center justify-center text-gray-300 italic text-sm font-bold">No hay datos</div> :
                                    <ResponsiveContainer width="100%" height="100%">
                                        <PieChart>
                                            <Pie data={dataPieCuadre} cx="50%" cy="50%" innerRadius={50} outerRadius={90} dataKey="value" stroke="white" strokeWidth={3} labelLine={false} label={renderCustomizedLabel}>
                                                {dataPieCuadre.map((entry, index) => <Cell key={`cell-${index}`} fill={entry.color} />)}
                                            </Pie>
                                            <Tooltip formatter={(val: any) => [`${val} Cajas`, 'Cantidad']} contentStyle={{borderRadius:'12px', border:'none', boxShadow:'0 10px 15px -3px rgba(0,0,0,0.1)', fontWeight:'bold'}}/>
                                            <Legend wrapperStyle={{fontSize: '11px', fontWeight: 'bold'}} />
                                        </PieChart>
                                    </ResponsiveContainer>}
                                </div>
                            </div>
                        </div>

                        {/* RANKING AGENCIAS Y ALERTAS TIEMPO (2 COLUMNAS) */}
                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                            
                            <div className="bg-white rounded-3xl shadow-xl shadow-indigo-100/40 border border-indigo-50 overflow-hidden flex flex-col h-[300px]">
                                <div className="p-4 bg-gradient-to-r from-blue-600 to-indigo-700 text-white flex justify-between items-center">
                                    <h3 className="font-bold text-sm flex items-center gap-2"><MapPin size={16} className="text-blue-200"/> Nivel de Riesgo por Agencia</h3>
                                </div>
                                <div className="flex-1 overflow-x-auto custom-scrollbar">
                                    <table className="w-full text-xs text-left whitespace-nowrap">
                                        <thead className="bg-indigo-50/50 text-indigo-800 sticky top-0 z-10">
                                            <tr className="font-black uppercase text-[9px]">
                                                <th className="p-3 w-10 text-center">N°</th>
                                                <th className="p-3">Agencia</th>
                                                <th className="p-3 text-right">Riesgo (%)</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-gray-50">
                                            {agenciasPaginadas.length === 0 ? (
                                                <tr><td colSpan={3} className="p-8 text-center text-gray-400 italic">No hay datos disponibles.</td></tr>
                                            ) : agenciasPaginadas.map((ag:any, i:number) => (
                                                <tr key={i} className="hover:bg-indigo-50/50 transition-colors">
                                                    <td className="p-3 text-center font-bold text-gray-400">{(paginaAgencias - 1) * ITEMS_SECUNDARIOS + i + 1}</td>
                                                    <td className="p-3 font-bold text-[#2A3F54]">{ag.nombre}</td>
                                                    <td className="p-3 text-right">
                                                        <span className={`px-2.5 py-1 rounded-lg font-black ${ag.riesgo > 2 ? 'bg-red-100 text-red-600' : 'bg-emerald-100 text-emerald-600'}`}>{ag.riesgo}%</span>
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                                {/* Paginación */}
                                {totalPaginasAgencias > 1 && (
                                    <div className="p-3 bg-indigo-50/30 border-t border-indigo-100 flex justify-between items-center text-[10px] text-indigo-800 font-black">
                                        <span>Pág {paginaAgencias} de {totalPaginasAgencias}</span>
                                        <div className="flex gap-2">
                                            <button onClick={() => setPaginaAgencias(p => Math.max(1, p - 1))} disabled={paginaAgencias === 1} className="px-2.5 py-1.5 rounded-lg bg-white border border-indigo-200 shadow-sm disabled:opacity-50 hover:bg-indigo-50 transition-colors"><ChevronLeft size={13}/></button>
                                            <button onClick={() => setPaginaAgencias(p => Math.min(totalPaginasAgencias, p + 1))} disabled={paginaAgencias === totalPaginasAgencias} className="px-2.5 py-1.5 rounded-lg bg-white border border-indigo-200 shadow-sm disabled:opacity-50 hover:bg-indigo-50 transition-colors"><ChevronRight size={13}/></button>
                                        </div>
                                    </div>
                                )}
                            </div>

                            <div className="bg-white rounded-3xl shadow-xl shadow-indigo-100/40 border border-indigo-50 overflow-hidden flex flex-col h-[300px]">
                                <div className="p-4 bg-gradient-to-r from-rose-500 to-red-600 text-white flex justify-between items-center">
                                    <h3 className="font-bold text-sm flex items-center gap-2"><Clock size={16} className="text-rose-200"/> Alertas de Tiempo de Turno</h3>
                                </div>
                                <div className="flex-1 overflow-x-auto custom-scrollbar">
                                    <table className="w-full text-xs text-left whitespace-nowrap">
                                        <thead className="bg-rose-50/50 text-rose-800 sticky top-0 z-10">
                                            <tr className="font-black uppercase text-[9px]">
                                                <th className="p-3 w-10 text-center">N°</th>
                                                <th className="p-3">Asesor</th>
                                                <th className="p-3 text-center">Tiempo de Turno</th>
                                                <th className="p-3 text-right">Diagnóstico</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-gray-50">
                                            {alertasPaginadas.length === 0 ? (
                                                <tr><td colSpan={4} className="p-8 text-center text-emerald-500 text-xs font-bold bg-emerald-50/30 m-2 rounded-xl">Todos los turnos tienen tiempos normales 🎉</td></tr>
                                            ) : alertasPaginadas.map((c:any, i:number) => (
                                                <tr key={i} className="bg-red-50/50 hover:bg-red-100/50 transition-colors">
                                                    <td className="p-3 text-center font-bold text-rose-400">{(paginaAlertas - 1) * ITEMS_SECUNDARIOS + i + 1}</td>
                                                    <td className="p-3 font-bold text-[#2A3F54]">{c.asesor.split(' ')[0]}</td>
                                                    <td className="p-3 text-center font-black text-rose-600">{c.tiempoExactoStr}</td>
                                                    <td className="p-3 text-right text-[10px] font-bold text-red-700">{c.horasActivo > 12 ? 'Excesivo (>12h)' : 'Sospechoso (<2h)'}</td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                                {/* Paginación */}
                                {totalPaginasAlertas > 1 && (
                                    <div className="p-3 bg-rose-50/30 border-t border-rose-100 flex justify-between items-center text-[10px] text-rose-800 font-black">
                                        <span>Pág {paginaAlertas} de {totalPaginasAlertas}</span>
                                        <div className="flex gap-2">
                                            <button onClick={() => setPaginaAlertas(p => Math.max(1, p - 1))} disabled={paginaAlertas === 1} className="px-2.5 py-1.5 rounded-lg bg-white border border-rose-200 shadow-sm disabled:opacity-50 hover:bg-rose-50 transition-colors"><ChevronLeft size={13}/></button>
                                            <button onClick={() => setPaginaAlertas(p => Math.min(totalPaginasAlertas, p + 1))} disabled={paginaAlertas === totalPaginasAlertas} className="px-2.5 py-1.5 rounded-lg bg-white border border-rose-200 shadow-sm disabled:opacity-50 hover:bg-rose-50transition-colors"><ChevronRight size={13}/></button>
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* 4. ESTADO DE CAJA POR TURNO */}
                        <div className="bg-white rounded-3xl shadow-xl shadow-indigo-100/40 border border-indigo-50 overflow-hidden">
                            <div className="p-5 bg-gradient-to-r from-blue-700 to-indigo-800 text-white flex justify-between items-center">
                                <div><h3 className="font-black flex items-center gap-2"><Store size={18} className="text-cyan-400"/> Estado de Caja por Turno</h3><p className="text-[10px] text-indigo-200 mt-1 font-medium tracking-wide">Ordenado de cajas más recientes a antiguas.</p></div>
                                <span className="bg-white/20 text-white text-[10px] font-black px-3 py-1 rounded-lg backdrop-blur-sm">{cajasOrdenadas.length} Registros</span>
                            </div>
                            <div className="overflow-x-auto p-2">
                                <table className="w-full text-xs text-left whitespace-nowrap">
                                    <thead className="text-indigo-800 font-black uppercase text-[10px] bg-indigo-50/50 rounded-xl">
                                        <tr>
                                            <th className="p-4 w-12 text-center whitespace-nowrap">N°</th>
                                            <th className="p-4 whitespace-nowrap">Asesor / Agencia</th>
                                            <th className="p-4 text-center whitespace-nowrap">F. Apertura</th>
                                            <th className="p-4 text-center whitespace-nowrap">Tiempos</th>
                                            <th className="p-4 text-center whitespace-nowrap">Estado</th>
                                            <th className="p-4 text-right text-blue-600 whitespace-nowrap">Apertura (S/)</th>
                                            <th className="p-4 text-right text-emerald-600 whitespace-nowrap">Ingresos (+)</th>
                                            <th className="p-4 text-right text-rose-500 whitespace-nowrap">Devoluciones (-)</th>
                                            <th className="p-4 text-right bg-blue-50/50 rounded-l-lg whitespace-nowrap">Total Esperado</th>
                                            <th className="p-4 text-right bg-blue-50 whitespace-nowrap">Declarado</th>
                                            <th className="p-4 text-center bg-blue-50 rounded-r-lg whitespace-nowrap">Diferencia</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-gray-50">
                                        {cajasPaginadas.length === 0 ? (
                                            <tr><td colSpan={11} className="p-12 text-center text-gray-400 font-bold italic">No hay información disponible.</td></tr>
                                        ) : cajasPaginadas.map((c, i) => {
                                            const rowBg = c.estado === 'CERRADO' && c.diferencia < 0 ? 'bg-red-50/40 hover:bg-red-50' : c.estado === 'CERRADO' && c.diferencia > 0 ? 'bg-amber-50/40 hover:bg-amber-50' : 'hover:bg-indigo-50/30';
                                            return (
                                                <tr key={i} className={`transition-colors rounded-xl ${rowBg}`}>
                                                    <td className="p-4 text-center font-bold text-gray-400">{(paginaCajas - 1) * ITEMS_POR_PAGINA + i + 1}</td>
                                                    <td className="p-4"><div className="font-bold text-[#2A3F54] text-sm">{c.asesor}</div><div className="text-[10px] font-bold text-indigo-400 mt-0.5">{c.agencia}</div></td>
                                                    <td className="p-4 text-center font-bold text-gray-500">{c.fechaApertura ? c.fechaApertura.split('T')[0].split('-').reverse().join('/') : '--'}</td>
                                                    <td className="p-4 text-center">
                                                        <div className="text-[10px] text-gray-500 font-mono font-bold">{formatearHoraExacta(c.fechaApertura)} - {c.fechaCierre ? formatearHoraExacta(c.fechaCierre) : '...'}</div>
                                                    </td>
                                                    <td className="p-4 text-center"><span className={`px-2.5 py-1 rounded-lg text-[9px] font-black shadow-sm ${c.estado === 'ABIERTO' ? 'bg-emerald-100 text-emerald-700' : 'bg-gray-200 text-gray-600'}`}>{c.estado}</span></td>
                                                    <td className="p-4 text-right font-mono text-blue-600 font-black">{formatMoney(c.saldoInicial)}</td>
                                                    <td className="p-4 text-right font-mono text-emerald-600 font-black">{formatMoney(c.ingresos)}</td>
                                                    <td className="p-4 text-right font-mono text-rose-500 font-black">{formatMoney(c.devoluciones)}</td>
                                                    <td className="p-4 text-right font-mono font-black text-blue-800 bg-blue-50/20">{formatMoney(c.totalEsperado)}</td>
                                                    <td className="p-4 text-right font-mono font-black text-blue-900 bg-blue-50/40">{c.estado==='CERRADO' ? formatMoney(c.totalDeclarado) : '-'}</td>
                                                    <td className="p-4 text-center font-bold bg-blue-50/20">
                                                        {c.estado === 'CERRADO' ? (
                                                            <div className="flex flex-col items-center justify-center">
                                                                <span className={`px-3 py-1.5 rounded-md text-[11px] font-black tracking-wide shadow-sm border ${
                                                                    c.diferencia === 0 ? 'text-emerald-700 bg-emerald-50 border-emerald-200' : 
                                                                    c.diferencia < 0 ? 'text-red-700 bg-red-100 border-red-200' : 
                                                                    'text-amber-700 bg-amber-100 border-amber-200'
                                                                }`}>
                                                                    {c.diferencia === 0 ? 'Exacto (S/ 0.00)' : c.diferencia > 0 ? `Sobrante (+${formatMoney(c.diferencia)})` : `Faltante (${formatMoney(c.diferencia)})`}
                                                                </span>
                                                            </div>
                                                        ) : <span className="text-gray-400 italic">En proceso</span>}
                                                    </td>
                                                </tr>
                                            )
                                        })}
                                    </tbody>
                                </table>
                            </div>
                            {/* Paginación */}
                            {totalPaginasCajas > 1 && (
                                <div className="p-4 bg-indigo-50/50 border-t border-indigo-100 flex justify-between items-center text-xs text-indigo-800 font-black">
                                    <span>Página {paginaCajas} de {totalPaginasCajas}</span>
                                    <div className="flex gap-2">
                                        <button onClick={() => setPaginaCajas(p => Math.max(1, p - 1))} disabled={paginaCajas === 1} className="px-3 py-2 rounded-xl bg-white border border-indigo-200 shadow-sm disabled:opacity-50 hover:bg-indigo-50 transition-colors"><ChevronLeft size={14}/></button>
                                        <button onClick={() => setPaginaCajas(p => Math.min(totalPaginasCajas, p + 1))} disabled={paginaCajas === totalPaginasCajas} className="px-3 py-2 rounded-xl bg-white border border-indigo-200 shadow-sm disabled:opacity-50 hover:bg-indigo-50 transition-colors"><ChevronRight size={14}/></button>
                                    </div>
                                </div>
                            )}
                        </div>

                    </>
                )}
            </div>
        </MainLayout>
    );
};

export default ControlCajaPage;