import React, { useState, useEffect } from 'react';
import { X, Lock, Unlock, DollarSign, CheckCircle, Printer } from 'lucide-react';
import { abrirCaja, obtenerCajaActiva, cerrarCaja } from '../services/cajaService';
import { getCurrentUser, getUserFromToken } from '../services/authService'; 
import { notificarExito, notificarError, notificarCarga, cerrarNotificacion } from '../services/feedbackService';

interface ModalCajaProps {
    isOpen: boolean;
    onClose: () => void;
    onSuccess: () => void;
}

const ModalCaja: React.FC<ModalCajaProps> = ({ isOpen, onClose, onSuccess }) => {
    const [step, setStep] = useState<'LOADING' | 'APERTURA' | 'CIERRE' | 'RESUMEN'>('LOADING');
    const [montoInput, setMontoInput] = useState('');
    const [cajaActual, setCajaActual] = useState<any>(null);

    const usuarioBase = getCurrentUser();
    const usuarioToken = getUserFromToken();
    const idUsuarioFinal = usuarioBase?.idUsuario || usuarioBase?.id || usuarioToken?.idUsuario;

    useEffect(() => {
        if (isOpen) {
            if (idUsuarioFinal) {
                verificarEstadoCaja(idUsuarioFinal);
            } else {
                notificarError("No se pudo identificar su usuario. Cierre sesión y vuelva a ingresar.");
                onClose();
            }
        }
    }, [isOpen]);

    const verificarEstadoCaja = async (id: number) => {
        setStep('LOADING');
        try {
            const res = await obtenerCajaActiva(id);
            if (res && (res.idTurno || res.activa)) {
                const cajaReal = res.caja || res;
                setCajaActual(cajaReal);
                
                localStorage.setItem('idTurnoCajaAbierta', cajaReal.idTurno.toString()); 
                
                setStep('CIERRE');
            } else {
                setStep('APERTURA');
            }
            setMontoInput('');
        } catch (error: any) {
            console.log("No se detectó caja abierta. Procediendo a apertura.");
            setStep('APERTURA');
            setMontoInput('');
        }
    };

    const handleAbrir = async () => {
        if (!montoInput || isNaN(Number(montoInput))) {
            notificarError("Ingrese un monto inicial válido (puede ser 0).");
            return;
        }
        const toastId = notificarCarga("Abriendo turno de caja...");
        try {
            const nuevaCaja = await abrirCaja(idUsuarioFinal, Number(montoInput));
            localStorage.setItem('idTurnoCajaAbierta', nuevaCaja.idTurno.toString());

            cerrarNotificacion(toastId);
            notificarExito("Caja abierta con éxito. ¡Buen turno!");
            onSuccess();
            onClose();
        } catch (error: any) {
            cerrarNotificacion(toastId);
            notificarError(error.response?.data?.error || error.response?.data || "No se pudo abrir la caja.");
        }
    };

   const handleCerrar = async () => {
        if (!montoInput || isNaN(Number(montoInput))) {
            notificarError("Ingrese cuánto efectivo físico tiene en la caja.");
            return;
        }
        const toastId = notificarCarga("Cerrando caja y calculando totales...");
        try {
            const cajaCerrada = await cerrarCaja(idUsuarioFinal, Number(montoInput));
            setCajaActual(cajaCerrada);
            
            localStorage.removeItem('idTurnoCajaAbierta');

            cerrarNotificacion(toastId);
            notificarExito("Turno cerrado correctamente.");
            setStep('RESUMEN');
        } catch (error: any) {
            cerrarNotificacion(toastId);
            notificarError(error.response?.data?.error || error.response?.data || "No se pudo cerrar la caja.");
        }
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/80 backdrop-blur-sm p-4">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden animate-in zoom-in-95">
                
                {/* CABECERA */}
                <div className={`p-5 flex justify-between items-center text-white ${step === 'APERTURA' ? 'bg-blue-600' : step === 'CIERRE' ? 'bg-orange-500' : 'bg-emerald-600'}`}>
                    <h2 className="font-bold text-lg flex items-center gap-2">
                        {step === 'APERTURA' && <><Unlock size={20}/> Apertura de Caja</>}
                        {step === 'CIERRE' && <><Lock size={20}/> Cierre Operativo</>}
                        {step === 'RESUMEN' && <><CheckCircle size={20}/> Resumen de Cierre</>}
                        {step === 'LOADING' && "Comprobando..."}
                    </h2>
                    {step !== 'RESUMEN' && (
                        <button onClick={onClose} className="hover:bg-white/20 p-1 rounded-full transition-colors"><X size={20}/></button>
                    )}
                </div>

                <div className="p-6">
                    {step === 'LOADING' && (
                        <div className="flex flex-col items-center justify-center py-10">
                            <div className="animate-spin h-10 w-10 border-4 border-blue-500 border-t-transparent rounded-full mb-4"></div>
                            <p className="text-gray-500 font-medium animate-pulse">Sincronizando con el servidor...</p>
                        </div>
                    )}

                    {step === 'APERTURA' && (
                        <div className="space-y-4">
                            <div className="bg-blue-50 p-4 rounded-xl border border-blue-100 text-sm text-blue-800">
                                <p>Antes de empezar a vender, declara con cuánto dinero (sencillo) estás iniciando tu turno hoy.</p>
                            </div>
                            <div>
                                <label className="text-xs font-bold text-gray-500 uppercase">Monto Inicial (Efectivo)</label>
                                <div className="relative mt-1">
                                    <DollarSign className="absolute left-3 top-3 text-gray-400" size={20}/>
                                    <input 
                                        type="number" value={montoInput} onChange={(e) => setMontoInput(e.target.value)}
                                        className="w-full pl-10 pr-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-xl font-black text-[#2A3F54] focus:border-blue-500 focus:bg-white outline-none transition-all"
                                        placeholder="0.00" autoFocus
                                    />
                                </div>
                            </div>
                            <button onClick={handleAbrir} className="w-full py-3 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl shadow-lg transition-colors mt-2">
                                INICIAR TURNO
                            </button>
                        </div>
                    )}

                    {step === 'CIERRE' && (
                        <div className="space-y-4">
                            <div className="bg-orange-50 p-4 rounded-xl border border-orange-100 text-sm text-orange-800">
                                <p>Cuenta todo el dinero físico que hay en tu cajón y escríbelo aquí. El sistema calculará el dinero digital automáticamente.</p>
                            </div>
                            <div>
                                <label className="text-xs font-bold text-gray-500 uppercase">Efectivo Físico Contado</label>
                                <div className="relative mt-1">
                                    <DollarSign className="absolute left-3 top-3 text-gray-400" size={20}/>
                                    <input 
                                        type="number" value={montoInput} onChange={(e) => setMontoInput(e.target.value)}
                                        className="w-full pl-10 pr-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-xl font-black text-[#2A3F54] focus:border-orange-500 focus:bg-white outline-none transition-all"
                                        placeholder="0.00" autoFocus
                                    />
                                </div>
                            </div>
                            <button onClick={handleCerrar} className="w-full py-3 bg-orange-500 hover:bg-orange-600 text-white font-bold rounded-xl shadow-lg transition-colors mt-2">
                                REALIZAR CIERRE
                            </button>
                        </div>
                    )}

                    {step === 'RESUMEN' && cajaActual && (
                        <div className="space-y-4">
                            <div className="border border-gray-200 rounded-xl p-4 bg-gray-50 text-sm print:shadow-none print:border-none print:p-0">
                                <h3 className="font-black text-center text-lg text-[#2A3F54] border-b pb-2 mb-2">TICKET DE CIERRE</h3>
                                <div className="space-y-2 font-mono text-gray-600">
                                    <div className="flex justify-between"><span>Sencillo Inicial:</span> <span>S/ {cajaActual.saldoInicial?.toFixed(2) || '0.00'}</span></div>
                                    <div className="border-t border-dashed my-2"></div>
                                    <div className="flex justify-between font-bold text-gray-800"><span>Efectivo Esperado (Sistema):</span> <span>S/ {cajaActual.saldoFinal?.toFixed(2) || '0.00'}</span></div>
                                    
                                    <div className="flex justify-between font-bold text-blue-600">
                                        <span>Efectivo Declarado:</span> 
                                        <span>S/ {((cajaActual.saldoFinal || 0) + (cajaActual.diferencia || 0)).toFixed(2)}</span>
                                    </div>
                                    
                                    {/* CÁLCULO DE DESCUADRE */}
                                    {(() => {
                                        const diferencia = cajaActual.diferencia || 0;
                                        if (diferencia === 0) return <div className="flex justify-between font-black text-green-600 bg-green-100 p-2 mt-2 rounded"><span>ESTADO:</span> <span>CUADRE EXACTO</span></div>;
                                        if (diferencia > 0) return <div className="flex justify-between font-black text-orange-600 bg-orange-100 p-2 mt-2 rounded"><span>SOBRANTE:</span> <span>+ S/ {Math.abs(diferencia).toFixed(2)}</span></div>;
                                        return <div className="flex justify-between font-black text-red-600 bg-red-100 p-2 mt-2 rounded"><span>FALTANTE:</span> <span>- S/ {Math.abs(diferencia).toFixed(2)}</span></div>;
                                    })()}
                                </div>
                            </div>
                            <div className="flex gap-3 print:hidden">
                                <button onClick={() => window.print()} className="flex-1 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 font-bold rounded-lg transition-colors flex justify-center items-center gap-2">
                                    <Printer size={16}/> Imprimir
                                </button>
                                <button onClick={() => { onSuccess(); onClose(); }} className="flex-1 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-lg transition-colors">
                                    Finalizar
                                </button>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default ModalCaja;