package com.tuki.sistema.service;

import com.tuki.sistema.dto.AuditoriaCajaDTO;
import com.tuki.sistema.dto.ReporteArchivo;
import com.tuki.sistema.entity.CajaTurno;
import com.tuki.sistema.entity.Cancelacion;
import com.tuki.sistema.entity.Venta;
import com.tuki.sistema.entity.VentaDetalle;
import com.tuki.sistema.entity.Viaje;
import com.tuki.sistema.repository.CajaTurnoRepository;
import com.tuki.sistema.repository.CancelacionRepository;
import com.tuki.sistema.repository.VentaRepository;
import com.tuki.sistema.repository.VentaDetalleRepository;
import com.tuki.sistema.repository.ViajeRepository;
import org.apache.poi.ss.usermodel.*;
import org.apache.poi.xssf.usermodel.XSSFWorkbook;
import com.lowagie.text.Document;
import com.lowagie.text.PageSize;
import com.lowagie.text.Paragraph;
import com.lowagie.text.Phrase;
import com.lowagie.text.Element;
import com.lowagie.text.FontFactory;
import com.lowagie.text.pdf.PdfPTable;
import com.lowagie.text.pdf.PdfPCell;
import com.lowagie.text.pdf.PdfWriter;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

import java.io.ByteArrayInputStream;
import java.io.ByteArrayOutputStream;
import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

@Service
public class ReporteService {

    @Autowired
    private VentaDetalleRepository ventaDetalleRepository;

    @Autowired
    private ViajeRepository viajeRepository;

    @Autowired
    private CajaTurnoRepository cajaTurnoRepository;

    @Autowired
    private VentaRepository ventaRepository;

    @Autowired
    private CancelacionRepository cancelacionRepository;

    public ReporteArchivo generarExcelManifiestoArchivo(Long idViaje) {
        return new ReporteArchivo(generarExcelManifiesto(idViaje), nombreArchivoManifiesto(idViaje, "xlsx"));
    }

    public ReporteArchivo generarPdfManifiestoArchivo(Long idViaje) {
        return new ReporteArchivo(generarPdfManifiesto(idViaje), nombreArchivoManifiesto(idViaje, "pdf"));
    }

    public ByteArrayInputStream generarExcelManifiesto(Long idViaje) {
        try (Workbook workbook = new XSSFWorkbook(); ByteArrayOutputStream out = new ByteArrayOutputStream()) {
            Viaje viaje = viajeRepository.findById(idViaje).orElseThrow();
            
            List<VentaDetalle> detalles = ventaDetalleRepository.findByVenta_Viaje_IdViajeAndEstadoPasaje(idViaje, "ANULADO");
            
            Sheet sheet = workbook.createSheet("Manifiesto Pasajeros");
            Row headerRow = sheet.createRow(0);
            String[] columnas = {"Asiento", "Nombres", "Documento", "Nacionalidad", "Origen", "Destino"};
            
            for (int i = 0; i < columnas.length; i++) {
                Cell cell = headerRow.createCell(i);
                cell.setCellValue(columnas[i]);
            }
            
            int rowIdx = 1;
            for (VentaDetalle detalle : detalles) {
                Row row = sheet.createRow(rowIdx++);
                row.createCell(0).setCellValue(detalle.getAsiento().getNumero());
                row.createCell(1).setCellValue(detalle.getPasajero().getNombres() + " " + detalle.getPasajero().getApellidoPaterno());
                row.createCell(2).setCellValue(detalle.getPasajero().getNumeroDocumento());
                row.createCell(3).setCellValue(detalle.getPasajero().getNacionalidad());
                row.createCell(4).setCellValue(detalle.getPuertoOrigen().getCiudad());
                row.createCell(5).setCellValue(detalle.getPuertoDestino().getCiudad());
            }
            
            workbook.write(out);
            return new ByteArrayInputStream(out.toByteArray());
        } catch (Exception e) {
            throw new RuntimeException("Error generando Excel", e);
        }
    }

    public ByteArrayInputStream generarPdfManifiesto(Long idViaje) {
        Document document = new Document(PageSize.A4);
        ByteArrayOutputStream out = new ByteArrayOutputStream();
        
        try {
            PdfWriter.getInstance(document, out);
            document.open();
            
            Viaje viaje = viajeRepository.findById(idViaje).orElseThrow();
            
            document.add(new Paragraph("Transporte Tuki - Manifiesto de Pasajeros", FontFactory.getFont(FontFactory.HELVETICA_BOLD, 18)));
            document.add(new Paragraph("Embarcación: " + viaje.getEmbarcacion().getNombre() + " | Fecha: " + viaje.getFechaSalida()));
            document.add(new Paragraph(" "));
            
            PdfPTable table = new PdfPTable(5);
            table.setWidthPercentage(100);
            String[] headers = {"Asiento", "Pasajero", "DNI/Pass", "Origen", "Destino"};
            
            for (String header : headers) {
                PdfPCell cell = new PdfPCell(new Phrase(header, FontFactory.getFont(FontFactory.HELVETICA_BOLD, 10)));
                cell.setHorizontalAlignment(Element.ALIGN_CENTER);
                table.addCell(cell);
            }
            
            List<VentaDetalle> detalles = ventaDetalleRepository.findByVenta_Viaje_IdViajeAndEstadoPasaje(idViaje, "ANULADO");
            
            for (VentaDetalle detalle : detalles) {
                table.addCell(new Phrase(detalle.getAsiento().getNumero(), FontFactory.getFont(FontFactory.HELVETICA, 9)));
                table.addCell(new Phrase(detalle.getPasajero().getNombres() + " " + detalle.getPasajero().getApellidoPaterno(), FontFactory.getFont(FontFactory.HELVETICA, 9)));
                table.addCell(new Phrase(detalle.getPasajero().getNumeroDocumento(), FontFactory.getFont(FontFactory.HELVETICA, 9)));
                table.addCell(new Phrase(detalle.getPuertoOrigen().getCiudad(), FontFactory.getFont(FontFactory.HELVETICA, 9)));
                table.addCell(new Phrase(detalle.getPuertoDestino().getCiudad(), FontFactory.getFont(FontFactory.HELVETICA, 9)));
            }
            
            document.add(table);
            document.close();
            
            return new ByteArrayInputStream(out.toByteArray());
        } catch (Exception e) {
            throw new RuntimeException("Error generando PDF", e);
        }
    }

