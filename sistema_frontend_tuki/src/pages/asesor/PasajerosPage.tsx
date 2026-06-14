import React, { useState, useEffect } from 'react';
import MainLayout from '../../layouts/MainLayout';
import { Users, Search, RefreshCw, Table, FileText, Edit, Ban, Ship, ChevronLeft, ChevronRight, Phone, Printer, MapPin } from 'lucide-react';
import { getViajes, getEscalasPorRuta } from '../../services/configService'; 
import { getManifiesto, anularVenta, getDetalleVenta } from '../../services/ventaService';
import { notificarError, notificarExito, notificarCarga, cerrarNotificacion, confirmarAccion } from '../../services/feedbackService';
import ModalFormularioPasajero from '../../components/ModalFormularioPasajero';
import ModalTicket from '../../components/ModalTicket';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import ExcelJS from 'exceljs';
import { saveAs } from 'file-saver';

const formatearFecha = (fecha: string) => {
  if (!fecha) return "";
  const [anio, mes, dia] = fecha.split('-');
  return `${dia}/${mes}/${anio}`;
};

const formatearHora = (hora: string) => {
  if (!hora) return "";
  const [h, m] = hora.split(':').map(Number);
  const d = new Date();
  d.setHours(h, m);
  return d.toLocaleTimeString('es-PE', {
    hour: 'numeric',
    minute: '2-digit',
    hour12: true
  });
};

