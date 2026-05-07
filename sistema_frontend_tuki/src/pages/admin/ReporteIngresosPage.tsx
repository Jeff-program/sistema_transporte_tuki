import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import MainLayout from '../../layouts/MainLayout';
import { 
    BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, 
    PieChart, Pie, Cell, Legend, AreaChart, Area 
} from 'recharts';
import { 
    FileText, FileSpreadsheet, Calendar, 
    DollarSign, Map, User, ChevronRight, ChevronLeft, AlertTriangle, XCircle, Store, Ticket, Tag
} from 'lucide-react';
import { getViajes } from '../../services/configService';
import { getManifiesto } from '../../services/ventaService';
import { getCurrentUser } from '../../services/authService';
import { notificarError, notificarExito } from '../../services/feedbackService';

import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import ExcelJS from 'exceljs';
import { saveAs } from 'file-saver';

const ReporteIngresosPage = () => {
    const navigate = useNavigate();
    const [loading, setLoading] = useState(true);
    const [dataVentas, setDataVentas] = useState<any[]>([]);
    const [fechaInicio, setFechaInicio] = useState('');
    const [fechaFin, setFechaFin] = useState('');

    const [paginaAsesores, setPaginaAsesores] = useState(1);
    const [paginaTrayectos, setPaginaTrayectos] = useState(1);
    const ITEMS_POR_PAGINA = 5;

    const COLORES = ['#10B981', '#3B82F6', '#F59E0B', '#8B5CF6', '#EC4899', '#06B6D4'];

    useEffect(() => {
        cargarDataMaestra();
    }, []);

    useEffect(() => {
        setPaginaAsesores(1);
        setPaginaTrayectos(1);
    }, [fechaInicio, fechaFin]);

    const formatearFechaDDMMYYYY = (fechaRaw: any) => {
        if (!fechaRaw) return '';
        try {
            if (Array.isArray(fechaRaw)) {
                return `${String(fechaRaw[2]).padStart(2, '0')}-${String(fechaRaw[1]).padStart(2, '0')}-${fechaRaw[0]}`;
            }
            if (typeof fechaRaw === 'string') {
                const soloFecha = fechaRaw.split('T')[0];
                const partes = soloFecha.split('-');
                if (partes.length === 3) {
                    return `${partes[2]}-${partes[1]}-${partes[0]}`;
                }
            }
            const d = new Date(fechaRaw);
            if (isNaN(d.getTime())) return '';
            return `${String(d.getDate()).padStart(2, '0')}-${String(d.getMonth() + 1).padStart(2, '0')}-${d.getFullYear()}`;
        } catch { return ''; }
    };

    const normalizarFecha = (fechaRaw: any) => {
        if (!fechaRaw) return '';
        if (Array.isArray(fechaRaw)) return `${fechaRaw[0]}-${String(fechaRaw[1]).padStart(2, '0')}-${String(fechaRaw[2]).padStart(2, '0')}`;
        return String(fechaRaw).split('T')[0];
    };

    const formatMoney = (amount: number) => new Intl.NumberFormat('es-PE', { style: 'currency', currency: 'PEN' }).format(amount || 0);

    const cargarDataMaestra = async () => {
        setLoading(true);
        try {
            const viajesData = await getViajes().catch(() => []);
            const viajes = Array.isArray(viajesData) ? viajesData : [];
            const consolidado: any[] = [];

            await Promise.all(viajes.map(async (v: any) => {
                if (String(v.estado || '').toUpperCase() === 'ELIMINADO') return;
                
                try {
                    const mRes = await getManifiesto(v.idViaje || v.id_viaje);
                    const ventas = Array.isArray(mRes) ? mRes : (mRes?.data || mRes?.content || []);
                    
                    ventas.forEach((venta: any) => {
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
                        const rutaGlobal = v.ruta?.nombreRuta || v.nombreRuta || 'Ruta Gral';
                        const trayectoEscala = (origenEsc && destinoEsc) ? `${origenEsc} - ${destinoEsc}` : rutaGlobal;

                        const nombreNave = v.embarcacion?.nombre || v.nombreEmbarcacion || 'Nave N/A';

                        const objUsuario = vPadre.usuario || vPadre.usuarioVendedor || venta.usuario || {};
                        const vendedorFinal = objUsuario.nombreCompleto || objUsuario.nombres || (typeof venta.vendedor === 'string' ? venta.vendedor : '') || 'SISTEMA';

                        const objAgencia = objUsuario.agencia || vPadre.agencia || venta.agencia || {};
                        const agenciaFinal = objAgencia.nombreAgencia || objAgencia.nombre || (typeof venta.agencia === 'string' ? venta.agencia : '') || 'Sede Principal';

                        const arrPagos = vPadre.pagos || venta.pagos || [];
                        const objPago = arrPagos.length > 0 ? arrPagos[0] : {};
                        const metodoPagoFinal = String(objPago.metodo || objPago.metodoPago || objPago.tipoPago || venta.metodoPago || 'EFECTIVO').toUpperCase();

                        const objComp = vPadre.comprobante || venta.comprobante || {};
                        const cSerie = objComp.serie || venta.serie || '';
                        const cNum = objComp.numero || objComp.numeroCorrelativo || objComp.correlativo || venta.numero || venta.numeroCorrelativo || venta.correlativo || '';
                        const comprobanteFormat = (cSerie && cNum) ? `${cSerie}-${String(cNum).padStart(6, '0')}` : `TKT-${idVentaReal}`;

                        const objAsiento = venta.asiento || {};
                        const asientoFinal = objAsiento.numero || objAsiento.numeroAsiento || venta.numeroAsiento || venta.asiento || 'S/A';

                        let fVenta = vPadre.fecha || vPadre.fechaVenta || venta.fechaVenta || venta.fecha || venta.fechaCreacion || venta.fechaReserva;
                        if (fVenta && typeof fVenta === 'string' && fVenta.includes('T')) {
                            fVenta = fVenta.split('T')[0];
                        }
                        if (!fVenta) fVenta = v.fechaSalida;

                        consolidado.push({
                            idVenta: idVentaReal,
                            comprobante: comprobanteFormat,
                            fechaFiltro: normalizarFecha(fVenta),
                            fechaVis: formatearFechaDDMMYYYY(fVenta),
                            monto,
                            rutaGlobal: rutaGlobal,
                            trayecto: trayectoEscala,
                            nave: nombreNave,
                            vendedor: vendedorFinal,
                            agencia: agenciaFinal,
                            metodoPago: metodoPagoFinal,
                            pasajero: pasajeroFinal,
                            dni: dni,
                            asiento: asientoFinal, 
                            estado: estadoVenta
                        });
                    });
                } catch (e) {}
            }));

            setDataVentas(consolidado);
        } catch (error) {
            notificarError("Error cargando reportes financieros.");
        } finally {
            setLoading(false);
        }
    };

    const dataFiltrada = useMemo(() => {
        return dataVentas.filter(v => {
            if (fechaInicio && v.fechaFiltro < fechaInicio) return false;
            if (fechaFin && v.fechaFiltro > fechaFin) return false;
            return true;
        });
    }, [dataVentas, fechaInicio, fechaFin]);

    const limpiarFiltros = () => {
        setFechaInicio('');
        setFechaFin('');
    };

    const metricas = useMemo(() => {
        let total = 0, anuladosCount = 0, anuladosDinero = 0, vendidosCount = 0;
        const tMap: any = {}, aMap: any = {}, pMap: any = {}, vMap: any = {}, dMap: any = {};
        
        dataFiltrada.forEach(v => {
            const fullDate = v.fechaFiltro;
            const fCorta = v.fechaVis.substring(0, 5); 
            if (!dMap[fullDate]) dMap[fullDate] = { fecha: fCorta, ingresos: 0, perdidas: 0, originalDate: fullDate };

            if (v.estado === 'VÁLIDO' || v.estado === 'VENDIDO') {
                total += v.monto;
                vendidosCount++;

                tMap[v.trayecto] = (tMap[v.trayecto] || 0) + v.monto; 
                aMap[v.agencia] = (aMap[v.agencia] || 0) + v.monto; 
                pMap[v.metodoPago] = (pMap[v.metodoPago] || 0) + v.monto;
                
                dMap[fullDate].ingresos += v.monto;

                if (!vMap[v.vendedor]) vMap[v.vendedor] = { name: v.vendedor, agencia: v.agencia, ingresos: 0, tickets: 0 };
                vMap[v.vendedor].ingresos += v.monto;
                vMap[v.vendedor].tickets += 1;
            } else if (v.estado === 'ANULADO' || v.estado === 'CANCELADO') {
                anuladosCount++;
                anuladosDinero += v.monto;
                
                dMap[fullDate].perdidas += v.monto;
            }
        });

        const trayectosOrdenados = Object.entries(tMap).map(([name, value]) => ({ name, value })).sort((a:any, b:any) => b.value - a.value);
        const tendenciaOrdenada = Object.values(dMap).sort((a:any, b:any) => a.originalDate.localeCompare(b.originalDate)).slice(-15);

        return {
            total, vendidosCount, anuladosCount, anuladosDinero,
            promedio: vendidosCount > 0 ? total / vendidosCount : 0,
            tendencia: tendenciaOrdenada,
            porTrayecto: trayectosOrdenados,
            porAgencia: Object.entries(aMap).map(([name, value]) => ({ name, value })).sort((a:any, b:any) => b.value - a.value),
            porPago: Object.entries(pMap).map(([name, value]) => ({ name, value })).sort((a:any, b:any) => b.value - a.value),
            porVendedor: Object.values(vMap).sort((a:any, b:any) => b.ingresos - a.ingresos)
        };
    }, [dataFiltrada]);

    const totalPaginasAsesores = Math.ceil(metricas.porVendedor.length / ITEMS_POR_PAGINA);
    const asesoresPaginados = metricas.porVendedor.slice((paginaAsesores - 1) * ITEMS_POR_PAGINA, paginaAsesores * ITEMS_POR_PAGINA);

    const totalPaginasTrayectos = Math.ceil(metricas.porTrayecto.length / ITEMS_POR_PAGINA);
    const trayectosPaginados = metricas.porTrayecto.slice((paginaTrayectos - 1) * ITEMS_POR_PAGINA, paginaTrayectos * ITEMS_POR_PAGINA);


    // EXPORTACIÓN A EXCEL

    const exportarExcel = async () => {
        try {
            const workbook = new ExcelJS.Workbook();
            workbook.creator = 'Transporte Fluvial TUKI';
            const usuarioActual = getCurrentUser()?.nombreCompleto || 'Administrador General';
            const periodoStr = fechaInicio && fechaFin ? `${formatearFechaDDMMYYYY(fechaInicio)} al ${formatearFechaDDMMYYYY(fechaFin)}` : 'Histórico Global';
            const fechaEmision = new Date().toLocaleString('es-PE');

            const titleFill: any = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF6AE3B' } };
            const titleFont: Partial<ExcelJS.Font> = { bold: true, size: 20, color: { argb: 'FFFFFFFF' } };
            const subtitleFill: any = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF10B981' } };
            const subtitleFont: Partial<ExcelJS.Font> = { bold: true, size: 16, color: { argb: 'FFFFFFFF' } };
            const headerFill: any = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF3B82F6' } };
            const headerFont: Partial<ExcelJS.Font> = { bold: true, color: { argb: 'FFFFFFFF' } };
            const boldFont: Partial<ExcelJS.Font> = { bold: true };

            const bordeNegro: Partial<ExcelJS.Borders> = {
                top: { style: 'thin', color: { argb: 'FF000000' } },
                left: { style: 'thin', color: { argb: 'FF000000' } },
                bottom: { style: 'thin', color: { argb: 'FF000000' } },
                right: { style: 'thin', color: { argb: 'FF000000' } }
            };

            const agregarFilaIntercalada = (
                ws: ExcelJS.Worksheet,
                label: string,
                value: any,
                index: number
            ) => {
                const row = ws.addRow([label, value]);

                ws.mergeCells(`B${row.number}:C${row.number}`);

                const bgColor = index % 2 === 0 ? 'FFDCE6F1' : 'FFFFFFFF';

                row.eachCell({ includeEmpty: true }, cell => {
                    cell.border = bordeNegro;
                    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: bgColor } };
                });

                row.getCell(1).font = boldFont;

                return row;
            };

            const aplicarBordesFila = (row: ExcelJS.Row) => {
                row.eachCell({ includeEmpty: true }, (cell) => {
                    cell.border = bordeNegro;
                });
            };

            // HOJA 1: RESUMEN EJECUTIVO
            const wsResumen = workbook.addWorksheet('1. Resumen Ejecutivo');
            wsResumen.getColumn(1).width = 30;
            wsResumen.getColumn(2).width = 25;
            wsResumen.getColumn(3).width = 20;

            const title1 = wsResumen.addRow(['REPORTE DE VENTAS', '', '']);
            wsResumen.mergeCells('A1:C1');
            title1.height = 50;
            title1.getCell(1).font = titleFont; 
            title1.getCell(1).fill = titleFill;
            title1.getCell(1).alignment = { horizontal: 'center', vertical: 'middle' };
            title1.getCell(1).border = bordeNegro;

            let idx = 0;

            agregarFilaIntercalada(wsResumen, 'EMPRESA:', 'TRANSPORTE FLUVIAL TUKI', idx++);
            agregarFilaIntercalada(wsResumen, 'REPORTE:', 'Reporte Financiero y de Rentabilidad', idx++);
            agregarFilaIntercalada(wsResumen, 'PERIODO:', periodoStr, idx++);
            agregarFilaIntercalada(wsResumen, 'GENERADO POR:', usuarioActual, idx++);
            agregarFilaIntercalada(wsResumen, 'FECHA DE EMISIÓN:', fechaEmision, idx++);

            let rowVacia = wsResumen.addRow([]);
            wsResumen.mergeCells(`A${rowVacia.number}:C${rowVacia.number}`);
            aplicarBordesFila(rowVacia);


            const sub1 = wsResumen.addRow(['INDICADORES CLAVES', '', '']);
            wsResumen.mergeCells(`A${sub1.number}:C${sub1.number}`);
            sub1.height = 40;
            sub1.getCell(1).font = subtitleFont; 
            sub1.getCell(1).fill = subtitleFill;
            sub1.getCell(1).alignment = { horizontal: 'center', vertical: 'middle' };
            sub1.getCell(1).border = bordeNegro;

            let indexInd = 0;

            agregarFilaIntercalada(wsResumen, 'Ingresos Totales (Soles):', metricas.total, indexInd++);
            agregarFilaIntercalada(wsResumen, 'Total Boletos Vendidos:', metricas.vendidosCount, indexInd++);
            agregarFilaIntercalada(wsResumen, 'Ticket Promedio (Soles):', metricas.promedio, indexInd++);
            agregarFilaIntercalada(wsResumen, 'Boletos Anulados:', metricas.anuladosCount, indexInd++);
            agregarFilaIntercalada(wsResumen, 'Dinero Devuelto (Soles):', metricas.anuladosDinero, indexInd++);

            let rowVacia1 = wsResumen.addRow([]);
            wsResumen.mergeCells(`A${rowVacia1.number}:C${rowVacia1.number}`);
            aplicarBordesFila(rowVacia1);

            const sub2 = wsResumen.addRow(['INGRESOS POR MEDIO DE PAGO', '', '']);
            wsResumen.mergeCells(`A${sub2.number}:C${sub2.number}`);
            sub2.height = 40;
            sub2.getCell(1).font = subtitleFont; 
            sub2.getCell(1).fill = subtitleFill;
            sub2.getCell(1).alignment = { horizontal : 'center', vertical : 'middle'};
            sub2.getCell(1).border = bordeNegro;

            let indexPago = 0;

            metricas.porPago.forEach(p => {
                agregarFilaIntercalada(wsResumen, p.name, p.value, indexPago++);
            });

            let rowVacia2 = wsResumen.addRow([]);
            wsResumen.mergeCells(`A${rowVacia2.number}:C${rowVacia2.number}`);
            aplicarBordesFila(rowVacia2);

            const sub3 = wsResumen.addRow(['TOP 5 VENDEDORES', '', '']);
            wsResumen.mergeCells(`A${sub3.number}:C${sub3.number}`);
            sub3.height = 40;
            sub3.getCell(1).font = subtitleFont; 
            sub3.getCell(1).fill = subtitleFill;
            sub3.getCell(1).alignment = { horizontal: 'center', vertical: 'middle'};
            sub3.getCell(1).border = bordeNegro;

            const headerVend = wsResumen.addRow(['Vendedor', 'Boletos', 'Ingresos']);
            headerVend.eachCell(c => { 
                c.font = headerFont; 
                c.fill = headerFill; 
                c.alignment = { horizontal: 'center' }; 
                c.border = bordeNegro; 
            });

            let indexVend = 0;

            metricas.porVendedor.slice(0, 5).forEach((v: any, indexVend: number) => {
                const row = wsResumen.addRow([v.name, v.tickets, v.ingresos]);

                const bgColor = indexVend % 2 === 0 ? 'FFDCE6F1' : 'FFFFFFFF';

                row.eachCell({ includeEmpty: true }, cell => {
                    cell.border = bordeNegro;
                    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: bgColor } };
                });

                indexVend++;
            });

            // HOJA 2: DETALLE VENTAS
            const wsDetalle = workbook.addWorksheet('2. Detalle Ventas');
            
            const title2 = wsDetalle.addRow(['DETALLE DE VENTAS', '', '', '', '', '', '', '', '', '', '', '']);
            wsDetalle.mergeCells('A1:L1'); 
            title2.height = 50;
            title2.getCell(1).font = titleFont; 
            title2.getCell(1).fill = titleFill;
            title2.getCell(1).alignment = { horizontal: 'center', vertical: 'middle' };
            title2.getCell(1).border = bordeNegro;

            const headersDetalle = ['N° Ticket', 'Fecha Venta', 'Ruta', 'Embarcación', 'Pasajero', 'DNI', 'Asiento', 'Agencia', 'Vendedor', 'Método Pago', 'Precio (S/)', 'Estado'];
            const rowHeader2 = wsDetalle.addRow(headersDetalle);
            rowHeader2.eachCell(c => { c.font = headerFont; c.fill = headerFill; c.alignment = { horizontal: 'center' }; c.border = bordeNegro; });

            dataFiltrada.forEach((v, index) => {
                const row = wsDetalle.addRow([
                    v.comprobante,
                    v.fechaVis,
                    v.trayecto,
                    v.nave,
                    v.pasajero,
                    v.dni,
                    v.asiento,
                    v.agencia, 
                    v.vendedor,
                    v.metodoPago,
                    v.monto,
                    v.estado
                ]);
                
                const bgColor = index % 2 === 0 ? 'FFDCE6F1' : 'FFFFFFFF';

                row.eachCell({ includeEmpty: true }, (cell, colNumber) => {
                    cell.border = bordeNegro;
                    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: bgColor } };

                    if (colNumber === 12) {
                        if (v.estado === 'VENDIDO' || v.estado === 'VÁLIDO') {
                            cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFA1FDA3' } };
                        } else if (v.estado === 'ANULADO' || v.estado === 'CANCELADO') {
                            cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFAAAA4' } };
                        }
                    }
                });
            });

            wsDetalle.getColumn(1).width = 15;
            wsDetalle.getColumn(2).width = 15;
            wsDetalle.getColumn(3).width = 25; 
            wsDetalle.getColumn(4).width = 20; 
            wsDetalle.getColumn(5).width = 30; 
            wsDetalle.getColumn(6).width = 15; 
            wsDetalle.getColumn(7).width = 10; 
            wsDetalle.getColumn(8).width = 23; 
            wsDetalle.getColumn(9).width = 25; 
            wsDetalle.getColumn(10).width = 15; 
            wsDetalle.getColumn(11).width = 12; 
            wsDetalle.getColumn(12).width = 15; 

            // HOJA 3: SUBTOTALES POR RUTA
            const wsRutas = workbook.addWorksheet('3. Subtotales por Ruta');
            
            const title3 = wsRutas.addRow(['INGRESOS POR RUTA', '']);
            wsRutas.mergeCells('A1:B1');
            title3.height = 50;
            title3.getCell(1).font = titleFont; 
            title3.getCell(1).fill = titleFill;
            title3.getCell(1).alignment = { horizontal: 'center', vertical: 'middle' };
            title3.getCell(1).border = bordeNegro;

            const rowHeader3 = wsRutas.addRow(['Ruta Comercial', 'Ingresos Generados (S/)']);
            rowHeader3.eachCell(c => { c.font = headerFont; c.fill = headerFill; c.alignment = { horizontal: 'center' }; c.border = bordeNegro; });

            let indexRuta = 0;

            metricas.porTrayecto.forEach(r => {
                const row = wsRutas.addRow([r.name, r.value]);

                const bgColor = indexRuta % 2 === 0 ? 'FFDCE6F1' : 'FFFFFFFF';

                row.eachCell({ includeEmpty: true }, cell => {
                    cell.border = bordeNegro;
                    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: bgColor } };
                });

                indexRuta++;
            });

            wsRutas.getColumn(1).width = 30;
            wsRutas.getColumn(2).width = 25;

            const buffer = await workbook.xlsx.writeBuffer();
            const d = new Date();
            const fechaActualStr = `${String(d.getDate()).padStart(2, '0')}-${String(d.getMonth() + 1).padStart(2, '0')}-${d.getFullYear()}`;
            saveAs(new Blob([buffer]), `Reporte_TUKI_${fechaActualStr}.xlsx`);
            
            notificarExito("Reporte Excel Profesional Exportado");
        } catch (error) {
            console.error(error);
            notificarError("Ocurrió un error al exportar el Excel.");
        }
    };

    // 📤 EXPORTACIÓN A PDF 
    const exportarPDF = () => {
        const doc = new jsPDF('landscape'); 
        const usuarioActual = getCurrentUser()?.nombreCompleto || 'Administrador';
        const periodoStr = fechaInicio && fechaFin ? `${formatearFechaDDMMYYYY(fechaInicio)} al ${formatearFechaDDMMYYYY(fechaFin)}` : 'Histórico Global';

        doc.setFontSize(22);
        doc.setTextColor(42, 63, 84);
        doc.text("TRANSPORTE TUKI - REPORTE FINANCIERO", 14, 20);
        
        doc.setFontSize(10);
        doc.setTextColor(100, 100, 100);
        doc.text(`Periodo Analizado: ${periodoStr}`, 14, 28);
        doc.text(`Generado por: ${usuarioActual}  |  Fecha: ${new Date().toLocaleString('es-PE')}`, 14, 34);

        doc.setDrawColor(16, 185, 129);
        doc.setFillColor(243, 244, 246);
        doc.rect(14, 40, 268, 22, 'F'); 
        
        doc.setFontSize(11);
        doc.setTextColor(16, 185, 129); 
        doc.text(`INGRESOS TOTALES: ${formatMoney(metricas.total)}`, 20, 53);
        doc.setTextColor(42, 63, 84); 
        doc.text(`Tickets Vendidos: ${metricas.vendidosCount}`, 90, 53);
        doc.text(`Ticket Promedio: ${formatMoney(metricas.promedio)}`, 145, 53);
        doc.setTextColor(239, 68, 68); 
        doc.text(`Anulaciones: ${metricas.anuladosCount}`, 215, 53);

        doc.setFontSize(14);
        doc.setTextColor(42, 63, 84);
        doc.text("Desempeño por Agencia", 14, 75);
        autoTable(doc, {
            startY: 80,
            head: [['Agencia', 'Ingresos']],
            body: metricas.porAgencia.map((p: any) => [p.name, formatMoney(p.value)]),
            theme: 'grid', headStyles: { fillColor: [59, 130, 246] }, margin: { left: 14, right: 150 }
        });

        doc.text("Top Trayectos Exactos (Escalas)", 155, 75);
        autoTable(doc, {
            startY: 80,
            head: [['Trayecto', 'Ingresos']],
            body: metricas.porTrayecto.slice(0,5).map((r: any) => [r.name, formatMoney(r.value)]),
            theme: 'grid', headStyles: { fillColor: [245, 158, 11] }, margin: { left: 155, right: 14 }
        });

        doc.addPage();
        doc.setFontSize(14);
        doc.text("Detalle de Transacciones", 14, 20);
        autoTable(doc, {
            startY: 25,
            head: [['Comprobante', 'Fecha', 'Trayecto (Escala)', 'Agencia', 'Vendedor', 'Pasajero', 'DNI', 'Pago', 'Precio', 'Estado']],
            body: dataFiltrada.map(v => [
                v.comprobante, 
                v.fechaVis, v.trayecto, v.agencia, v.vendedor.split(' ')[0], v.pasajero, v.dni, v.metodoPago, formatMoney(v.monto), v.estado
            ]),
            styles: { fontSize: 7, cellPadding: 2 },
            headStyles: { fillColor: [16, 185, 129] }, 
            didParseCell: function(data) {
                if (data.section === 'body' && (data.row.raw as any[])[9] === 'ANULADO') {
                    data.cell.styles.textColor = [239, 68, 68];
                    data.cell.styles.fontStyle = 'bold';
                }
            }
        });

        const d = new Date();
        const fechaActualStr = `${String(d.getDate()).padStart(2, '0')}-${String(d.getMonth() + 1).padStart(2, '0')}-${d.getFullYear()}`;

        doc.save(`Reporte_TUKI_${fechaActualStr}.pdf`);
        notificarExito("Reporte PDF Gerencial Exportado");
    };

    const CustomTooltip = ({ active, payload, label }: any) => {
        if (active && payload && payload.length) {
            return (
                <div className="bg-[#2A3F54] text-white p-2 rounded-lg shadow-lg text-xs border border-gray-700 z-50">
                    <p className="font-bold mb-1">{label}</p>
                    <p className="text-[#1ABB9C] font-black">{formatMoney(payload[0].value)}</p>
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
                            <span className="text-gray-300 font-medium">{entry.name}:</span>
                            <span className="font-black" style={{color: entry.color}}>{formatMoney(entry.value)}</span>
                        </div>
                    ))}
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
                                <DollarSign size={24} strokeWidth={2.5}/>
                            </div>
                            Reporte de Ventas
                        </h1>
                        <p className="text-sm text-gray-400 mt-1 ml-1">Análisis de rentabilidad y exportación de caja.</p>
                    </div>
                    <div className="flex flex-wrap gap-3">
                        <button onClick={exportarExcel} className="flex items-center gap-2 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 px-4 py-2 rounded-xl font-bold text-xs border border-emerald-200 transition-colors shadow-sm">
                            <FileSpreadsheet size={16}/> Exportar Excel
                        </button>
                        <button onClick={exportarPDF} className="flex items-center gap-2 bg-rose-50 hover:bg-rose-100 text-rose-700 px-4 py-2 rounded-xl font-bold text-xs border border-rose-200 transition-colors shadow-sm">
                            <FileText size={16}/> Exportar PDF
                        </button>
                    </div>
                </div>

                {/* FILTROS Y BOTÓN DE CONTROL DE CAJA */}
                <div className="bg-white p-5 rounded-2xl shadow-sm border border-gray-100 flex flex-wrap items-center justify-between gap-4">
                    <div className="flex flex-wrap items-center gap-4">
                        <div className="flex items-center gap-3 bg-gray-50 px-4 py-2 rounded-xl border border-gray-200 focus-within:border-emerald-500 transition-colors">
                            <Calendar size={16} className="text-emerald-500"/>
                            <span className="text-xs font-black text-gray-400 uppercase">Periodo:</span>
                            <input type="date" value={fechaInicio} onChange={e => setFechaInicio(e.target.value)} className="bg-transparent text-sm font-bold outline-none text-[#2A3F54]"/>
                            <span className="text-gray-300 font-bold">-</span>
                            <input type="date" value={fechaFin} onChange={e => setFechaFin(e.target.value)} className="bg-transparent text-sm font-bold outline-none text-[#2A3F54]"/>
                        </div>
                        {(fechaInicio || fechaFin) && (
                            <button onClick={limpiarFiltros} className="flex items-center gap-2 text-xs font-bold text-rose-500 hover:text-rose-700 bg-rose-50 px-3 py-2 rounded-xl transition-colors border border-rose-100">
                                <XCircle size={14}/> Limpiar
                            </button>
                        )}
                    </div>
                    
                    <button onClick={() => navigate('/admin/control-caja')} className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white px-5 py-2.5 rounded-xl font-bold text-sm shadow-sm transition-colors ml-auto">
                        <Store size={18}/> Control de Cajas
                    </button>
                </div>

                {loading ? (
                    <div className="flex flex-col justify-center items-center py-32 text-emerald-500">
                        <div className="animate-spin rounded-full h-14 w-14 border-b-4 border-emerald-600 mb-4 shadow-lg shadow-emerald-200"></div>
                        <p className="font-bold text-[#2A3F54] text-lg animate-pulse">Calculando finanzas...</p>
                    </div>
                ) : (
                    <div className="space-y-6 animate-in fade-in duration-500">

                        {/* KPIs */}
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                            <div className="bg-gradient-to-br from-[#2A3F54] to-gray-800 text-white p-5 rounded-2xl shadow-xl shadow-gray-900/20 relative overflow-hidden group hover:-translate-y-1 transition-all">
                                <DollarSign className="absolute right-[-10px] top-[-10px] text-gray-700/50 group-hover:scale-110 transition-transform duration-500" size={90}/>
                                <p className="text-gray-300 text-[10px] font-bold uppercase tracking-widest mb-1 relative z-10">Monto Recaudado</p>
                                <h2 className="text-3xl font-black text-emerald-400 relative z-10 truncate">{formatMoney(metricas.total)}</h2>
                            </div>
                            <div className="bg-gradient-to-br from-emerald-500 to-teal-600 text-white p-5 rounded-2xl shadow-lg shadow-emerald-500/30 relative overflow-hidden group hover:-translate-y-1 transition-all">
                                <Ticket className="absolute right-0 top-0 p-2 opacity-20 group-hover:scale-125 transition-transform duration-500" size={80}/>
                                <p className="text-emerald-100 text-[10px] font-bold uppercase tracking-widest mb-1 relative z-10">Boletos Efectivos</p>
                                <h2 className="text-3xl font-black relative z-10">{metricas.vendidosCount}</h2>
                            </div>
                            <div className="bg-gradient-to-br from-blue-500 to-indigo-600 text-white p-5 rounded-2xl shadow-lg shadow-blue-500/30 relative overflow-hidden group hover:-translate-y-1 transition-all">
                                <Tag className="absolute right-0 top-0 p-2 opacity-20 group-hover:scale-125 transition-transform duration-500" size={80}/>
                                <p className="text-blue-100 text-[10px] font-bold uppercase tracking-widest mb-1 relative z-10">Ticket Promedio</p>
                                <h2 className="text-3xl font-black relative z-10">{formatMoney(metricas.promedio)}</h2>
                            </div>
                            <div className="bg-gradient-to-br from-rose-500 to-red-600 text-white p-5 rounded-2xl shadow-lg shadow-rose-500/30 relative overflow-hidden group hover:-translate-y-1 transition-all">
                                <AlertTriangle className="absolute right-0 top-0 p-2 opacity-20 group-hover:scale-125 transition-transform duration-500" size={80}/>
                                <p className="text-rose-100 text-[10px] font-bold uppercase tracking-widest mb-1 relative z-10">Devoluciones</p>
                                <h2 className="text-3xl font-black relative z-10 truncate">{formatMoney(metricas.anuladosDinero)}</h2>
                            </div>
                        </div>

                        {/*  GRÁFICOS */}
                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                            
                            {/* GRÁFICO 1: FLUJO DE CAJA */}
                            <div className="bg-gradient-to-b from-emerald-50/50 to-white p-5 rounded-2xl shadow-sm border border-emerald-50 h-64">
                                <p className="text-xs font-black text-emerald-800 mb-4 text-center uppercase tracking-wider">Flujo de Caja por Día</p>
                                <ResponsiveContainer width="100%" height="100%">
                                    <AreaChart data={metricas.tendencia}>
                                        <defs>
                                            <linearGradient id="colorIngresos" x1="0" y1="0" x2="0" y2="1">
                                                <stop offset="5%" stopColor="#10B981" stopOpacity={0.8}/>
                                                <stop offset="95%" stopColor="#10B981" stopOpacity={0}/>
                                            </linearGradient>
                                            <linearGradient id="colorPerdidas" x1="0" y1="0" x2="0" y2="1">
                                                <stop offset="5%" stopColor="#EF4444" stopOpacity={0.8}/>
                                                <stop offset="95%" stopColor="#EF4444" stopOpacity={0}/>
                                            </linearGradient>
                                        </defs>
                                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#D1FAE5"/>
                                        <XAxis dataKey="fecha" tick={{fontSize: 9, fill: '#064E3B', fontWeight: 600}} axisLine={false} tickLine={false} dy={5}/>
                                        <Tooltip content={<CustomTooltipLine/>}/>
                                        <Legend wrapperStyle={{fontSize: '10px', fontWeight: 'bold'}} verticalAlign="top" height={25}/>
                                        <Area name="Ingresos" type="monotone" dataKey="ingresos" stroke="#10B981" strokeWidth={3} fillOpacity={1} fill="url(#colorIngresos)" activeDot={{r: 5, fill: '#059669', stroke: '#fff'}} />
                                        <Area name="Devoluciones" type="monotone" dataKey="perdidas" stroke="#EF4444" strokeWidth={3} fillOpacity={1} fill="url(#colorPerdidas)" activeDot={{r: 5, fill: '#DC2626', stroke: '#fff'}} />
                                    </AreaChart>
                                </ResponsiveContainer>
                            </div>

                            <div className="bg-gradient-to-b from-blue-50/50 to-white p-5 rounded-2xl shadow-sm border border-blue-50 h-64 flex flex-col">
                                <p className="text-xs font-black text-blue-800 mb-4 text-center uppercase tracking-wider">Desempeño por Agencia</p>
                                <div className="flex-1 w-full overflow-y-auto pr-2 custom-scrollbar">
                                    <ResponsiveContainer width="100%" height={Math.max(200, metricas.porAgencia.length * 45)}>
                                        <BarChart data={metricas.porAgencia} layout="vertical" margin={{left: 20, right: 20, top: 0, bottom: 0}}>
                                            <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#DBEAFE"/>
                                            <XAxis type="number" hide />
                                            <YAxis dataKey="name" type="category" tick={{fontSize: 9, fill: '#1E3A8A', fontWeight: 'bold'}} axisLine={false} tickLine={false} width={100}/>
                                            <Tooltip content={<CustomTooltip/>}/>
                                            <Bar dataKey="value" radius={[0,4,4,0]} barSize={20}>
                                                {metricas.porAgencia.map((e, idx) => <Cell key={idx} fill={idx === 0 ? '#3B82F6' : '#93C5FD'}/>)}
                                            </Bar>
                                        </BarChart>
                                    </ResponsiveContainer>
                                </div>
                            </div>

                            <div className="bg-gradient-to-b from-orange-50/50 to-white p-5 rounded-2xl shadow-sm border border-orange-50 h-[350px]">
                                <p className="text-xs font-black text-orange-800 mb-2 text-center uppercase tracking-wider">Canales de Recaudación</p>
                                <ResponsiveContainer width="100%" height="100%">
                                    <PieChart>
                                        <Pie 
                                            data={metricas.porPago} 
                                            innerRadius={70} 
                                            outerRadius={110} 
                                            paddingAngle={4} 
                                            dataKey="value" 
                                            stroke="none"
                                            labelLine={false}
                                            label={renderCustomizedLabel}
                                        >
                                            {metricas.porPago.map((entry, index) => <Cell key={index} fill={COLORES[index % COLORES.length]} />)}
                                        </Pie>
                                        <Tooltip content={<CustomTooltipMoney />} />
                                        <Legend iconType="circle" wrapperStyle={{fontSize: '12px', fontWeight: 'bold', color: '#7C2D12'}} />
                                    </PieChart>
                                </ResponsiveContainer>
                            </div>

                            <div className="bg-gradient-to-b from-indigo-50/50 to-white p-5 rounded-2xl shadow-sm border border-indigo-50 h-[350px] flex flex-col">
                                <p className="text-xs font-black text-indigo-800 mb-4 text-center uppercase tracking-wider">Ingresos por Trayecto (Escalas)</p>
                                <div className="flex-1 w-full overflow-y-auto pr-2 custom-scrollbar">
                                    <ResponsiveContainer width="100%" height={Math.max(280, metricas.porTrayecto.length * 45)}>
                                        <BarChart data={metricas.porTrayecto} layout="vertical" margin={{left: 40, right: 20, top: 0, bottom: 0}}>
                                            <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#E0E7FF"/>
                                            <XAxis type="number" hide />
                                            <YAxis dataKey="name" type="category" tick={{fontSize: 9, fill: '#312E81', fontWeight: 'bold'}} axisLine={false} tickLine={false} width={120}/>
                                            <Tooltip content={<CustomTooltip/>}/>
                                            <Bar dataKey="value" radius={[0,4,4,0]} barSize={20}>
                                                {metricas.porTrayecto.map((e, idx) => <Cell key={idx} fill={idx === 0 ? '#6366F1' : '#A5B4FC'}/>)}
                                            </Bar>
                                        </BarChart>
                                    </ResponsiveContainer>
                                </div>
                            </div>
                        </div>

                        {/*  TABLAS RESUMEN */}
                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                            
                            {/* Tabla 1: Rendimiento Asesores con Agencia */}
                            <div className="bg-white rounded-2xl shadow-lg shadow-indigo-100/50 border border-indigo-100 overflow-hidden flex flex-col h-full">
                                <div className="p-4 flex justify-between items-center bg-gradient-to-r from-indigo-500 to-blue-600 text-white">
                                    <h3 className="font-bold text-sm flex items-center gap-2"><User size={16} className="text-indigo-100"/> Rendimiento de Asesores</h3>
                                </div>
                                <div className="overflow-x-auto flex-1">
                                    <table className="w-full text-xs text-left">
                                        <thead className="text-indigo-800 uppercase bg-indigo-50/50 border-b border-indigo-100 font-bold">
                                            <tr>
                                                <th className="px-4 py-3">Vendedor</th>
                                                <th className="px-4 py-3">Agencia</th>
                                                <th className="px-4 py-3 text-center">Boletos</th>
                                                <th className="px-4 py-3 text-right">Recaudación</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-indigo-50">
                                            {asesoresPaginados.length === 0 ? (
                                                <tr><td colSpan={4} className="p-10 text-center text-indigo-400 italic font-medium">No hay ventas registradas</td></tr>
                                            ) : asesoresPaginados.map((v: any, i: number) => (
                                                <tr key={i} className="hover:bg-indigo-50/40 transition-colors">
                                                    <td className="px-4 py-3 font-bold text-[#2A3F54]">{v.name}</td>
                                                    <td className="px-4 py-3 text-gray-500 font-medium flex items-center gap-1 mt-1">
                                                        <Store size={10} className="text-indigo-400"/> {v.agencia}
                                                    </td>
                                                    <td className="px-4 py-3 text-center">
                                                        <span className="bg-white border border-gray-200 text-gray-600 px-2 py-0.5 rounded font-black text-[10px] shadow-sm">{v.tickets}</span>
                                                    </td>
                                                    <td className="px-4 py-3 text-right">
                                                        <span className="font-black text-emerald-600">{formatMoney(v.ingresos)}</span>
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                                {/* Paginación */}
                                {totalPaginasAsesores > 1 && (
                                    <div className="p-3 border-t border-indigo-100 flex justify-between items-center bg-indigo-50/30">
                                        <span className="text-xs text-indigo-400 font-bold">Página {paginaAsesores} de {totalPaginasAsesores}</span>
                                        <div className="flex gap-2">
                                            <button onClick={() => setPaginaAsesores(p => Math.max(1, p - 1))} disabled={paginaAsesores === 1} className="p-1 rounded bg-white border border-indigo-200 text-indigo-600 disabled:opacity-50 hover:bg-indigo-50 transition-colors"><ChevronLeft size={16}/></button>
                                            <button onClick={() => setPaginaAsesores(p => Math.min(totalPaginasAsesores, p + 1))} disabled={paginaAsesores === totalPaginasAsesores} className="p-1 rounded bg-white border border-indigo-200 text-indigo-600 disabled:opacity-50 hover:bg-indigo-50 transition-colors"><ChevronRight size={16}/></button>
                                        </div>
                                    </div>
                                )}
                            </div>

                            {/* Tabla 2: Análisis por Trayecto */}
                            <div className="bg-white rounded-2xl shadow-lg shadow-emerald-100/50 border border-emerald-100 overflow-hidden flex flex-col h-full">
                                <div className="p-4 flex justify-between items-center bg-gradient-to-r from-emerald-500 to-teal-500 text-white">
                                    <h3 className="font-bold text-sm flex items-center gap-2"><Map size={16} className="text-emerald-100"/> Análisis por Trayecto Exacto</h3>
                                </div>
                                <div className="overflow-x-auto flex-1">
                                    <table className="w-full text-xs text-left">
                                        <thead className="text-emerald-800 uppercase bg-emerald-50/50 border-b border-emerald-100 font-bold">
                                            <tr>
                                                <th className="px-4 py-3">Trayecto Comercial (Escala)</th>
                                                <th className="px-4 py-3 text-right">Total Neto</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-emerald-50">
                                            {trayectosPaginados.length === 0 ? (
                                                <tr><td colSpan={2} className="p-10 text-center text-emerald-400 italic font-medium">No hay rutas registradas</td></tr>
                                            ) : trayectosPaginados.map((n: any, i: number) => (
                                                <tr key={i} className="hover:bg-emerald-50/40 transition-colors">
                                                    <td className="px-4 py-3 font-bold text-gray-700 flex items-center gap-2">
                                                        <ChevronRight size={14} className="text-emerald-500"/> {n.name}
                                                    </td>
                                                    <td className="px-4 py-3 text-right">
                                                        <span className="font-black text-blue-600">{formatMoney(n.value as any)}</span>
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                                {/* Paginación */}
                                {totalPaginasTrayectos > 1 && (
                                    <div className="p-3 border-t border-emerald-100 flex justify-between items-center bg-emerald-50/30">
                                        <span className="text-xs text-emerald-500 font-bold">Página {paginaTrayectos} de {totalPaginasTrayectos}</span>
                                        <div className="flex gap-2">
                                            <button onClick={() => setPaginaTrayectos(p => Math.max(1, p - 1))} disabled={paginaTrayectos === 1} className="p-1 rounded bg-white border border-emerald-200 text-emerald-600 disabled:opacity-50 hover:bg-emerald-50 transition-colors"><ChevronLeft size={16}/></button>
                                            <button onClick={() => setPaginaTrayectos(p => Math.min(totalPaginasTrayectos, p + 1))} disabled={paginaTrayectos === totalPaginasTrayectos} className="p-1 rounded bg-white border border-emerald-200 text-emerald-600 disabled:opacity-50 hover:bg-emerald-50 transition-colors"><ChevronRight size={16}/></button>
                                        </div>
                                    </div>
                                )}
                            </div>

                        </div>

                    </div>
                )}
            </div>
        </MainLayout>
    );
};

export default ReporteIngresosPage;