    public List<AuditoriaCajaDTO> obtenerAuditoriaGerencial(LocalDateTime inicio, LocalDateTime fin) {
        LocalDateTime inicioConsulta = inicio != null ? inicio : LocalDateTime.now().minusDays(30);
        LocalDateTime finConsulta = fin != null ? fin : LocalDateTime.now();
        return cajaTurnoRepository.obtenerReporteAuditoria(inicioConsulta, finConsulta);
    }

    public List<Map<String, Object>> obtenerExtractoMovimientos() {
        List<Map<String, Object>> movimientos = new ArrayList<>();
        agregarMovimientosCaja(movimientos);
        agregarMovimientosVentas(movimientos);
        agregarMovimientosCancelaciones(movimientos);
        movimientos.sort(this::compararMovimientoPorHoraDesc);
        return movimientos;
    }

    private String nombreArchivoManifiesto(Long idViaje, String extension) {
        Viaje viaje = viajeRepository.findById(idViaje).orElseThrow();
        String fecha = viaje.getFechaSalida().format(DateTimeFormatter.ofPattern("dd-MM-yyyy"));
        String nombreNave = viaje.getEmbarcacion().getNombre().replace(" ", "_");
        return "Manifiesto_" + nombreNave + "_" + fecha + "." + extension;
    }

    private void agregarMovimientosCaja(List<Map<String, Object>> movimientos) {
        for (CajaTurno turno : cajaTurnoRepository.findAll()) {
            String asesor = turno.getUsuario() != null ? turno.getUsuario().getNombreCompleto() : "S/N";
            String agencia = turno.getAgencia() != null ? turno.getAgencia().getNombreAgencia() : "Sede Principal";

            movimientos.add(movimiento("APERTURA", turno.getSaldoInicial(), turno.getFechaApertura(), asesor, agencia));

            if (turno.getFechaCierre() != null) {
                BigDecimal diferencia = turno.getDiferencia() != null ? turno.getDiferencia() : BigDecimal.ZERO;
                movimientos.add(movimiento("CIERRE", turno.getSaldoFinal().add(diferencia), turno.getFechaCierre(), asesor, agencia));
            }
        }
    }

    private void agregarMovimientosVentas(List<Map<String, Object>> movimientos) {
        for (Venta venta : ventaRepository.findAll()) {
            if ("COMPLETADA".equals(venta.getEstado())) {
                String asesor = venta.getUsuarioVendedor() != null ? venta.getUsuarioVendedor().getNombreCompleto() : "S/N";
                String agencia = venta.getUsuarioVendedor() != null && venta.getUsuarioVendedor().getAgencia() != null
                        ? venta.getUsuarioVendedor().getAgencia().getNombreAgencia()
                        : "Sede Principal";
                movimientos.add(movimiento("VENTA", venta.getTotal(), venta.getFechaVenta(), asesor, agencia));
            }
        }
    }

    private void agregarMovimientosCancelaciones(List<Map<String, Object>> movimientos) {
        for (Cancelacion cancelacion : cancelacionRepository.findAll()) {
            String asesor = cancelacion.getUsuarioAutoriza() != null ? cancelacion.getUsuarioAutoriza().getNombreCompleto() : "S/N";
            String agencia = cancelacion.getUsuarioAutoriza() != null && cancelacion.getUsuarioAutoriza().getAgencia() != null
                    ? cancelacion.getUsuarioAutoriza().getAgencia().getNombreAgencia()
                    : "Sede Principal";
            movimientos.add(movimiento("DEVOLUCION", cancelacion.getMontoDevuelto().negate(), cancelacion.getFechaCancelacion(), asesor, agencia));
        }
    }

    private Map<String, Object> movimiento(String tipo, Object monto, LocalDateTime hora, String usuario, String agencia) {
        Map<String, Object> movimiento = new HashMap<>();
        movimiento.put("tipo", tipo);
        movimiento.put("monto", monto);
        movimiento.put("hora", hora);
        movimiento.put("usuario", usuario);
        movimiento.put("agencia", agencia);
        return movimiento;
    }

    private int compararMovimientoPorHoraDesc(Map<String, Object> primero, Map<String, Object> segundo) {
        LocalDateTime horaPrimero = (LocalDateTime) primero.get("hora");
        LocalDateTime horaSegundo = (LocalDateTime) segundo.get("hora");
        if (horaPrimero == null) {
            return 1;
        }
        if (horaSegundo == null) {
            return -1;
        }
        return horaSegundo.compareTo(horaPrimero);
    }
}
