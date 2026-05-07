import React, { useState, useEffect } from 'react';
import { X, Banknote, CreditCard, Smartphone, Receipt, FileText, CheckCircle, AlertCircle } from 'lucide-react';

interface ModalPagoPOSProps {
    isOpen: boolean;
    onClose: () => void;
    montoTotal: number;
    pasajeroNombreDefecto?: string;
    pasajeroDocumentoDefecto?: string;
    onConfirmarPago: (datosPago: DatosPago) => void;
}

export interface DatosPago {
    metodo: 'EFECTIVO' | 'TARJETA' | 'YAPE';
    montoRecibido: number;
    vuelto: number;
    referencia: string;
    tipoComprobante: 'BOLETA' | 'FACTURA';
    documentoCliente: string;
    razonSocialNombre: string;
}

const ModalPagoPOS: React.FC<ModalPagoPOSProps> = ({ 
    isOpen, 
    onClose, 
    montoTotal, 
    pasajeroNombreDefecto = '',
    pasajeroDocumentoDefecto = '',
    onConfirmarPago 
}) => {
    const [metodoPago, setMetodoPago] = useState<'EFECTIVO' | 'TARJETA' | 'YAPE'>('EFECTIVO');
    const [montoRecibido, setMontoRecibido] = useState<string>(montoTotal.toString());
    const [referencia, setReferencia] = useState('');
    
    const [tipoComprobante, setTipoComprobante] = useState<'BOLETA' | 'FACTURA'>('BOLETA');
    const [documentoCliente, setDocumentoCliente] = useState(pasajeroDocumentoDefecto);
    const [razonSocialNombre, setRazonSocialNombre] = useState(pasajeroNombreDefecto);

    const numMontoRecibido = parseFloat(montoRecibido) || 0;
    const vuelto = numMontoRecibido - montoTotal;
    const pagoValido = metodoPago === 'EFECTIVO' ? numMontoRecibido >= montoTotal : referencia.trim().length > 3;

    useEffect(() => {
        if (isOpen) {
            setMontoRecibido(montoTotal.toString());
            setReferencia('');
            setDocumentoCliente(pasajeroDocumentoDefecto);
            setRazonSocialNombre(pasajeroNombreDefecto);
        }
    }, [isOpen, montoTotal, pasajeroDocumentoDefecto, pasajeroNombreDefecto]);

    useEffect(() => {
        setMontoRecibido(montoTotal.toString());
        setReferencia('');
    }, [metodoPago, montoTotal]);

    if (!isOpen) return null;

    const handleConfirmar = () => {
        if (!pagoValido) return;
        onConfirmarPago({
            metodo: metodoPago,
            montoRecibido: metodoPago === 'EFECTIVO' ? numMontoRecibido : montoTotal,
            vuelto: metodoPago === 'EFECTIVO' ? vuelto : 0,
            referencia,
            tipoComprobante,
            documentoCliente,
            razonSocialNombre
        });
    };

    const formatMoney = (amount: number) => new Intl.NumberFormat('es-PE', { style: 'currency', currency: 'PEN' }).format(amount);

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4 animate-in fade-in duration-200">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-3xl overflow-hidden flex flex-col md:flex-row animate-in zoom-in-95 duration-300">
                
                {/* PANEL IZQUIERDO: Resumen y Método de Pago */}
                <div className="w-full md:w-1/2 bg-slate-50 p-6 border-r border-slate-200 flex flex-col">
                    <div className="flex justify-between items-center mb-6 md:hidden">
                        <h2 className="text-lg font-bold text-slate-800">Cobro de Pasaje</h2>
                        <button onClick={onClose} className="p-2 bg-slate-200 rounded-full text-slate-500"><X size={16}/></button>
                    </div>

                    <p className="text-sm font-bold text-slate-500 uppercase tracking-wider mb-2">Total a Cobrar</p>
                    <div className="text-5xl font-black text-[#2A3F54] mb-8 tracking-tight">
                        {formatMoney(montoTotal)}
                    </div>

                    <p className="text-sm font-bold text-slate-600 mb-3">1. Selecciona el Método de Pago</p>
                    <div className="grid grid-cols-3 gap-3 mb-6">
                        <button 
                            onClick={() => setMetodoPago('EFECTIVO')}
                            className={`flex flex-col items-center gap-2 p-3 rounded-xl border-2 transition-all ${metodoPago === 'EFECTIVO' ? 'border-emerald-500 bg-emerald-50 text-emerald-700' : 'border-slate-200 bg-white text-slate-500 hover:border-emerald-200 hover:bg-emerald-50/50'}`}
                        >
                            <Banknote size={24} />
                            <span className="text-xs font-bold">Efectivo</span>
                        </button>
                        <button 
                            onClick={() => setMetodoPago('YAPE')}
                            className={`flex flex-col items-center gap-2 p-3 rounded-xl border-2 transition-all ${metodoPago === 'YAPE' ? 'border-purple-500 bg-purple-50 text-purple-700' : 'border-slate-200 bg-white text-slate-500 hover:border-purple-200 hover:bg-purple-50/50'}`}
                        >
                            <Smartphone size={24} />
                            <span className="text-xs font-bold">Yape / Plin</span>
                        </button>
                        <button 
                            onClick={() => setMetodoPago('TARJETA')}
                            className={`flex flex-col items-center gap-2 p-3 rounded-xl border-2 transition-all ${metodoPago === 'TARJETA' ? 'border-blue-500 bg-blue-50 text-blue-700' : 'border-slate-200 bg-white text-slate-500 hover:border-blue-200 hover:bg-blue-50/50'}`}
                        >
                            <CreditCard size={24} />
                            <span className="text-xs font-bold">Tarjeta</span>
                        </button>
                    </div>

                    {/* Lógica Dinámica según Método */}
                    <div className="flex-1 bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
                        {metodoPago === 'EFECTIVO' && (
                            <div className="space-y-4 animate-in fade-in slide-in-from-bottom-2">
                                <div>
                                    <label className="block text-xs font-bold text-slate-500 mb-1">¿Con cuánto paga el cliente?</label>
                                    <div className="relative">
                                        <span className="absolute left-3 top-2.5 font-bold text-slate-400">S/</span>
                                        <input 
                                            type="number" 
                                            value={montoRecibido}
                                            onChange={(e) => setMontoRecibido(e.target.value)}
                                            className="w-full pl-9 pr-4 py-2 border-2 border-slate-200 rounded-lg outline-none focus:border-emerald-500 font-bold text-lg text-slate-700"
                                            placeholder="0.00"
                                            autoFocus
                                        />
                                    </div>
                                </div>
                                <div className={`p-3 rounded-lg border flex justify-between items-center ${vuelto >= 0 ? 'bg-emerald-50 border-emerald-100' : 'bg-red-50 border-red-100'}`}>
                                    <span className={`text-sm font-bold ${vuelto >= 0 ? 'text-emerald-700' : 'text-red-600'}`}>Vuelto a entregar:</span>
                                    <span className={`text-xl font-black ${vuelto >= 0 ? 'text-emerald-700' : 'text-red-600'}`}>
                                        {vuelto >= 0 ? formatMoney(vuelto) : 'Monto insuficiente'}
                                    </span>
                                </div>
                            </div>
                        )}

                        {metodoPago === 'YAPE' && (
                            <div className="space-y-4 animate-in fade-in slide-in-from-bottom-2 text-center">
                                <div className="p-3 bg-purple-50 rounded-lg text-purple-700 text-sm font-medium mb-2 flex items-center gap-2 justify-center">
                                    <Smartphone size={18}/> Verifica el pago en el celular
                                </div>
                                <div className="text-left">
                                    <label className="block text-xs font-bold text-slate-500 mb-1">N° de Operación (Yape/Plin)</label>
                                    <input 
                                        type="text" 
                                        value={referencia}
                                        onChange={(e) => setReferencia(e.target.value)}
                                        className="w-full px-4 py-2 border-2 border-slate-200 rounded-lg outline-none focus:border-purple-500 font-bold text-slate-700 tracking-wider"
                                        placeholder="Ej. 0123456"
                                        autoFocus
                                    />
                                </div>
                            </div>
                        )}

                        {metodoPago === 'TARJETA' && (
                            <div className="space-y-4 animate-in fade-in slide-in-from-bottom-2 text-center">
                                <div className="p-3 bg-blue-50 rounded-lg text-blue-700 text-sm font-medium mb-2 flex items-center gap-2 justify-center">
                                    <CreditCard size={18}/> Cobra usando el dispositivo POS
                                </div>
                                <div className="text-left">
                                    <label className="block text-xs font-bold text-slate-500 mb-1">N° de Referencia / Voucher</label>
                                    <input 
                                        type="text" 
                                        value={referencia}
                                        onChange={(e) => setReferencia(e.target.value)}
                                        className="w-full px-4 py-2 border-2 border-slate-200 rounded-lg outline-none focus:border-blue-500 font-bold text-slate-700 tracking-wider"
                                        placeholder="Ej. 987654"
                                        autoFocus
                                    />
                                </div>
                            </div>
                        )}
                    </div>
                </div>

                {/* PANEL DERECHO: Comprobante y Confirmación */}
                <div className="w-full md:w-1/2 bg-white p-6 flex flex-col relative">
                    <button onClick={onClose} className="absolute top-4 right-4 p-2 bg-slate-100 hover:bg-slate-200 rounded-full text-slate-500 transition-colors hidden md:block">
                        <X size={18}/>
                    </button>

                    <p className="text-sm font-bold text-slate-600 mb-4 mt-2">2. Datos del Comprobante (SUNAT)</p>
                    
                    <div className="flex gap-2 mb-6 p-1 bg-slate-100 rounded-xl">
                        <button 
                            onClick={() => setTipoComprobante('BOLETA')}
                            className={`flex-1 py-2 flex items-center justify-center gap-2 rounded-lg text-sm font-bold transition-all ${tipoComprobante === 'BOLETA' ? 'bg-white text-[#2A3F54] shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
                        >
                            <Receipt size={16}/> Boleta
                        </button>
                        <button 
                            onClick={() => setTipoComprobante('FACTURA')}
                            className={`flex-1 py-2 flex items-center justify-center gap-2 rounded-lg text-sm font-bold transition-all ${tipoComprobante === 'FACTURA' ? 'bg-white text-[#2A3F54] shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
                        >
                            <FileText size={16}/> Factura
                        </button>
                    </div>

                    <div className="space-y-4 flex-1">
                        <div>
                            <label className="block text-xs font-bold text-slate-500 mb-1">
                                {tipoComprobante === 'BOLETA' ? 'DNI del Pasajero' : 'RUC de la Empresa'}
                            </label>
                            <input 
                                type="text" 
                                value={documentoCliente}
                                onChange={(e) => setDocumentoCliente(e.target.value)}
                                maxLength={tipoComprobante === 'BOLETA' ? 8 : 11}
                                className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-lg outline-none focus:border-[#1ABB9C] text-sm font-medium"
                                placeholder={tipoComprobante === 'BOLETA' ? '8 dígitos' : '11 dígitos'}
                            />
                        </div>
                        <div>
                            <label className="block text-xs font-bold text-slate-500 mb-1">
                                {tipoComprobante === 'BOLETA' ? 'Nombres Completos' : 'Razón Social'}
                            </label>
                            <input 
                                type="text" 
                                value={razonSocialNombre}
                                onChange={(e) => setRazonSocialNombre(e.target.value)}
                                className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-lg outline-none focus:border-[#1ABB9C] text-sm font-medium uppercase"
                                placeholder={tipoComprobante === 'BOLETA' ? 'Nombres del pasajero' : 'Nombre de la empresa'}
                            />
                        </div>
                    </div>

                    {/* ZONA DE ALERTA Y BOTÓN DE EMISIÓN */}
                    <div className="mt-6 pt-6 border-t border-slate-100">
                        {!pagoValido && (
                            <div className="mb-4 p-3 bg-amber-50 text-amber-700 text-xs font-bold rounded-lg flex items-center gap-2 border border-amber-200">
                                <AlertCircle size={16} className="shrink-0"/> 
                                {metodoPago === 'EFECTIVO' ? 'El monto recibido debe ser mayor o igual al total.' : 'Ingresa el número de referencia/voucher para continuar.'}
                            </div>
                        )}
                        <button 
                            onClick={handleConfirmar}
                            disabled={!pagoValido}
                            className={`w-full py-4 rounded-xl font-bold text-white shadow-lg transition-all flex items-center justify-center gap-2 text-lg
                                ${pagoValido ? 'bg-[#1ABB9C] hover:bg-[#16a085] hover:-translate-y-1' : 'bg-slate-300 cursor-not-allowed'}`}
                        >
                            <CheckCircle size={24}/> Confirmar y Emitir {tipoComprobante}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default ModalPagoPOS;