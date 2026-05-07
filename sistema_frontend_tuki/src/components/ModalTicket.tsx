import React from 'react';
import { Printer, X } from 'lucide-react';
import { QRCodeSVG } from 'qrcode.react';
import logo from '../assets/logo.png'; 

interface ModalTicketProps {
    isOpen: boolean;
    onClose: () => void;
    datosVenta: any; 
    datosPago: any; 
}

const ModalTicket: React.FC<ModalTicketProps> = ({ isOpen, onClose, datosVenta, datosPago }) => {
    if (!isOpen || !datosVenta || !datosPago) return null;

    const handleImprimir = () => {
        window.print();
    };

    const formatFecha = (fecha?: string) => {
        if (!fecha) return 'Fecha por confirmar';
        try {
            const fechaLimpia = fecha.includes('T') ? fecha.split('T')[0] : fecha;
            const [year, month, day] = fechaLimpia.split('-');
            return `${day}/${month}/${year}`;
        } catch (e) {
            return `${fecha}`;
        }
    };

    const formatHoraAmPm = (horaRaw?: any) => {
        if (!horaRaw) return 'Por confirmar';
        try {
            let h = 0, m = 0;
            if (Array.isArray(horaRaw)) {
                h = parseInt(String(horaRaw[0]), 10);
                m = parseInt(String(horaRaw[1] || '0'), 10);
            } else if (typeof horaRaw === 'string') {
                const parts = horaRaw.split(':');
                h = parseInt(String(parts[0]), 10);
                m = parseInt(String(parts[1] || '0'), 10); 
            }
            const ampm = h >= 12 ? 'PM' : 'AM';
            h = h % 12 || 12;
            return `${h}:${m.toString().padStart(2, '0')} ${ampm}`;
        } catch(e) {
            return String(horaRaw);
        }
    };

    const getNombreCajero = () => {
        const cajero = datosVenta?.nombreVendedor || datosVenta?.cajeroNombre || datosVenta?.vendedor;
        if (cajero && cajero !== 'Sistema') return cajero;
        try {
            const userStr = localStorage.getItem('user');
            if (userStr) {
                const parsedUser = JSON.parse(userStr);
                if (parsedUser.nombreCompleto) return parsedUser.nombreCompleto;
            }
        } catch (e) {}
        return 'Asesor de Ventas';
    };

    const nombreCliente = datosPago?.razonSocialNombre || datosPago?.razonSocial || datosVenta?.nombreCompletoPasajero || datosVenta?.nombreCompleto || 'Cliente General';
    const docCliente = datosPago?.documentoCliente || datosPago?.rucCliente || datosVenta?.numeroDocumento || datosVenta?.documento || 'S/D';

    const serieComprobante = datosVenta?.serie || datosPago?.serie || (datosPago?.tipoComprobante === 'FACTURA' ? 'F001' : 'B001');
    
    const correlativoRaw = datosVenta?.correlativo || datosPago?.correlativo || '1';
    const numeroCorrelativo = String(correlativoRaw).padStart(6, '0');

    // Esta es la hora por defecto (Inicio del viaje)
    const horaZarpeGeneral = datosVenta?.horaEmbarque || datosVenta?.horaZarpe || datosVenta?.horaSalida || '00:00';
    const textoQR = `20123456789|${datosPago?.tipoComprobante === 'FACTURA' ? '01' : '03'}|${serieComprobante}|${numeroCorrelativo}|${((datosVenta?.montoFinal || 0) * 0.18).toFixed(2)}|${datosVenta?.montoFinal || 0}|${new Date().toLocaleDateString('es-PE')}|1|${docCliente}`;

    const listaPasajeros = datosVenta?.detallesGrupal || [datosVenta];

    return (
        <div className="fixed inset-0 z-[70] flex items-center justify-center bg-slate-900/80 backdrop-blur-sm p-4 print:static print:bg-white print:p-0 print:backdrop-blur-none print:block">
            <div id="print-section" className="flex flex-col items-center animate-in zoom-in-95 duration-300 print:w-full w-full max-h-[95vh] overflow-y-auto scrollbar-hide rounded-xl print:max-h-none print:overflow-visible relative print:animate-none">
                
                <div className="sticky top-0 flex gap-4 p-4 mb-2 bg-slate-900/90 backdrop-blur-md rounded-xl shadow-xl w-fit print:hidden z-10 mx-auto">
                    <button onClick={handleImprimir} className="flex items-center gap-2 px-6 py-3 bg-[#1ABB9C] text-white font-bold rounded-xl shadow-lg hover:bg-[#16a085] hover:-translate-y-1 transition-all">
                        <Printer size={20} /> Imprimir Todo
                    </button>
                    <button onClick={onClose} className="flex items-center gap-2 px-4 py-3 bg-white text-slate-600 font-bold rounded-xl shadow-lg hover:bg-slate-50 transition-all">
                        <X size={20} /> Cerrar
                    </button>
                </div>

                {/* 1. TICKET FISCAL (COMPROBANTE DE PAGO) */}
                <div className="bg-white p-6 shadow-2xl w-[80mm] max-w-full text-black font-mono text-xs print:shadow-none print:m-0 print:p-0 flex-shrink-0 mb-4 print:mb-0">
                    <div className="text-center mb-4 flex flex-col items-center">
                        <img src={logo} alt="TUKI Logo" className="h-[160px] w-[160px] object-contain grayscale" /> 
                        <p className="font-bold text-[11px]">TRANSPORTE FLUVIAL TUKI S.A.C.</p>
                        <p className="text-[11px]">RUC: 20123456789</p>
                        <p className="text-[11px]">Av. La Marina Nro. 123 - Iquitos</p>
                        <p className="text-[11px]">Tel: (065) 123-456</p>
                    </div>

                    <div className="border-b-[1.5px] border-dashed border-gray-400 mb-4"></div>

                    <div className="text-center mb-4">
                        <p className="font-bold uppercase text-[13px]">{datosPago?.tipoComprobante || 'BOLETA'} ELECTRÓNICA</p>
                        <p className="font-black text-lg tracking-wide">{serieComprobante} - {numeroCorrelativo}</p>
                        <p className="text-[11px] mt-1">Fecha Emisión: {new Date().toLocaleString('es-PE')}</p>
                        <p className="text-[11px] mt-1"><span className="font-bold">Cajero:</span> {getNombreCajero()}</p> 
                    </div>

                    <div className="border-b-[1.5px] border-dashed border-gray-400 mb-4"></div>

                    <div className="mb-4 space-y-1.5 text-xs">
                        <p><span className="font-bold">CLIENTE:</span> {nombreCliente}</p>
                        <p><span className="font-bold">{datosPago?.tipoComprobante === 'FACTURA' ? 'RUC' : 'DNI/CE'}:</span> {docCliente}</p>
                    </div>

                    <div className="border-b-[1.5px] border-dashed border-gray-400 mb-4"></div>

                    <div className="mb-4 space-y-2 text-xs">
                        <p className="font-bold text-center bg-gray-100 py-1.5 uppercase tracking-widest">Resumen de Venta</p>
                        <div className="flex justify-between border-b border-gray-300 pb-1.5 font-bold mt-2">
                            <span>CANT. Y RUTA</span>
                            <span>MONTO</span>
                        </div>
                        <div className="flex justify-between mt-2 font-medium">
                            <span>{listaPasajeros.length} PASAJE(S)</span>
                            <span>S/ {Number(datosVenta?.montoFinal || 0).toFixed(2)}</span>
                        </div>
                        <p className="text-[10px] text-gray-600 mt-1 font-bold">TRAMO: {datosVenta?.origenNombre} ➔ {datosVenta?.destinoNombre}</p>
                    </div>

                    <div className="border-b-[1.5px] border-dashed border-gray-400 mb-4"></div>

                    <div className="mb-4 space-y-1 text-xs font-medium">
                        <div className="flex justify-between">
                            <span>OP. GRAVADA:</span>
                            <span>S/ {((datosVenta?.montoFinal || 0) / 1.18).toFixed(2)}</span>
                        </div>
                        <div className="flex justify-between">
                            <span>I.G.V. (18%):</span>
                            <span>S/ {((datosVenta?.montoFinal || 0) - ((datosVenta?.montoFinal || 0) / 1.18)).toFixed(2)}</span>
                        </div>
                        <div className="flex justify-between font-black text-[15px] mt-3 pt-3 border-t-2 border-black">
                            <span>TOTAL:</span>
                            <span>S/ {Number(datosVenta?.montoFinal || 0).toFixed(2)}</span>
                        </div>
                        
                        <div className="flex justify-between mt-3 pt-2 text-[11px] text-gray-800 font-bold border-t border-gray-200">
                            <span>PAGO ({datosPago?.metodo || 'EFECTIVO'}):</span>
                            <span>S/ {Number(datosPago?.montoRecibido || datosVenta?.montoFinal || 0).toFixed(2)}</span>
                        </div>
                        {(datosPago?.metodo === 'EFECTIVO') && (
                            <div className="flex justify-between text-[11px] text-gray-800 font-bold">
                                <span>VUELTO:</span>
                                <span>S/ {Number(datosPago?.vuelto || 0).toFixed(2)}</span>
                            </div>
                        )}
                    </div>

                    <div className="mt-6 flex flex-col items-center text-center">
                        <QRCodeSVG value={textoQR} size={90} level="M" />
                        <p className="text-[10px] mt-3 mb-1">Representación impresa del Comprobante.</p>
                        <p className="text-[10px] font-bold">Consulte en: www.transportetuki.com</p>
                    </div>
                </div>

                {/* 2. PASES DE ABORDAR (BOARDING PASS) */}
                {listaPasajeros.map((pasajero: any, index: number) => {
                    const horaEmbarqueFinalPasajero = datosVenta?.horaEmbarqueElegida || horaZarpeGeneral;
                    
                    return (
                        <React.Fragment key={index}>
                            <div className="w-full h-4 border-b-[1.5px] border-black/40 border-dashed my-3 print:my-0 print:border-none relative" style={{ pageBreakBefore: 'always' }}>
                                <span className="absolute top-1 left-1/2 -translate-x-1/2 text-[11px] font-bold text-gray-500 print:hidden text-center bg-transparent px-2">✂️ CORTE AQUÍ ✂️</span>
                            </div>
                            
                            <div className="bg-white p-6 shadow-2xl w-[80mm] max-w-full text-black font-mono print:shadow-none print:m-0 print:p-0 flex-shrink-0 mb-4 print:mb-0">
                                
                                <div className="text-center mb-5 flex flex-col items-center">
                                    <img src={logo} alt="TUKI Logo" className="h-[180px] w-[180px] object-contain grayscale" /> 
                                    <p className="font-black text-lg tracking-wider border-b-2 border-black pb-1 mb-2 w-full uppercase">TICKET DE ABORDAJE</p>
                                </div>

                                <div className="mb-5 space-y-3 text-xs">
                                    <p className="leading-tight">
                                        <span className="font-bold block uppercase text-gray-500 text-[13px]">Ruta del Pasajero</span> 
                                        <span className="text-[13px] font-black">{datosVenta?.origenNombre} ➔ {datosVenta?.destinoNombre}</span>
                                    </p>
                                    <p className="leading-tight">
                                        <span className="font-bold block uppercase text-gray-500 text-[13px]">Nombres y Apellidos</span> 
                                        <span className="text-[13px] font-bold uppercase">{pasajero.nombres} {pasajero.apellidoPaterno} {pasajero.apellidoMaterno}</span>
                                    </p>
                                    <p className="leading-tight">
                                        <span className="font-bold block uppercase text-gray-500 text-[13px]">Documento</span> 
                                        <span className="text-[13px] font-bold">{pasajero.numeroDocumento}</span>
                                    </p>
                                </div>

                                <div className="bg-gray-100 p-3 text-center border-[2px] border-black mb-5">
                                    <p className="font-black uppercase text-[13px] tracking-widest text-gray-600 mb-1">Tu Asiento</p>
                                    <p className="text-4xl font-black">{pasajero.numeroAsiento || pasajero.numeroAsientoTexto || 'S/A'}</p>
                                </div>

                                <div className="mb-5 space-y-4 text-xs text-center border-[1.5px] border-dashed border-gray-400 p-3">
                                    <p>
                                        <span className="font-bold block uppercase text-gray-500 text-[13px] mb-1">Fecha de Viaje</span> 
                                        <span className="font-black text-[14px]">{formatFecha(datosVenta?.fechaSalida)}</span>
                                    </p>
                                    
                                    <p className="bg-black text-white p-2">
                                        <span className="font-bold text-[13px] block tracking-widest mb-0.5">HORA DE EMBARQUE</span> 
                                        <span className="font-black text-2xl">
                                            {formatHoraAmPm(datosVenta?.horaEmbarqueElegida || horaZarpeGeneral)}
                                        </span>
                                    </p>
                                    
                                    <p className="leading-snug mt-2">
                                        <span className="font-bold text-[13px] uppercase text-gray-500 block mb-0.5">Lugar de Embarque</span>
                                        <span className="font-bold text-[12px]">
                                            {datosVenta?.direccionEmbarque 
                                                ? `${datosVenta?.nombrePuertoOrigen} - ${datosVenta?.direccionEmbarque}`
                                                : (datosVenta?.nombrePuertoOrigen || 'Puerto Principal')}
                                        </span>
                                    </p>
                                </div>
                                <p className="leading-tight">
                                    <span className="text-[11px] font-black block">1. Presentarse 30 minutos antes de la hora de embarque.</span>
                                    
                                    <span className="text-[11px] font-black block mt-2">2. Es obligatorio portar su documento de identidad vigente para abordar.</span>
                                    <span className="text-[11px] font-black block text-center mt-5">"GRACIAS POR VIAJAR CON NOSOTROS"</span>
                                </p>
                            </div>
                        </React.Fragment>
                    );
                })}
            </div>

            {/* CSS  DE IMPRESIÓN */}
            <style>{`
                @media print {
                    @page {
                        margin: 0;
                        size: 80mm auto; 
                    }
                    body {
                        margin: 0;
                        padding: 0;
                        background: white;
                    }
                    /* Oculta absolutamente toda la interfaz gráfica de la web */
                    body * { 
                        visibility: hidden; 
                    }
                    /* Hace visible ÚNICAMENTE la sección del ticket y se desvincula de los scrolls de pantalla */
                    #print-section, #print-section * { 
                        visibility: visible; 
                    }
                    #print-section {
                        position: absolute !important;
                        left: 0 !important;
                        top: 0 !important;
                        width: 80mm !important;
                        margin: 0 !important;
                        padding: 3mm !important;
                        background: white !important;
                        box-sizing: border-box !important;
                    }
                    .print\\:hidden { display: none !important; }
                    
                    /* Asegura que el logo no sea bloqueado por ahorro de tinta */
                    .grayscale { filter: grayscale(100%) contrast(1.2) !important; }
                }
            `}</style>
        </div>
    );
};

export default ModalTicket;