const calcularFechaEscala = (fechaZarpeViaje: string, horaZarpeViaje: string, escalas: any[], puertoEmbarqueSeleccionado: string) => {
    if (!fechaZarpeViaje || !escalas || escalas.length === 0) return fechaZarpeViaje;
    
    let fechaActual = new Date(`${fechaZarpeViaje}T00:00:00`);
    let horaAnterior = horaZarpeViaje || "00:00:00";

    const escalasOrdenadas = [...escalas].sort((a, b) => (a.orden || 0) - (b.orden || 0));

    for (const escala of escalasOrdenadas) {
        const horaEscala = escala.horaEmbarque || escala.hora_embarque;
        if (!horaEscala) continue;

        if (horaEscala < horaAnterior) {
            fechaActual.setDate(fechaActual.getDate() + 1);
        }
        horaAnterior = horaEscala;

        const nombrePuertoEscala = escala.puerto?.ciudad || escala.puerto?.nombrePuerto;
        if (nombrePuertoEscala === puertoEmbarqueSeleccionado) {
            break;
        }
    }

    const year = fechaActual.getFullYear();
    const month = String(fechaActual.getMonth() + 1).padStart(2, '0');
    const day = String(fechaActual.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
};

const obtenerNombreCompleto = (p: any) => {
    if (p.nombres && p.apellidos) {
        return `${p.nombres} ${p.apellidos}`.trim();
    }
    const partes = [p.nombres, p.apellidoPaterno, p.apellidoMaterno].filter(Boolean);
    if (partes.length > 0) return partes.join(' ').trim();
    
    if (p.nombreCompletoPasajero) return p.nombreCompletoPasajero.trim();
    if (p.nombreCompleto) return p.nombreCompleto.trim();
    
    return 'Desconocido';
};

const calcularEdad = (fechaNacimiento: string) => {
    if (!fechaNacimiento) return '';
    const hoy = new Date();
    const cumpleanos = new Date(fechaNacimiento);
    if (isNaN(cumpleanos.getTime())) return '';
    
    let edad = hoy.getFullYear() - cumpleanos.getFullYear();
    const m = hoy.getMonth() - cumpleanos.getMonth();
    if (m < 0 || (m === 0 && hoy.getDate() < cumpleanos.getDate())) {
        edad--;
    }
    return isNaN(edad) ? '' : edad;
};

const PasajerosPage = () => {
  const [viajes, setViajes] = useState<any[]>([]);
  const [viajeId, setViajeId] = useState('');
  const [pasajeros, setPasajeros] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [filtro, setFiltro] = useState('');

  const [modalAbierto, setModalAbierto] = useState(false);
  const [pasajeroEditar, setPasajeroEditar] = useState<any>(null);

  const [ticketAImprimir, setTicketAImprimir] = useState<any>(null);

  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 6; 

  const viajeActual = viajes.find(v => v.idViaje === parseInt(viajeId));

  useEffect(() => {
    getViajes().then((data) => {
        const ordenados = data.sort((a:any, b:any) => new Date(b.fechaSalida).getTime() - new Date(a.fechaSalida).getTime());
        setViajes(ordenados);
    });
  }, []);

  useEffect(() => {
    if (viajeId) {
        cargarManifiesto();
        setCurrentPage(1); 
    } else {
        setPasajeros([]);
    }
  }, [viajeId]);

  const cargarManifiesto = async () => {
    setLoading(true);
    try {
        const data = await getManifiesto(parseInt(viajeId));
        
        let pasajerosNormalizados = data.map((item: any) => ({
            ...item,
            idDetalle: item.idDetalle || item.id, 
            idVenta: item.venta?.idVenta || item.idVenta,
            asiento: item.asiento?.numero || item.asiento,
            documento: item.pasajero?.numeroDocumento || item.documento || item.numeroDocumento || item.venta?.pasajero?.numeroDocumento,
            tipoDocumento: item.pasajero?.tipoDocumento || item.tipoDocumento || item.venta?.pasajero?.tipoDocumento,
            nombres: item.pasajero?.nombres || item.nombres || item.venta?.pasajero?.nombres,
            apellidoPaterno: item.pasajero?.apellidoPaterno || item.apellidoPaterno || item.venta?.pasajero?.apellidoPaterno,
            apellidoMaterno: item.pasajero?.apellidoMaterno || item.apellidoMaterno || item.venta?.pasajero?.apellidoMaterno,
            fechaNacimiento: item.pasajero?.fechaNacimiento || item.fechaNacimiento || item.venta?.pasajero?.fechaNacimiento || item.venta?.fechaNacimiento,
            nacionalidad: item.pasajero?.nacionalidad || item.nacionalidad || item.venta?.pasajero?.nacionalidad,
            telefono: item.pasajero?.telefono || item.telefono || item.venta?.pasajero?.telefono,
            origen: item.puertoOrigen?.ciudad || item.origen,
            destino: item.puertoDestino?.ciudad || item.destino,
            nombrePuerto: item.puertoOrigen?.nombrePuerto || item.nombrePuerto,
            direccionOrigen: item.puertoOrigen?.direccion || item.direccionOrigen,
            ordenOrigen: item.ordenOrigen,
            ordenDestino: item.ordenDestino,
            estado: item.estadoPasaje || item.estado || 'VENDIDO',
            monto: item.precioUnitario || item.monto || 0,
            serie: item.venta?.comprobante?.serie || item.serie,
            correlativo: item.venta?.comprobante?.numeroCorrelativo || item.correlativo,
            tipoComprobante: item.venta?.comprobante?.tipoComprobante || item.tipoComprobante,
            vendedor: item.venta?.usuarioVendedor?.nombreCompleto || item.vendedor
        }));

        pasajerosNormalizados = pasajerosNormalizados.sort((a: any, b: any) => {
            const asientoA = String(a.asiento || '');
            const asientoB = String(b.asiento || '');
            return asientoA.localeCompare(asientoB, undefined, { numeric: true });
        });

        setPasajeros(pasajerosNormalizados);
    } catch (error) {
        notificarError("Error cargando la lista de pasajeros");
    } finally {
        setLoading(false);
    }
  };

  const handleEditar = async (pasajeroResumen: any) => {
      const toastId = notificarCarga("Cargando datos completos...");
      try {
          const datosCompletos = await getDetalleVenta(parseInt(viajeId), pasajeroResumen.idDetalle);
          cerrarNotificacion(toastId);
          prepararDatosYAbrirModal(pasajeroResumen, datosCompletos);
      } catch (error) {
          cerrarNotificacion(toastId);
          console.error("Error obteniendo detalles:", error);
          prepararDatosYAbrirModal(pasajeroResumen, null);
      }
  };

  const prepararDatosYAbrirModal = (resumen: any, completos: any) => {
      const datosFormateados = {
          ...resumen, 
          ...(completos || {}),
          idVenta: completos?.venta?.idVenta || completos?.idVenta || resumen.idVenta,
          fechaNacimiento: (completos?.pasajero?.fechaNacimiento || completos?.fechaNacimiento || resumen.fechaNacimiento || '').split('T')[0],
          nombreOrigen: completos?.puertoOrigen?.ciudad || completos?.origen || resumen.origen, 
          nombreDestino: completos?.puertoDestino?.ciudad || completos?.destino || resumen.destino,
          montoFinal: completos?.precioUnitario || completos?.montoFinal || resumen.monto,
          tipoDocumento: completos?.pasajero?.tipoDocumento || completos?.tipoDocumento || resumen.tipoDocumento || 'DNI',
          numeroDocumento: completos?.pasajero?.numeroDocumento || completos?.numeroDocumento || resumen.documento || '',
          nombres: completos?.pasajero?.nombres || completos?.nombres || resumen.nombres || '',
          apellidoPaterno: completos?.pasajero?.apellidoPaterno || completos?.apellidoPaterno || resumen.apellidoPaterno || '',
          apellidoMaterno: completos?.pasajero?.apellidoMaterno || completos?.apellidoMaterno || resumen.apellidoMaterno || '',
          nacionalidad: completos?.pasajero?.nacionalidad || completos?.nacionalidad || resumen.nacionalidad || 'PERUANA',
          telefono: completos?.pasajero?.telefono || completos?.telefono || resumen.telefono || '' 
      };
      
      setPasajeroEditar(datosFormateados);
      setModalAbierto(true);
  };

  const handleAnular = async (venta: any) => {
        const nombre = obtenerNombreCompleto(venta);
        
        const confirmado = await confirmarAccion(
            "¿Anular Pasaje?",
            `¿Estás seguro que deseas anular el pasaje de ${nombre}? Esta acción liberará el asiento y no se puede deshacer.`,
            "Sí, anular pasaje",
            "danger"
        );

        if (!confirmado) return;
        
        const toastId = notificarCarga("Anulando venta...");
        try {
            const idBoletoUnico = String(venta.idDetalle);
            await anularVenta(parseInt(viajeId), idBoletoUnico);
            
            cerrarNotificacion(toastId);
            notificarExito("Pasaje anulado correctamente");
            cargarManifiesto();
        } catch (error) {
            cerrarNotificacion(toastId);
            notificarError("No se pudo anular");
        }
  };

  const handleImprimirTicket = async (pasajeroResumen: any) => {
        const toastId = notificarCarga("Generando ticket...");
        let completos = null;
        let escalas: any[] = [];

        try {
            completos = await getDetalleVenta(parseInt(viajeId), pasajeroResumen.idDetalle);
            
            const idRutaReal = viajeActual?.ruta?.idRuta || viajeActual?.idRuta || viajeActual?.rutaId;
            if (idRutaReal) {
                escalas = await getEscalasPorRuta(idRutaReal);
            }
        } catch (error) {
            console.warn("No se pudo obtener el detalle completo, usando resumen básico.");
        } finally {
            cerrarNotificacion(toastId);
        }

        const datosParaTicket = completos || pasajeroResumen;
        const nombreFinal = obtenerNombreCompleto(datosParaTicket);
        
        const nombreOrigen = completos?.puertoOrigen?.ciudad || pasajeroResumen.origen;
        const escalaMatch = escalas.find((e: any) => e.puerto?.ciudad === nombreOrigen || e.puerto?.nombrePuerto === nombreOrigen);
        const horaEmbarqueEscala = escalaMatch ? (escalaMatch.horaEmbarque || escalaMatch.hora_embarque) : null;

        const horaZarpeBD = horaEmbarqueEscala || completos?.puertoOrigen?.horaEmbarque || completos?.horaEmbarque || pasajeroResumen.horaEmbarque || viajeActual?.horaZarpe || '12:00:00';
        
        const fechaSalidaViaje = completos?.venta?.viaje?.fechaSalida || completos?.fechaSalida || viajeActual?.fechaSalida;
        const horaZarpeViaje = viajeActual?.horaZarpe || '00:00:00';
        
        let fechaEmbarqueFinal = fechaSalidaViaje;
        if (escalaMatch) {
            fechaEmbarqueFinal = calcularFechaEscala(fechaSalidaViaje, horaZarpeViaje, escalas, nombreOrigen);
        }

        const nombreDelPuerto = completos?.puertoOrigen?.nombrePuerto || completos?.nombrePuerto || pasajeroResumen.nombrePuerto || completos?.origen || pasajeroResumen.origen || 'Puerto de Embarque';
        const direccionDelPuerto = completos?.puertoOrigen?.direccion || completos?.direccionOrigen || pasajeroResumen.direccionOrigen || '';

        const rawCorrelativo = completos?.venta?.comprobante?.numeroCorrelativo || completos?.correlativo || pasajeroResumen.correlativo;
        const correlativoFormateado = rawCorrelativo 
            ? String(rawCorrelativo).padStart(6, '0') 
            : '000001';

        const serieFinal = completos?.venta?.comprobante?.serie || completos?.serie || pasajeroResumen.serie || '';
        let tipoComprobanteFinal = completos?.venta?.comprobante?.tipoComprobante || completos?.tipoComprobante || pasajeroResumen.tipoComprobante;
        
        if (!tipoComprobanteFinal) {
            tipoComprobanteFinal = serieFinal.toUpperCase().startsWith('F') ? 'FACTURA' : 'BOLETA';
        } else {
            tipoComprobanteFinal = tipoComprobanteFinal.toUpperCase();
        }

        setTicketAImprimir({
            venta: {
                ...datosParaTicket,
                origenNombre: completos?.puertoOrigen?.ciudad || completos?.origen || pasajeroResumen.origen,
                destinoNombre: completos?.puertoDestino?.ciudad || completos?.destino || pasajeroResumen.destino,
                numeroAsiento: completos?.asiento?.numero || pasajeroResumen.asiento, 
                horaEmbarqueElegida: horaZarpeBD, 
                asiento: completos?.asiento?.numero || pasajeroResumen.asiento, 
                
                fechaSalida: fechaEmbarqueFinal,
                
                horaEmbarque: horaZarpeBD, 
                montoFinal: completos?.precioUnitario || completos?.montoFinal || completos?.monto || pasajeroResumen.monto,
                numeroDocumento: completos?.pasajero?.numeroDocumento || completos?.numeroDocumento || completos?.documento || pasajeroResumen.documento,
                nombreCompletoPasajero: nombreFinal,
                cajeroNombre: completos?.venta?.usuarioVendedor?.nombreCompleto || completos?.vendedor || pasajeroResumen.vendedor || 'Sistema',
                nombrePuertoOrigen: nombreDelPuerto,
                direccionEmbarque: direccionDelPuerto,
                serie: serieFinal,
                correlativo: correlativoFormateado 
            },
            pago: {
                tipoComprobante: tipoComprobanteFinal,
                documentoCliente: completos?.venta?.comprobante?.documentoCliente || completos?.documentoClienteComprobante || completos?.numeroDocumento || pasajeroResumen.documento,
                razonSocialNombre: completos?.venta?.comprobante?.razonSocialCliente || completos?.razonSocialComprobante || nombreFinal,
                metodo: completos?.venta?.pagos?.[0]?.metodoPago || completos?.metodoPago || pasajeroResumen.metodoPago || 'EFECTIVO',
                montoRecibido: completos?.venta?.pagos?.[0]?.monto || completos?.montoRecibido || completos?.montoFinal || pasajeroResumen.monto,
                vuelto: completos?.venta?.pagos?.[0]?.vuelto || completos?.vuelto || 0
            }
        });
  };

  const pasajerosFiltrados = pasajeros.filter(p => {
    const nombreFull = obtenerNombreCompleto(p).toLowerCase();
    const doc = (p.documento || p.numeroDocumento || '').toLowerCase();
    const asien = (p.asiento || '').toLowerCase();
    const telf = (p.telefono || '').toLowerCase();
    const busq = filtro.toLowerCase();

    return nombreFull.includes(busq) || doc.includes(busq) || asien.includes(busq) || telf.includes(busq);
  });

  const indexOfLastItem = currentPage * itemsPerPage;
  const indexOfFirstItem = indexOfLastItem - itemsPerPage;
  const currentItems = pasajerosFiltrados.slice(indexOfFirstItem, indexOfLastItem);
  const totalPages = Math.ceil(pasajerosFiltrados.length / itemsPerPage);
  const paginate = (pageNumber: number) => setCurrentPage(pageNumber);

    function addInfoRow(
        ws: ExcelJS.Worksheet,
        label: string,
        value: string,
        infoFont1: Partial<ExcelJS.Font> = { size: 12, color: { argb: 'FF000000' } },
        bordeNegro: Partial<ExcelJS.Borders> = {
            top: { style: 'thin', color: { argb: 'FF000000' } }, left: { style: 'thin', color: { argb: 'FF000000' } },
                bottom: { style: 'thin', color: { argb: 'FF000000' } }, right: { style: 'thin', color: { argb: 'FF000000' } }
            }
    ) {
        const row = ws.addRow([`${label} ${value}`]);
        ws.mergeCells(`A${row.number}:H${row.number}`);
        row.height = 25;
        row.getCell(1).font = infoFont1;
        for (let col = 1; col <= 8; col++) {
            row.getCell(col).border = bordeNegro;
        }
        return row;
    }

    const exportarExcelManifiesto = async () => {
        if (!viajeActual) {
            notificarError("No hay información del viaje seleccionado.");
            return;
        }
        try {
            const workbook = new ExcelJS.Workbook();
            const ws = workbook.addWorksheet('Lista de Pasajeros');

            const pasajerosValidos = pasajeros.filter(p => p.estado === 'VENDIDO' || p.estado === 'VÁLIDO');

            pasajerosValidos.sort((a, b) => {
                if (a.ordenOrigen !== undefined && b.ordenOrigen !== undefined) {
                    if (a.ordenOrigen !== b.ordenOrigen) {
                        return a.ordenOrigen - b.ordenOrigen;
                    }
                    return (a.ordenDestino || 0) - (b.ordenDestino || 0);
                }
                const tramoA = `${a.origen}-${a.destino}`;
                const tramoB = `${b.origen}-${b.destino}`;
                return tramoA.localeCompare(tramoB);
            });

            const nombreNave = viajeActual.embarcacion?.nombre || viajeActual.nombreEmbarcacion || 'Nave S/N';
            const matriculaNave = viajeActual.embarcacion?.matricula || viajeActual.matriculaEmbarcacion || 'S/M';
            const rutaNombre = viajeActual.ruta?.nombreRuta || viajeActual.nombreRuta || 'Ruta General';
            

            const titleFill: any = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF366092' } };
            const titleFont: Partial<ExcelJS.Font> = { bold: true, size: 20, color: { argb: 'FFFFFFFF' } };
            const headerFill: any = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFFFFFF' } };
            const headerFont: Partial<ExcelJS.Font> = { bold: true, size: 12, color: { argb: 'FF000000' } };
            const bordeGrueso: Partial<ExcelJS.Borders> = {
                top: { style: 'thin', color: { argb: 'FF000000' } }, left: { style: 'thin', color: { argb: 'FF000000' } },
                bottom: { style: 'thin', color: { argb: 'FF000000' } }, right: { style: 'thin', color: { argb: 'FF000000' } }
            };

            const titleRow = ws.addRow(['LISTA DE PASAJEROS', '', '', '', '', '', '', '']);
            ws.mergeCells('A1:H1');
            titleRow.getCell(1).font = titleFont;
            titleRow.getCell(1).fill = titleFill;
            titleRow.getCell(1).alignment = { horizontal: 'center', vertical: 'middle' };
            titleRow.getCell(1).border = bordeGrueso;
            ws.getRow(1).height = 50;

            addInfoRow(ws, 'Fecha de viaje:', formatearFecha(viajeActual.fechaSalida));
            addInfoRow(ws, 'Embarcación:', nombreNave);
            addInfoRow(ws, 'Matrícula:', matriculaNave);
            addInfoRow(ws, 'Ruta Comercial:', rutaNombre);
            
            let rowVacia = ws.addRow([]);
            ws.mergeCells(`A${rowVacia.number}:H${rowVacia.number}`);
            rowVacia.getCell(1).border = bordeGrueso;
            
            const headerRow = ws.addRow(['N°', 'Pasajero (Apellidos y nombres)', 'Tipo Doc.', 'N° Documento', 'Nacionalidad', 'Edad', 'Origen', 'Destino']);
            headerRow.eachCell(c => { 
                c.font = headerFont; 
                c.fill = headerFill; 
                c.alignment = { horizontal: 'center' }; 
                c.border = bordeGrueso;
            });

            pasajerosValidos.forEach((p, index) => {
                let nombreFormat = '';
                if (p.apellidoPaterno || p.apellidoMaterno) {
                    nombreFormat = `${p.apellidoPaterno || ''} ${p.apellidoMaterno || ''}, ${p.nombres || ''}`.trim();
                } else {
                    nombreFormat = obtenerNombreCompleto(p);
                }
                nombreFormat = nombreFormat.replace(/^,|,$/g, '').trim();

                const row = ws.addRow([
                    index + 1,
                    nombreFormat,
                    p.tipoDocumento || 'DNI',
                    p.documento || p.numeroDocumento || 'S/N',
                    p.nacionalidad || 'PERUANA',
                    calcularEdad(p.fechaNacimiento),
                    p.origen,
                    p.destino
                ]);

                const bgColor = index % 2 === 0 ? 'FFDCE6F1' : 'FFFFFFFF'; 
                
                row.eachCell({ includeEmpty: true }, (cell, colNum) => {
                    cell.border = bordeGrueso;
                    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: bgColor } };
                    if (colNum === 1 || colNum === 6) cell.alignment = { horizontal: 'center' };
                });
            });

            ws.getColumn(1).width = 6;
            ws.getColumn(2).width = 45;
            ws.getColumn(3).width = 15;
            ws.getColumn(4).width = 18;
            ws.getColumn(5).width = 15;
            ws.getColumn(6).width = 8;
            ws.getColumn(7).width = 22;
            ws.getColumn(8).width = 22;

            const buffer = await workbook.xlsx.writeBuffer();
            
            const hoy = new Date();
            const dia = String(hoy.getDate()).padStart(2, '0');
            const mes = String(hoy.getMonth() + 1).padStart(2, '0');
            const anio = hoy.getFullYear();
            const nombreArchivo = `lista_de_pasajeros_${dia}_${mes}_${anio}.xlsx`;
            
            saveAs(new Blob([buffer]), nombreArchivo);
            notificarExito("Excel exportado correctamente.");
        } catch (error) {
            console.error(error);
            notificarError("Error al generar el Excel.");
        }
    };

    const exportarPDFManifiesto = () => {
        if (!viajeActual) {
            notificarError("No hay información del viaje seleccionado.");
            return;
        }
        try {
            const doc = new jsPDF('portrait');

            const pasajerosValidos = pasajeros.filter(p => p.estado === 'VENDIDO' || p.estado === 'VÁLIDO');

            pasajerosValidos.sort((a, b) => {
                if (a.ordenOrigen !== undefined && b.ordenOrigen !== undefined) {
                    if (a.ordenOrigen !== b.ordenOrigen) {
                        return a.ordenOrigen - b.ordenOrigen;
                    }
                    return (a.ordenDestino || 0) - (b.ordenDestino || 0);
                }
                const tramoA = `${a.origen}-${a.destino}`;
                const tramoB = `${b.origen}-${b.destino}`;
                return tramoA.localeCompare(tramoB);
            });

            const nombreNave = viajeActual.embarcacion?.nombre || viajeActual.nombreEmbarcacion || 'S/N';
            const matriculaNave = viajeActual.embarcacion?.matricula || viajeActual.matriculaEmbarcacion || 'S/M';
            const rutaNombre = viajeActual.ruta?.nombreRuta || viajeActual.nombreRuta || 'Ruta General';
            
            doc.setTextColor(42, 63, 84); 
            doc.setFontSize(20);
            doc.setFont("helvetica", "bold");
            doc.text("LISTA DE PASAJEROS", 14, 21);

            doc.setFontSize(10);
            
            doc.setFont("helvetica", "bold");
            doc.text("Fecha del Viaje:", 14, 32);
            doc.setFont("helvetica", "normal");
            doc.text(formatearFecha(viajeActual.fechaSalida), 43, 32);

            doc.setFont("helvetica", "bold");
            doc.text("Embarcación:", 14, 39);
            doc.setFont("helvetica", "normal");
            doc.text(`${nombreNave}`, 39, 39);

            doc.setFont("helvetica", "bold");
            doc.text("Matrícula de la Embarcación:", 14, 46);
            doc.setFont("helvetica", "normal");
            doc.text(`${matriculaNave}`, 65, 46);
            
            doc.setFont("helvetica", "bold");
            doc.text("Ruta:", 14, 53);
            doc.setFont("helvetica", "normal");
            doc.text(`${rutaNombre}`, 25, 53);

            const tableData = pasajerosValidos.map((p, index) => {
                let nombreFormat = '';
                if (p.apellidoPaterno || p.apellidoMaterno) {
                    nombreFormat = `${p.apellidoPaterno || ''} ${p.apellidoMaterno || ''}, ${p.nombres || ''}`.trim();
                } else {
                    nombreFormat = obtenerNombreCompleto(p);
                }

                return [
                    index + 1,
                    nombreFormat.replace(/^,|,$/g, '').trim(),
                    p.documento || p.numeroDocumento || 'S/N',
                    p.asiento || 'S/A',
                    p.origen,
                    p.destino
                ];
            });

            autoTable(doc, {
                startY: 59, 
                head: [['N°', 'Pasajero (Apellidos y Nombres)', 'Documento', 'Asiento', 'Origen', 'Destino']],
                body: tableData,
                theme: 'grid',
                headStyles: { 
                    fillColor: [42, 63, 84], 
                    textColor: 255, 
                    fontStyle: 'bold',
                    halign: 'center'
                },
                alternateRowStyles: { fillColor: [240, 249, 245] }, 
                styles: { fontSize: 8, cellPadding: 3, textColor: [50, 50, 50] },
                columnStyles: {
                    0: { halign: 'center' },
                    2: { halign: 'center' },
                    3: { halign: 'center', fontStyle: 'bold', textColor: [16, 185, 129] } 
                },
                margin: { top: 14, bottom: 40 } 
            });

            let finalY = (doc as any).lastAutoTable.finalY || 52;
            if (finalY > doc.internal.pageSize.height - 40) {
                doc.addPage();
                finalY = 20;
            } else {
                finalY += 15;
            }

            doc.setFillColor(243, 244, 246); 
            doc.setDrawColor(209, 213, 219); 
            doc.roundedRect(14, finalY, doc.internal.pageSize.width - 28, 28, 3, 3, 'FD');

            doc.setTextColor(220, 38, 38); 
            doc.setFont("helvetica", "bold");
            doc.text("Información Importante:", 18, finalY + 8);
            
            doc.setTextColor(75, 85, 99);
            doc.setFont("helvetica", "normal");
            doc.setFontSize(8);
            doc.text("1. Los pasajeros deben presentarse 30 minutos antes de la hora de embarque.", 18, finalY + 14);
            doc.text("2. Es obligatorio portar su documento de identidad original para abordar.", 18, finalY + 19);
            doc.text("3. El pasajero es responsable del cuidado de sus pertenencias personales.", 18, finalY + 24);

            const hoy = new Date();
            const dia = String(hoy.getDate()).padStart(2, '0');
            const mes = String(hoy.getMonth() + 1).padStart(2, '0');
            const anio = hoy.getFullYear();
            const nombreArchivo = `lista_de_pasajeros_${dia}_${mes}_${anio}.pdf`;

            doc.save(nombreArchivo);
            notificarExito("PDF exportado correctamente.");
        } catch (error) {
            console.error(error);
            notificarError("Ocurrió un error al generar el PDF.");
        }
    };

  return (
    <MainLayout>
      <div className="max-w-7xl mx-auto pb-10">
        
        {/* HEADER */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 mb-8 flex flex-col md:flex-row justify-between items-center gap-6">
            <div>
                <h1 className="text-2xl font-bold text-[#2A3F54] flex items-center gap-3">
                    <div className="p-2 bg-blue-50 rounded-lg text-[#1ABB9C]">
                        <Users size={24} />
                    </div>
                    Manifiesto de Pasajeros
                </h1>
                <p className="text-sm text-gray-400 mt-1 ml-1">Consulta y gestión de ventas por viaje.</p>
            </div>
            
            <div className="w-full md:w-[450px] relative group">
                <Ship className="absolute left-3 top-3.5 text-gray-400 pointer-events-none" size={18}/>
                <select 
                    value={viajeId} 
                    onChange={(e) => setViajeId(e.target.value)}
                    className="w-full pl-10 pr-4 py-3 bg-gray-50 border border-gray-200 rounded-xl outline-none focus:bg-white focus:border-[#1ABB9C] focus:ring-4 focus:ring-green-50 font-medium text-gray-700 cursor-pointer"
                >
                    <option value="">-- Seleccione un Zarpe --</option>
                    {viajes.map(v => (
                        <option key={v.idViaje} value={v.idViaje}>
                            {formatearFecha(v.fechaSalida)} • {formatearHora(v.horaZarpe)} — {v.nombreRuta}
                        </option>
                    ))}
                </select>
            </div>
        </div>

        {/* CONTENIDO PRINCIPAL */}
        <div className="bg-white rounded-2xl shadow-xl border border-gray-100 overflow-hidden min-h-[400px] flex flex-col">
            
            {/* BARRA DE HERRAMIENTAS */}
            <div className="p-5 border-b border-gray-100 bg-[#2A3F54] flex flex-col md:flex-row justify-between gap-4 items-center">
                <div className="relative w-full md:w-80 group">
                    <Search className="absolute left-3 top-2.5 text-gray-400 group-focus-within:text-[#1ABB9C] transition-colors" size={18}/>
                    <input 
                        type="text" 
                        placeholder="Buscar por nombre, DNI, asiento o teléfono..." 
                        className="w-full pl-10 pr-4 py-2 bg-white border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-[#1ABB9C] focus:ring-2 focus:ring-green-50 transition-all"
                        value={filtro}
                        onChange={(e) => { setFiltro(e.target.value); setCurrentPage(1); }}
                        disabled={!viajeId}
                    />
                </div>
                
                <div className="flex gap-2 w-full md:w-auto justify-end">
                    <button onClick={cargarManifiesto} disabled={!viajeId} className="p-2 text-white hover:bg-white hover:text-[#1ABB9C] hover:shadow-sm rounded-lg border border-transparent hover:border-gray-200 transition-all">
                        <RefreshCw size={20} className={loading ? "animate-spin" : ""}/>
                    </button>
                    <button onClick={exportarExcelManifiesto} disabled={!viajeId || pasajeros.length === 0} className="flex items-center gap-2 px-4 py-2 bg-green-500 text-white border border-green-500 rounded-lg hover:bg-green-100 hover:border-green-300 hover:text-green-500 transition-all text-xs font-bold shadow-sm ">
                        <Table size={16}/> <span className="hidden sm:inline">Excel</span>
                    </button>
                    <button onClick={exportarPDFManifiesto} disabled={!viajeId || pasajeros.length === 0} className="flex items-center gap-2 px-4 py-2 bg-red-500 text-white border border-red-500 rounded-lg hover:bg-red-100 hover:border-red-300 hover:text-red-500 transition-all text-xs font-bold shadow-sm">
                        <FileText size={16}/> <span className="hidden sm:inline">PDF</span>
                    </button>
                </div>
            </div>

            {/* TABLA */}
            <div className="overflow-x-auto">
                <table className="w-full text-sm text-left whitespace-nowrap">
                    <thead className="bg-gray-50 text-gray-500 font-bold uppercase text-[10px] tracking-wider border-b border-gray-100">
                        <tr>
                            <th className="p-4 w-12 text-[12px] text-center text-[#1ABB9C]">N°</th>
                            <th className="p-4 w-16 text-center">Asiento</th>
                            <th className="p-4">Pasajero</th>
                            <th className="p-4">Contacto</th> 
                            <th className="p-4">Ruta / Tramo</th>
                            <th className="p-4 text-center">Estado</th>
                            <th className="p-4 text-right">Monto</th>
                            <th className="p-4 text-right">Acciones</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-50">
                        {loading ? (
                            <tr><td colSpan={8} className="p-12 text-center text-gray-400"><RefreshCw className="animate-spin mx-auto mb-2 text-[#1ABB9C]" size={32}/> Cargando datos...</td></tr>
                        ) : pasajerosFiltrados.length === 0 ? (
                            <tr><td colSpan={8} className="p-12 text-center text-gray-400">
                                <div className="flex flex-col items-center gap-2"><Users size={40} className="text-gray-200"/><p className="text-sm">{viajeId ? 'No se encontraron pasajeros.' : 'Seleccione un viaje para comenzar.'}</p></div>
                            </td></tr>
                        ) : (
                            currentItems.map((p, index) => {
                                const nombreFinal = obtenerNombreCompleto(p);
                                const estadoStr = (p.estado || 'VENDIDO').toUpperCase();
                                const docFinal = p.documento || p.numeroDocumento || 'S/N';
                                
                                const uniqueKey = p.idDetalle 
                                    ? `det-${p.idDetalle}` 
                                    : `vt-${p.idVenta}-doc-${docFinal}-as-${p.asiento}`;

                                return (
                                <tr key={uniqueKey} className={`hover:bg-blue-300/15 transition-colors group ${estadoStr === 'ANULADO' || estadoStr === 'CANCELADO' ? 'opacity-50 bg-gray-50' : ''}`}>
                                    <td className="p-4 text-center text-xs font-bold text-gray-400">{(currentPage - 1) * itemsPerPage + index + 1}</td>
                                    
                                    <td className="p-4 text-center">
                                        <span className="bg-white text-gray-700 font-bold px-2.5 py-1 rounded-lg border border-gray-200 text-xs shadow-sm">
                                            {p.asiento}
                                        </span>
                                    </td>
                                    
                                    <td className="p-4">
                                        <div className="font-bold text-[#2A3F54]">{nombreFinal}</div>
                                        <div className="text-[10px] text-gray-500 font-mono mt-0.5 flex items-center gap-2">
                                            <span className="bg-gray-100 px-1 rounded border">{docFinal}</span>
                                            <span>{p.nacionalidad || 'PERUANA'}</span>
                                        </div>
                                    </td>
                                    
                                    <td className="p-4">
                                        {p.telefono ? (
                                            <div className="flex items-center gap-1.5 text-xs text-gray-600 font-medium">
                                                <Phone size={12} className="text-[#1ABB9C]"/> {p.telefono}
                                            </div>
                                        ) : (
                                            <span className="text-[10px] text-gray-400 italic">No registrado</span>
                                        )}
                                    </td>
                                    
                                    <td className="p-4">
                                        <div className="flex items-center gap-2 text-xs text-gray-600 bg-blue-50 w-fit px-3 py-1.5 rounded-lg border border-blue-100">
                                            <MapPin size={12} className="text-blue-400"/>
                                            <span className="font-medium text-[#2A3F54]">{p.origen}</span>
                                            <span className="text-blue-400 font-bold">➝</span>
                                            <span className="font-black text-[#2A3F54]">{p.destino}</span>
                                        </div>
                                    </td>
                                    
                                    <td className="p-4 text-center">
                                        <span className={`px-3 py-1 rounded-full text-[10px] font-bold border uppercase tracking-wide
                                            ${estadoStr === 'VENDIDO' || estadoStr === 'VÁLIDO' ? 'bg-green-50 text-green-700 border-green-200' : 'bg-red-50 text-red-700 border-red-200'}`}>
                                            {estadoStr}
                                        </span>
                                    </td>
                                    
                                    <td className="p-4 text-right font-mono font-bold text-[#2A3F54]">
                                        S/ {(p.monto || 0).toFixed(2)}
                                    </td>
                                    
                                    <td className="p-4 text-right">
                                        <div className="flex justify-end gap-2">
                                            {(estadoStr !== 'ANULADO' && estadoStr !== 'CANCELADO') && (
                                                <button 
                                                    onClick={() => handleImprimirTicket(p)}
                                                    className="flex items-center gap-1 px-2 py-1 text-emerald-600 bg-emerald-50 border border-emerald-100 hover:bg-emerald-100 rounded text-[10px] font-bold transition-colors"
                                                    title="Reimprimir Ticket"
                                                >
                                                    <Printer size={12}/> Imprimir
                                                </button>
                                            )}

                                            {(estadoStr !== 'ANULADO' && estadoStr !== 'CANCELADO') && (
                                                <button onClick={() => handleEditar(p)} className="flex items-center gap-1 px-2 py-1 text-blue-600 bg-blue-50 border border-blue-100 hover:bg-blue-100 rounded text-[10px] font-bold transition-colors">
                                                    <Edit size={12}/> Editar
                                                </button>
                                            )}

                                            {(estadoStr !== 'ANULADO' && estadoStr !== 'CANCELADO') && (
                                                <button onClick={() => handleAnular(p)} className="flex items-center gap-1 px-2 py-1 text-red-600 bg-red-50 border border-red-100 hover:bg-red-100 rounded text-[10px] font-bold transition-colors">
                                                    <Ban size={12}/> Anular
                                                </button>
                                            )}
                                        </div>
                                    </td>
                                </tr>
                            )})
                        )}
                    </tbody>
                </table>
            </div>
            
            {/* FOOTER Paginación */}
            <div className="bg-gray-50 border-t border-gray-200 p-4 flex flex-col md:flex-row justify-between items-center gap-4 mt-auto">
                <div className="flex flex-col md:flex-row items-center gap-4">
                    <div className="text-xs text-gray-500 font-medium bg-white px-3 py-1 rounded-full border border-gray-200 shadow-sm">
                        Mostrando <span className="font-bold text-[#2A3F54]">{pasajerosFiltrados.length > 0 ? indexOfFirstItem + 1 : 0}-{Math.min(indexOfLastItem, pasajerosFiltrados.length)}</span> de {pasajerosFiltrados.length}
                    </div>
                </div>
                <div className="flex gap-2">
                    <button onClick={() => paginate(currentPage - 1)} disabled={currentPage === 1} className="p-2 rounded-lg bg-white border border-gray-200 text-gray-500 hover:text-[#1ABB9C] hover:border-[#1ABB9C] disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-sm"><ChevronLeft size={18}/></button>
                    <button onClick={() => paginate(currentPage + 1)} disabled={currentPage === totalPages || totalPages === 0} className="p-2 rounded-lg bg-white border border-gray-200 text-gray-500 hover:text-[#1ABB9C] hover:border-[#1ABB9C] disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-sm"><ChevronRight size={18}/></button>
                </div>
            </div>
        </div>

        {/* MODAL EDICION */}
        {modalAbierto && pasajeroEditar && (
            <ModalFormularioPasajero
                isOpen={modalAbierto}
                onClose={() => { setModalAbierto(false); setPasajeroEditar(null); }}
                viaje={viajeActual}
                asiento={pasajeroEditar.asiento}
                origenId={pasajeroEditar.idPuertoOrigen}
                destinoId={pasajeroEditar.idPuertoDestino}
                origenNombre={pasajeroEditar.nombreOrigen}
                destinoNombre={pasajeroEditar.nombreDestino}
                precioCalculado={pasajeroEditar.montoFinal}
                datosPrevios={pasajeroEditar} 
                modoEdicion={true}
                onSuccess={() => {
                    setModalAbierto(false);
                    setPasajeroEditar(null);
                    cargarManifiesto();
                }}
            />
        )}

        {/* MODAL DEL TICKET */}
        <ModalTicket 
            isOpen={!!ticketAImprimir}
            onClose={() => setTicketAImprimir(null)}
            datosVenta={ticketAImprimir?.venta}
            datosPago={ticketAImprimir?.pago}
        />

      </div>
    </MainLayout>
  );
};

export default PasajerosPage;