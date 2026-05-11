import React, { useState, useEffect } from 'react';
import { X, Banknote, CreditCard, Smartphone, Receipt, FileText, CheckCircle, AlertCircle } from 'lucide-react';
import api from '../services/api'; // 🔥 NECESITAMOS API PARA AUTOCOMPLETAR DNI/RUC
import { notificarExito } from '../services/feedbackService';

interface ModalPagoPOSProps {
    isOpen: boolean;
    onClose: () => void;
    montoTotal: number;
    pasajeroNombreDefecto?: string;
    pasajeroDocumentoDefecto?: string;
    pasajeroTipoDocDefecto?: string; // 🔥 PARA SABER SI ES DNI, CE O PASAPORTE DESDE EL ORIGEN
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
    pasajeroTipoDocDefecto = 'DNI', 
    onConfirmarPago 
}) => {
    const [metodoPago, setMetodoPago] = useState<'EFECTIVO' | 'TARJETA' | 'YAPE'>('EFECTIVO');
    const [montoRecibido, setMontoRecibido] = useState<string>(montoTotal.toString());
    const [referencia, setReferencia] = useState('');
    
    const [tipoComprobante, setTipoComprobante] = useState<'BOLETA' | 'FACTURA'>('BOLETA');
    
    // Si la boleta es de un extranjero, hay que guardar su tipo original, si no, asumimos DNI
    const [tipoDocumentoBoleta, setTipoDocumentoBoleta] = useState<string>(pasajeroTipoDocDefecto);
    
    const [documentoCliente, setDocumentoCliente] = useState(pasajeroDocumentoDefecto);
    const [razonSocialNombre, setRazonSocialNombre] = useState(pasajeroNombreDefecto);

    const numMontoRecibido = parseFloat(montoRecibido) || 0;
    const vuelto = numMontoRecibido - montoTotal;
    
    // 🔥 LÓGICA DE VALIDACIÓN ESTRICTA DE DOCUMENTOS 🔥
    const esDocumentoValido = () => {
        if (!documentoCliente) return false;
        
        if (tipoComprobante === 'FACTURA') {
            return documentoCliente.length === 11; // RUC SIEMPRE 11
        } else {
            if (tipoDocumentoBoleta === 'DNI') return documentoCliente.length === 8;
            if (tipoDocumentoBoleta === 'CARNET_EXTRANJERIA') return documentoCliente.length === 9;
            return documentoCliente.length >= 5; // PASAPORTE U OTROS: Libre, mínimo 5
        }
    };

    const pagoValido = (metodoPago === 'EFECTIVO' ? numMontoRecibido >= montoTotal : referencia.trim().length > 3) 
                        && esDocumentoValido() 
                        && razonSocialNombre.trim().length > 2;

    // Cuando se abre el modal, reiniciamos valores
    useEffect(() => {
        if (isOpen) {
            setMontoRecibido(montoTotal.toString());
            setReferencia('');
            setTipoComprobante('BOLETA');
            setTipoDocumentoBoleta(pasajeroTipoDocDefecto);
            setDocumentoCliente(pasajeroDocumentoDefecto);
            setRazonSocialNombre(pasajeroNombreDefecto);
        }
    }, [isOpen, montoTotal, pasajeroDocumentoDefecto, pasajeroNombreDefecto, pasajeroTipoDocDefecto]);

    // Si cambian entre Boleta y Factura limpiamos datos para seguridad
    useEffect(() => {
        if (tipoComprobante === 'FACTURA') {
            setDocumentoCliente('');
            setRazonSocialNombre('');
        } else {
            setDocumentoCliente(pasajeroDocumentoDefecto);
            setRazonSocialNombre(pasajeroNombreDefecto);
        }
    }, [tipoComprobante]);

    useEffect(() => {
        setMontoRecibido(montoTotal.toString());
        setReferencia('');
    }, [metodoPago, montoTotal]);

    if (!isOpen) return null;

    // 🔥 BUSCADOR AUTOMÁTICO DE CLIENTES EN LA BASE DE DATOS 🔥
    const buscarClienteExterno = async (doc: string) => {
        if (!doc || doc.length < 8) return;
        try {
            const res = await api.get(`/pasajeros/documento/${doc}`);
            if (res.data) {
                // Si es factura unimos razón social, si es boleta armamos el nombre
                let nombreArmado = "";
                if (tipoComprobante === 'FACTURA') {
                     nombreArmado = res.data.nombres || ""; // Usualmente en RUC guardan todo en 'nombres'
                } else {
                     nombreArmado = `${res.data.nombres || ''} ${res.data.apellidoPaterno || ''} ${res.data.apellidoMaterno || ''}`.trim();
                }
                
                if (nombreArmado.length > 2) {
                    setRazonSocialNombre(nombreArmado.toUpperCase());
                    notificarExito("Datos de facturación encontrados.");
                }
            }
        } catch (e) {
            // No hacemos nada, que el cajero lo escriba manual
        }
    };

    const handleDocumentoChange = (val: string) => {
        let limpio = val;
        
        // Filtros según tipo de comprobante y documento
        if (tipoComprobante === 'FACTURA') {
            limpio = val.replace(/[^0-9]/g, ''); // Solo números para RUC
        } else {
            if (tipoDocumentoBoleta === 'DNI' || tipoDocumentoBoleta === 'CARNET_EXTRANJERIA') {
                limpio = val.replace(/[^0-9]/g, ''); // Solo números
            } else {
                limpio = val.replace(/[^A-Za-z0-9]/g, '').toUpperCase(); // Alfanumérico para pasaportes
            }
        }
        
        setDocumentoCliente(limpio);

        // Disparar búsqueda automática cuando alcance la longitud correcta
        if (tipoComprobante === 'FACTURA' && limpio.length === 11) {
            buscarClienteExterno(limpio);
        } else if (tipoComprobante === 'BOLETA') {
            if ((tipoDocumentoBoleta === 'DNI' && limpio.length === 8) || 
                (tipoDocumentoBoleta === 'CARNET_EXTRANJERIA' && limpio.length === 9)) {
                buscarClienteExterno(limpio);
            }
        }
    };

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
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-4xl overflow-hidden flex flex-col md:flex-row animate-in zoom-in-95 duration-300">
                
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
                                            onKeyDown={(e) => { if (e.key === '-' || e.key === 'e' || e.key === '+') e.preventDefault(); }}
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
                                {tipoComprobante === 'BOLETA' ? 'N° de documento del cliente' : 'RUC de la Empresa (11 dígitos)'}
                            </label>
                            
                            {/* 🔥 CONTENEDOR INPUT HÍBRIDO (Select + Input solo para boleta) 🔥 */}
                            <div className="flex rounded-lg overflow-hidden border border-slate-200 focus-within:border-[#1ABB9C] focus-within:ring-2 focus-within:ring-[#1ABB9C]/15 transition-all bg-slate-50">
                                {tipoComprobante === 'BOLETA' && (
                                    <select 
                                        value={tipoDocumentoBoleta}
                                        onChange={(e) => {
                                            setTipoDocumentoBoleta(e.target.value);
                                            setDocumentoCliente(''); // Limpiamos al cambiar para evitar incongruencias
                                            setRazonSocialNombre('');
                                        }}
                                        className="bg-slate-100 border-r border-slate-200 px-3 py-3 text-xs outline-none text-slate-700 font-bold cursor-pointer uppercase"
                                    >
                                        <option value="DNI">DNI</option>
                                        <option value="CARNET_EXTRANJERIA">CE</option>
                                        <option value="PASAPORTE">PAS</option>
                                    </select>
                                )}
                                <input 
                                    type="text" 
                                    value={documentoCliente}
                                    onChange={(e) => handleDocumentoChange(e.target.value)}
                                    maxLength={tipoComprobante === 'FACTURA' ? 11 : (tipoDocumentoBoleta === 'DNI' ? 8 : tipoDocumentoBoleta === 'CARNET_EXTRANJERIA' ? 9 : 15)}
                                    className="w-full px-4 py-3 bg-transparent outline-none text-sm font-bold tracking-widest text-slate-700 placeholder:font-normal placeholder:tracking-normal uppercase"
                                    placeholder={tipoComprobante === 'FACTURA' ? 'EJ: 12345698396' : (tipoDocumentoBoleta === 'DNI' ? '8 dígitos' : tipoDocumentoBoleta === 'CARNET_EXTRANJERIA' ? '9 dígitos' : 'Pasaporte')}
                                />
                            </div>
                            
                            {documentoCliente.length > 0 && !esDocumentoValido() && (
                                <p className="text-red-500 text-[10px] mt-1 flex items-center gap-1 font-bold">
                                    <AlertCircle size={10} /> 
                                    {tipoComprobante === 'FACTURA' ? 'El RUC debe tener exactamente 11 dígitos' : 
                                     tipoDocumentoBoleta === 'DNI' ? 'El DNI debe tener exactamente 8 dígitos' : 
                                     tipoDocumentoBoleta === 'CARNET_EXTRANJERIA' ? 'El CE debe tener exactamente 9 dígitos' : 
                                     'Complete el pasaporte'}
                                </p>
                            )}
                        </div>
                        <div>
                            <label className="block text-xs font-bold text-slate-500 mb-1">
                                {tipoComprobante === 'BOLETA' ? 'Nombres Completos' : 'Razón Social'}
                            </label>
                            <input 
                                type="text" 
                                value={razonSocialNombre}
                                onChange={(e) => setRazonSocialNombre(e.target.value.toUpperCase())}
                                className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-lg outline-none focus:border-[#1ABB9C] text-sm font-bold uppercase"
                                placeholder={tipoComprobante === 'BOLETA' ? 'Nombres del pasajero' : 'Nombre de la empresa'}
                            />
                        </div>
                    </div>

                    {/* ZONA DE ALERTA Y BOTÓN DE EMISIÓN */}
                    <div className="mt-6 pt-6 border-t border-slate-100">
                        {!pagoValido && (
                            <div className="mb-4 p-3 bg-amber-50 text-amber-700 text-xs font-bold rounded-lg flex items-start gap-2 border border-amber-200">
                                <AlertCircle size={16} className="shrink-0 mt-0.5"/> 
                                <div>
                                    {metodoPago === 'EFECTIVO' && numMontoRecibido < montoTotal && <p>• El monto recibido es menor al total.</p>}
                                    {metodoPago !== 'EFECTIVO' && referencia.trim().length <= 3 && <p>• Ingresa un número de referencia válido.</p>}
                                    {!esDocumentoValido() && <p>• Completa correctamente el documento (DNI 8 dígitos / RUC 11 dígitos).</p>}
                                    {razonSocialNombre.trim().length <= 2 && <p>• Ingresa los nombres o la razón social completa.</p>}
                                </div>
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