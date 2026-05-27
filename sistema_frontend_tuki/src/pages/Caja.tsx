import React, { useState, useEffect } from 'react';
import MainLayout from '../layouts/MainLayout';
import { obtenerCajaActiva, abrirCaja, cerrarCaja, obtenerResumenMovimientos, registrarEgreso } from '../services/cajaService';
import { getCurrentUser } from '../services/authService';
import { notificarExito, notificarError, notificarCarga, cerrarNotificacion } from '../services/feedbackService';
import api from '../services/api'; 
import { 
    Lock, Unlock, Receipt, Calculator, FileText, Printer, BarChart3, 
    ArrowDownCircle, List, ChevronLeft, ChevronRight, DollarSign, 
    Smartphone, CreditCard, Wallet 
} from 'lucide-react';

const Caja: React.FC = () => {
    const [cajaActiva, setCajaActiva] = useState<any>(null);
    const [resumen, setResumen] = useState<any>(null);
    const [cargando, setCargando] = useState(true);

    // Estado para la tabla de ventas
    const [ventasList, setVentasList] = useState<any[]>([]);
    const [currentPage, setCurrentPage] = useState(1);
    const [itemsPerPage, setItemsPerPage] = useState(5);

    // Inputs Apertura
    const [montoInicial, setMontoInput] = useState('');
    const [obsApertura, setObsApertura] = useState('');

    // Inputs Egreso
    const [modalEgreso, setModalEgreso] = useState(false);
    const [conceptoEgreso, setConceptoEgreso] = useState('');
    const [montoEgreso, setMontoEgreso] = useState('');

    // Inputs Cierre y Arqueo
    const [conteosFisicos, setConteosFisicos] = useState<Record<string, string>>({
        EFECTIVO: '',
        YAPE_PLIN: '',
        TARJETA: ''
    });
    const [obsCierre, setObsCierre] = useState('');
    const [arqueoGuardado, setArqueoGuardado] = useState(false);
    const [faseCierre, setFaseCierre] = useState(false);

    const user: any = getCurrentUser();
    const userId = user?.idUsuario || user?.id;

    const verificarEstadoTurno = async () => {
        setCargando(true);
        try {
            const res = await obtenerCajaActiva(userId);
            if (res && res.estado === 'ABIERTO') {
                setCajaActiva(res);
                const dataResumen = await obtenerResumenMovimientos(userId);
                setResumen(dataResumen);
                
                // Reiniciar los conteos físicos
                setConteosFisicos({ EFECTIVO: '', YAPE_PLIN: '', TARJETA: '' });

                // Cargar lista de ventas del turno y filtrar las de hoy
                try {
                    const responseVentas = await api.get(`/ventas/mis-ventas-turno?idUsuario=${userId}`);
                    const hoy = new Date().toISOString().split('T')[0]; 
                    
                    const ventasDelDia = responseVentas.data.filter((v: any) => {
                        if (!v.fechaVenta) return false;
                        return v.fechaVenta.startsWith(hoy);
                    });
                    setVentasList(ventasDelDia);
                } catch (errorVentas) {
                    console.error("Error al cargar la tabla de ventas:", errorVentas);
                    setVentasList([]);
                }

            } else {
                setCajaActiva(null);
                setResumen(null);
                setVentasList([]);
            }
        } catch (error) {
            console.error("Error cargando el estado", error);
        } finally {
            setCargando(false);
        }
    };

    useEffect(() => { if (userId) verificarEstadoTurno(); }, [userId]);

    // 🟦 LÓGICA DE PAGINACIÓN DE VENTAS
    const indexOfLastItem = currentPage * itemsPerPage;
    const indexOfFirstItem = indexOfLastItem - itemsPerPage;
    const currentVentas = ventasList.slice(indexOfFirstItem, indexOfLastItem);
    const totalPages = Math.ceil(ventasList.length / itemsPerPage);
    const paginate = (pageNumber: number) => setCurrentPage(pageNumber);

    const renderIconoMetodo = (metodo: string) => {
        switch(metodo) {
            case 'EFECTIVO': return <DollarSign size={14} className="text-emerald-500"/>;
            case 'YAPE': 
            case 'PLIN': return <Smartphone size={14} className="text-purple-500"/>; 
            case 'TARJETA': return <CreditCard size={14} className="text-blue-500"/>;
            default: return <Wallet size={14} className="text-gray-500"/>;
        }
    };

    // 🟦 MONTOS ESPERADOS (Unidos Yape y Plin)
    const esperadoEfectivo = Number(resumen?.esperadoPorMetodo?.EFECTIVO || 0);
    const esperadoYapePlin = Number(resumen?.esperadoPorMetodo?.YAPE || 0) + Number(resumen?.esperadoPorMetodo?.PLIN || 0);
    const esperadoTarjeta = Number(resumen?.esperadoPorMetodo?.TARJETA || 0);

    // 🟦 1. APERTURA
    const handleAbrirCaja = async () => {
        if (!montoInicial || isNaN(Number(montoInicial)) || Number(montoInicial) < 0) return notificarError("Ingrese un saldo válido mayor o igual a cero.");
        const tId = notificarCarga("Abriendo caja...");
        try {
            await abrirCaja(userId, Number(montoInicial), obsApertura);
            cerrarNotificacion(tId);
            notificarExito("Caja abierta.");
            verificarEstadoTurno();
        } catch (e: any) {
            cerrarNotificacion(tId);
            notificarError(e.response?.data?.error || "Error al abrir caja.");
        }
    };

    // 🟦 2. REGISTRAR EGRESO
    const handleRegistrarEgreso = async () => {
        if (!conceptoEgreso || !montoEgreso || Number(montoEgreso) <= 0) return notificarError("Ingrese un monto válido (mayor a cero).");
        const tId = notificarCarga("Registrando egreso...");
        try {
            await registrarEgreso(userId, conceptoEgreso, Number(montoEgreso));
            cerrarNotificacion(tId);
            notificarExito("Egreso registrado con éxito.");
            setModalEgreso(false);
            setConceptoEgreso(''); setMontoEgreso('');
            verificarEstadoTurno(); 
        } catch (e: any) {
            cerrarNotificacion(tId);
            notificarError(e.response?.data?.error || "Error al registrar egreso.");
        }
    };

    // 🟦 CÁLCULOS DE ARQUEO (Bloquea negativos)
    const handleConteoChange = (metodo: string, valor: string) => {
        if (valor === '') {
            setConteosFisicos(prev => ({ ...prev, [metodo]: '' }));
            return;
        }
        if (Number(valor) >= 0 && /^\d*\.?\d{0,2}$/.test(valor)) {
            setConteosFisicos(prev => ({ ...prev, [metodo]: valor }));
        }
    };

    const calcularTotalContado = () => {
        return Object.values(conteosFisicos).reduce((acc, val) => acc + (Number(val) || 0), 0);
    };

    const totalContadoGlobal = calcularTotalContado();
    const totalEsperadoGlobal = Number(resumen?.montoEsperadoGlobal || 0);
    const diferenciaGlobal = resumen ? totalContadoGlobal - totalEsperadoGlobal : 0;

    const handleGuardarArqueo = () => {
        if (diferenciaGlobal !== 0 && !obsCierre.trim()) {
            notificarError("Existe un descuadre en caja. Debe ingresar una Observación obligatoria.");
            return;
        }
        setArqueoGuardado(true);
        setFaseCierre(true);
        notificarExito("Arqueo guardado. Proceda al Cierre de Caja.");
    };

    // 🟦 4. CIERRE
    const handleCerrarCajaDefinitivo = async () => {
        const tId = notificarCarga("Cerrando turno contable...");
        try {
            await cerrarCaja(userId, Number(conteosFisicos["EFECTIVO"] || 0), obsCierre);
            cerrarNotificacion(tId);
            notificarExito("Caja cerrada y bloqueada con éxito.");
            setArqueoGuardado(false); setFaseCierre(false);
            verificarEstadoTurno();
        } catch (e: any) {
            cerrarNotificacion(tId);
            notificarError(e.response?.data?.error || "Error al cerrar caja.");
        }
    };

    const handleImprimirTicket = () => {
        window.print(); 
    };

    if (cargando) return <MainLayout><p className="text-center p-10">Cargando...</p></MainLayout>;

    return (
        <MainLayout>
            {/* 🔥 ESTILOS PARA LA IMPRESORA TÉRMICA 🔥 */}
            <style>
                {`
                    @media print {
                        body * { visibility: hidden; }
                        #ticket-arqueo, #ticket-arqueo * { visibility: visible; }
                        #ticket-arqueo {
                            position: absolute;
                            left: 0;
                            top: 0;
                            width: 80mm;
                            font-family: 'Courier New', Courier, monospace;
                            font-size: 12px;
                            color: #000;
                            margin: 0;
                            padding: 0;
                        }
                    }
                `}
            </style>

            <div className="p-4 sm:p-6 space-y-6 max-w-7xl mx-auto print:hidden">
                <div className="flex justify-between border-b pb-4">
                    <h1 className="text-2xl font-black text-[#2A3F54]">Gestión y Arqueo de Caja</h1>
                    <span className={`px-4 py-1 text-xs font-bold rounded-full flex items-center gap-2 ${cajaActiva ? 'bg-emerald-100 text-emerald-700' : 'bg-rose-100 text-rose-700'}`}>
                        <div className={`w-2 h-2 rounded-full ${cajaActiva ? 'bg-emerald-500 animate-pulse' : 'bg-rose-500'}`}></div>
                        {cajaActiva ? `TURNO ABIERTO #${cajaActiva.idTurno}` : 'CAJA CERRADA'}
                    </span>
                </div>

                {!cajaActiva ? (
                    /* 🟦 1. APERTURA DE CAJA */
                    <div className="bg-white rounded-2xl shadow-sm border max-w-md mx-auto p-6 space-y-4">
                        <div className="flex items-center gap-3 text-teal-600 border-b pb-3 mb-4"><Unlock size={24} /> <h3 className="font-bold text-lg">Apertura de Turno</h3></div>
                        <div>
                            <label className="text-xs font-bold text-gray-500 uppercase mb-1 block">Saldo Inicial Efectivo</label>
                            <input 
                                type="number" 
                                min="0" 
                                value={montoInicial} 
                                onChange={e => {
                                    if(Number(e.target.value) >= 0) setMontoInput(e.target.value);
                                }} 
                                className="w-full p-3 border rounded-xl font-bold text-lg outline-none focus:border-teal-500" 
                            />
                        </div>
                        <div>
                            <label className="text-xs font-bold text-gray-500 uppercase mb-1 block">Observaciones</label>
                            <textarea value={obsApertura} onChange={e => setObsApertura(e.target.value)} className="w-full p-3 border rounded-xl text-sm outline-none focus:border-teal-500" rows={2} />
                        </div>
                        <button onClick={handleAbrirCaja} className="w-full py-3 bg-teal-600 text-white rounded-xl font-bold uppercase hover:bg-teal-700">Abrir Caja</button>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
                        
                        {/* 🟦 2. MOVIMIENTOS DEL DÍA Y TABLA DE VENTAS */}
                        <div className="space-y-6">
                            <div className="bg-white p-6 rounded-2xl shadow-sm border">
                                <div className="flex justify-between items-center border-b pb-3 mb-4">
                                    <h3 className="font-bold text-lg text-gray-800 flex items-center gap-2"><BarChart3 className="text-teal-600"/> Resumen de Movimientos</h3>
                                    <button onClick={() => setModalEgreso(!modalEgreso)} className="bg-rose-50 hover:bg-rose-100 text-rose-600 border border-rose-200 px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1">
                                        <ArrowDownCircle size={14}/> Registrar Egreso
                                    </button>
                                </div>

                                {/* Formulario de Egreso (Visible si se presiona el botón) */}
                                {modalEgreso && (
                                    <div className="mb-6 p-4 bg-rose-50 border border-rose-200 rounded-xl space-y-3">
                                        <h4 className="text-sm font-bold text-rose-800">Nuevo Egreso / Gasto</h4>
                                        <div className="flex gap-3">
                                            <input type="text" placeholder="Concepto (Ej. Limpieza)" value={conceptoEgreso} onChange={e => setConceptoEgreso(e.target.value)} className="flex-1 p-2 border rounded-lg text-sm" />
                                            <input type="number" min="0" placeholder="Monto" value={montoEgreso} onChange={e => {
                                                if(Number(e.target.value) >= 0) setMontoEgreso(e.target.value);
                                            }} className="w-32 p-2 border rounded-lg text-sm font-bold" />
                                            <button onClick={handleRegistrarEgreso} className="bg-rose-600 text-white px-4 rounded-lg text-sm font-bold">Guardar</button>
                                        </div>
                                    </div>
                                )}

                                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
                                    <div className="bg-slate-50 p-3 rounded-xl border text-center"><p className="text-[10px] font-bold text-gray-500 uppercase">Saldo Inicial</p><p className="font-mono font-bold text-gray-800 mt-1">S/ {Number(resumen?.saldoInicial).toFixed(2)}</p></div>
                                    <div className="bg-emerald-50 p-3 rounded-xl border border-emerald-100 text-center"><p className="text-[10px] font-bold text-emerald-600 uppercase">Ventas</p><p className="font-mono font-bold text-emerald-700 mt-1">S/ {Number(resumen?.totalVentas).toFixed(2)}</p></div>
                                    <div className="bg-amber-50 p-3 rounded-xl border border-amber-100 text-center"><p className="text-[10px] font-bold text-amber-600 uppercase">Anulaciones</p><p className="font-mono font-bold text-amber-700 mt-1">S/ {Number(resumen?.totalAnulaciones).toFixed(2)}</p></div>
                                    <div className="bg-rose-50 p-3 rounded-xl border border-rose-100 text-center"><p className="text-[10px] font-bold text-rose-600 uppercase">Egresos</p><p className="font-mono font-bold text-rose-700 mt-1">S/ {Number(resumen?.totalEgresos).toFixed(2)}</p></div>
                                </div>

                                {resumen?.egresosDetalle && resumen.egresosDetalle.length > 0 && (
                                    <div className="mt-4 border-t pt-4">
                                        <p className="text-xs font-bold text-gray-500 uppercase mb-2">Detalle de Egresos:</p>
                                        <div className="space-y-1">
                                            {resumen.egresosDetalle.map((eg: any) => (
                                                <div key={eg.idEgreso} className="flex justify-between text-xs bg-gray-50 p-2 rounded border">
                                                    <span className="text-gray-600">{eg.concepto}</span>
                                                    <span className="font-bold text-rose-600">- S/ {Number(eg.monto).toFixed(2)}</span>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                )}
                            </div>

                            {/* TABLA DE VENTAS DEL DÍA */}
                            <div className="bg-white rounded-2xl shadow-sm border overflow-hidden flex flex-col h-full max-h-[500px]">
                                <div className="bg-[#2A3F54] border-b border-gray-100 px-6 py-4 flex flex-wrap justify-between items-center shrink-0">
                                    <h3 className="font-bold text-white flex items-center gap-2 text-sm">
                                        <div className="bg-white p-1 rounded-md shadow-sm text-[#1ABB9C]">
                                            <List size={14} />
                                        </div>
                                        Ventas del Día
                                    </h3>
                                    <span className="text-white text-xs font-normal">({ventasList.length} operaciones)</span>
                                </div>

                                {ventasList.length === 0 ? (
                                    <div className="flex-1 flex flex-col items-center justify-center text-center p-8 bg-gray-50/50">
                                        <div className="bg-white p-4 rounded-full mb-3 border border-gray-100 shadow-sm">
                                            <Receipt size={32} className="text-gray-300" />
                                        </div>
                                        <h4 className="text-gray-600 font-bold text-sm">Sin ventas registradas hoy</h4>
                                    </div>
                                ) : (
                                    <div className="overflow-auto flex-1 custom-scrollbar">
                                        <table className="w-full text-sm text-left whitespace-nowrap">
                                            <thead className="bg-gray-50/80 text-gray-500 font-bold uppercase text-[10px] tracking-wider border-b border-gray-100 sticky top-0 z-10 backdrop-blur-md">
                                                <tr>
                                                    <th className="px-4 py-3 w-12 text-[11px] text-center text-[#1ABB9C]">N°</th>
                                                    <th className="px-4 py-3">Medio de Pago</th>
                                                    <th className="px-4 py-3 text-right">Monto</th>
                                                </tr>
                                            </thead>
                                            <tbody className="divide-y divide-gray-50">
                                                {currentVentas.map((venta: any, index: number) => (
                                                    <tr key={venta.idVenta || index} className="group transition-colors duration-200 hover:bg-blue-50">
                                                        <td className="px-4 py-3 text-center font-bold text-gray-400 text-xs">
                                                            {(currentPage - 1) * itemsPerPage + index + 1}
                                                        </td>
                                                        <td className="px-4 py-3">
                                                            <div className="flex items-center gap-2.5">
                                                                <div className="p-1.5 bg-gray-100 rounded-md">
                                                                    {renderIconoMetodo(venta.metodoPago)}
                                                                </div>
                                                                <span className="font-bold text-[#2A3F54] text-xs">
                                                                    {venta.metodoPago === 'YAPE' || venta.metodoPago === 'PLIN' ? 'YAPE / PLIN' : venta.metodoPago}
                                                                </span>
                                                            </div>
                                                        </td>
                                                        <td className="px-4 py-3 text-right font-mono font-bold text-gray-700 text-sm">
                                                            S/ {Number(venta.total || 0).toFixed(2)}
                                                        </td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    </div>
                                )}

                                {/* Paginación */}
                                {ventasList.length > 0 && (
                                    <div className="border-t border-gray-100 p-3 bg-gray-50/80 flex justify-between items-center shrink-0">
                                        <span className="text-xs text-gray-500 font-medium">
                                            Mostrando <span className="text-[#2A3F54] font-bold">
                                                {indexOfFirstItem + 1}-{Math.min(indexOfLastItem, ventasList.length)}
                                            </span> de {ventasList.length}
                                        </span>
                                        <div className="flex gap-2">
                                            <button onClick={() => paginate(currentPage - 1)} disabled={currentPage === 1} className="p-1.5 rounded border border-gray-200 bg-white hover:border-[#1ABB9C] hover:text-[#1ABB9C] disabled:opacity-50">
                                                <ChevronLeft size={14}/>
                                            </button>
                                            <button onClick={() => paginate(currentPage + 1)} disabled={currentPage === totalPages || totalPages === 0} className="p-1.5 rounded border border-gray-200 bg-white hover:border-[#1ABB9C] hover:text-[#1ABB9C] disabled:opacity-50">
                                                <ChevronRight size={14}/>
                                            </button>
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* 🟦 3 y 4. ARQUEO DE CAJA Y CIERRE */}
                        <div className="bg-white p-6 rounded-2xl shadow-sm border space-y-6">
                            <div className="flex items-center gap-2 border-b pb-3 text-teal-600"><Calculator size={20} /> <h3 className="font-bold text-lg text-gray-800">Arqueo de Caja</h3></div>
                            
                            <p className="text-xs text-gray-500 leading-relaxed">Verifica los montos esperados por el sistema e ingresa lo que tienes físicamente o en tus cuentas.</p>
                            
                            <div className="space-y-3">
                                {/* Efectivo */}
                                <div className="flex flex-col sm:flex-row sm:items-center justify-between bg-gray-50 p-3 rounded-xl border gap-2">
                                    <div className="w-1/3">
                                        <span className="font-bold text-sm text-gray-700">EFECTIVO</span>
                                        <p className="text-[10px] text-gray-500">Esperado: S/ {esperadoEfectivo.toFixed(2)}</p>
                                    </div>
                                    <div className="w-full sm:w-2/3 flex items-center gap-3">
                                        <input 
                                            type="number" min="0" placeholder="Monto contado" 
                                            value={conteosFisicos["EFECTIVO"]} 
                                            onChange={e => handleConteoChange("EFECTIVO", e.target.value)}
                                            disabled={arqueoGuardado}
                                            className="w-full p-2 border rounded-lg font-mono text-sm font-bold text-right outline-none focus:border-teal-500" 
                                        />
                                        <div className="w-24 text-right">
                                            {conteosFisicos["EFECTIVO"] ? (
                                                <span className={`text-xs font-bold ${Number(conteosFisicos["EFECTIVO"]) - esperadoEfectivo === 0 ? 'text-emerald-500' : 'text-rose-500'}`}>
                                                    {Number(conteosFisicos["EFECTIVO"]) - esperadoEfectivo > 0 ? '+' : ''}{(Number(conteosFisicos["EFECTIVO"]) - esperadoEfectivo).toFixed(2)}
                                                </span>
                                            ) : <span className="text-gray-300">-</span>}
                                        </div>
                                    </div>
                                </div>

                                {/* Yape / Plin */}
                                <div className="flex flex-col sm:flex-row sm:items-center justify-between bg-gray-50 p-3 rounded-xl border gap-2">
                                    <div className="w-1/3">
                                        <span className="font-bold text-sm text-gray-700">YAPE / PLIN</span>
                                        <p className="text-[10px] text-gray-500">Esperado: S/ {esperadoYapePlin.toFixed(2)}</p>
                                    </div>
                                    <div className="w-full sm:w-2/3 flex items-center gap-3">
                                        <input 
                                            type="number" min="0" placeholder="Monto contado" 
                                            value={conteosFisicos["YAPE_PLIN"]} 
                                            onChange={e => handleConteoChange("YAPE_PLIN", e.target.value)}
                                            disabled={arqueoGuardado}
                                            className="w-full p-2 border rounded-lg font-mono text-sm font-bold text-right outline-none focus:border-teal-500" 
                                        />
                                        <div className="w-24 text-right">
                                            {conteosFisicos["YAPE_PLIN"] ? (
                                                <span className={`text-xs font-bold ${Number(conteosFisicos["YAPE_PLIN"]) - esperadoYapePlin === 0 ? 'text-emerald-500' : 'text-rose-500'}`}>
                                                    {Number(conteosFisicos["YAPE_PLIN"]) - esperadoYapePlin > 0 ? '+' : ''}{(Number(conteosFisicos["YAPE_PLIN"]) - esperadoYapePlin).toFixed(2)}
                                                </span>
                                            ) : <span className="text-gray-300">-</span>}
                                        </div>
                                    </div>
                                </div>

                                {/* Tarjeta */}
                                <div className="flex flex-col sm:flex-row sm:items-center justify-between bg-gray-50 p-3 rounded-xl border gap-2">
                                    <div className="w-1/3">
                                        <span className="font-bold text-sm text-gray-700">TARJETA</span>
                                        <p className="text-[10px] text-gray-500">Esperado: S/ {esperadoTarjeta.toFixed(2)}</p>
                                    </div>
                                    <div className="w-full sm:w-2/3 flex items-center gap-3">
                                        <input 
                                            type="number" min="0" placeholder="Monto contado" 
                                            value={conteosFisicos["TARJETA"]} 
                                            onChange={e => handleConteoChange("TARJETA", e.target.value)}
                                            disabled={arqueoGuardado}
                                            className="w-full p-2 border rounded-lg font-mono text-sm font-bold text-right outline-none focus:border-teal-500" 
                                        />
                                        <div className="w-24 text-right">
                                            {conteosFisicos["TARJETA"] ? (
                                                <span className={`text-xs font-bold ${Number(conteosFisicos["TARJETA"]) - esperadoTarjeta === 0 ? 'text-emerald-500' : 'text-rose-500'}`}>
                                                    {Number(conteosFisicos["TARJETA"]) - esperadoTarjeta > 0 ? '+' : ''}{(Number(conteosFisicos["TARJETA"]) - esperadoTarjeta).toFixed(2)}
                                                </span>
                                            ) : <span className="text-gray-300">-</span>}
                                        </div>
                                    </div>
                                </div>
                            </div>

                            <div className={`p-4 rounded-xl border flex justify-between items-center ${diferenciaGlobal === 0 ? 'bg-emerald-50 border-emerald-200' : 'bg-rose-50 border-rose-200'}`}>
                                <div>
                                    <p className="text-xs font-bold uppercase text-gray-500">Total Esperado: S/ {totalEsperadoGlobal.toFixed(2)}</p>
                                    <p className="text-sm font-bold text-gray-800">Total Contado: S/ {totalContadoGlobal.toFixed(2)}</p>
                                </div>
                                <div className="text-right">
                                    <p className="text-[10px] font-bold uppercase text-gray-500">Diferencia Final</p>
                                    <p className={`text-xl font-black font-mono ${diferenciaGlobal === 0 ? 'text-emerald-600' : 'text-rose-600'}`}>S/ {diferenciaGlobal.toFixed(2)}</p>
                                </div>
                            </div>

                            <div>
                                <label className="text-xs font-bold text-gray-500 uppercase mb-1 block">Observación Final de Caja</label>
                                <textarea value={obsCierre} onChange={e => setObsCierre(e.target.value)} disabled={arqueoGuardado} className="w-full p-3 border rounded-xl text-sm outline-none" rows={2} placeholder="Justifique faltantes, sobrantes u otras incidencias..." />
                            </div>

                            {!arqueoGuardado ? (
                                <button onClick={handleGuardarArqueo} className="w-full py-3 bg-slate-800 text-white rounded-xl font-bold uppercase hover:bg-slate-900 transition-colors">Verificar y Guardar Arqueo</button>
                            ) : (
                                <div className="animate-in fade-in space-y-3 pt-4 border-t">
                                    <button onClick={handleImprimirTicket} className="w-full py-2 bg-slate-100 border text-slate-700 rounded-lg text-sm font-bold flex items-center justify-center gap-2"><Printer size={16}/> Imprimir Ticket de Arqueo</button>
                                    <button onClick={handleCerrarCajaDefinitivo} className="w-full py-3 bg-rose-600 text-white rounded-xl font-black uppercase hover:bg-rose-700 transition-colors">Confirmar Cierre de Caja</button>
                                </div>
                            )}

                        </div>
                    </div>
                )}
            </div>

            {/* 🔥 TICKET IMPRIMIBLE PARA IMPRESORA TÉRMICA (Invisible en pantalla normal) 🔥 */}
            {cajaActiva && arqueoGuardado && (
                <div id="ticket-arqueo" className="hidden print:block">
                    <div style={{ textAlign: 'center', marginBottom: '10px' }}>
                        <h2 style={{ fontSize: '16px', fontWeight: 'bold', margin: '0' }}>ARQUEO DE CAJA</h2>
                        <p style={{ margin: '2px 0', borderBottom: '1px dashed #000', paddingBottom: '5px' }}>Zoe Alexa - Transporte Fluvial</p>
                    </div>
                    
                    <div style={{ marginBottom: '10px' }}>
                        <p style={{ margin: '2px 0' }}><strong>Turno:</strong> #{cajaActiva.idTurno}</p>
                        <p style={{ margin: '2px 0' }}><strong>Fecha:</strong> {new Date().toLocaleDateString()}</p>
                        <p style={{ margin: '2px 0' }}><strong>Cajero:</strong> {user?.nombreCompleto || 'Usuario'}</p>
                    </div>

                    <div style={{ borderTop: '1px dashed #000', borderBottom: '1px dashed #000', padding: '5px 0', marginBottom: '10px' }}>
                        <p style={{ margin: '2px 0', display: 'flex', justifyContent: 'space-between' }}>
                            <span>SALDO INICIAL:</span>
                            <span>S/ {Number(resumen?.saldoInicial || 0).toFixed(2)}</span>
                        </p>
                        <p style={{ margin: '2px 0', display: 'flex', justifyContent: 'space-between' }}>
                            <span>(+) VENTAS:</span>
                            <span>S/ {Number(resumen?.totalVentas || 0).toFixed(2)}</span>
                        </p>
                        <p style={{ margin: '2px 0', display: 'flex', justifyContent: 'space-between' }}>
                            <span>(-) DEVOLUCIONES:</span>
                            <span>S/ {Number(resumen?.totalAnulaciones || 0).toFixed(2)}</span>
                        </p>
                        <p style={{ margin: '2px 0', display: 'flex', justifyContent: 'space-between' }}>
                            <span>(-) EGRESOS:</span>
                            <span>S/ {Number(resumen?.totalEgresos || 0).toFixed(2)}</span>
                        </p>
                    </div>

                    <div style={{ marginBottom: '10px' }}>
                        <h3 style={{ fontSize: '13px', fontWeight: 'bold', margin: '5px 0', textAlign: 'center' }}>DESGLOSE DE ARQUEO</h3>
                        <table style={{ width: '100%', fontSize: '11px', textAlign: 'left', borderCollapse: 'collapse' }}>
                            <thead>
                                <tr style={{ borderBottom: '1px dashed #000' }}>
                                    <th>Medio</th>
                                    <th style={{ textAlign: 'right' }}>Esperado</th>
                                    <th style={{ textAlign: 'right' }}>Contado</th>
                                </tr>
                            </thead>
                            <tbody>
                                <tr>
                                    <td>Efectivo</td>
                                    <td style={{ textAlign: 'right' }}>{esperadoEfectivo.toFixed(2)}</td>
                                    <td style={{ textAlign: 'right' }}>{Number(conteosFisicos.EFECTIVO || 0).toFixed(2)}</td>
                                </tr>
                                <tr>
                                    <td>Yape/Plin</td>
                                    <td style={{ textAlign: 'right' }}>{esperadoYapePlin.toFixed(2)}</td>
                                    <td style={{ textAlign: 'right' }}>{Number(conteosFisicos.YAPE_PLIN || 0).toFixed(2)}</td>
                                </tr>
                                <tr>
                                    <td>Tarjeta</td>
                                    <td style={{ textAlign: 'right' }}>{esperadoTarjeta.toFixed(2)}</td>
                                    <td style={{ textAlign: 'right' }}>{Number(conteosFisicos.TARJETA || 0).toFixed(2)}</td>
                                </tr>
                            </tbody>
                        </table>
                    </div>

                    <div style={{ borderTop: '1px solid #000', paddingTop: '5px', marginBottom: '10px' }}>
                        <p style={{ margin: '2px 0', display: 'flex', justifyContent: 'space-between', fontWeight: 'bold' }}>
                            <span>TOTAL ESPERADO:</span>
                            <span>S/ {totalEsperadoGlobal.toFixed(2)}</span>
                        </p>
                        <p style={{ margin: '2px 0', display: 'flex', justifyContent: 'space-between', fontWeight: 'bold' }}>
                            <span>TOTAL CONTADO:</span>
                            <span>S/ {totalContadoGlobal.toFixed(2)}</span>
                        </p>
                        <p style={{ margin: '5px 0', display: 'flex', justifyContent: 'space-between', fontWeight: 'bold', fontSize: '14px' }}>
                            <span>{diferenciaGlobal === 0 ? 'CUADRE PERFECTO' : diferenciaGlobal > 0 ? 'SOBRANTE' : 'FALTANTE'}:</span>
                            <span>S/ {Math.abs(diferenciaGlobal).toFixed(2)}</span>
                        </p>
                    </div>

                    {obsCierre && (
                        <div style={{ marginTop: '10px', fontSize: '11px' }}>
                            <p style={{ margin: '0', fontWeight: 'bold' }}>Observación:</p>
                            <p style={{ margin: '2px 0' }}>{obsCierre}</p>
                        </div>
                    )}

                    <div style={{ textAlign: 'center', marginTop: '20px', fontSize: '10px' }}>
                        <p style={{ margin: '2px 0' }}>---------------------------</p>
                        <p style={{ margin: '2px 0' }}>Firma Cajero</p>
                    </div>
                </div>
            )}
        </MainLayout>
    );
};

export default Caja;