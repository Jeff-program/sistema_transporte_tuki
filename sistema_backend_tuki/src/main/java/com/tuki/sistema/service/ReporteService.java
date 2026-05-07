package com.tuki.sistema.service;

import com.tuki.sistema.entity.VentaDetalle;
import com.tuki.sistema.entity.Viaje;
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
import java.util.List;

@Service
public class ReporteService {

    @Autowired
    private VentaDetalleRepository ventaDetalleRepository;

    @Autowired
    private ViajeRepository viajeRepository;

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
}