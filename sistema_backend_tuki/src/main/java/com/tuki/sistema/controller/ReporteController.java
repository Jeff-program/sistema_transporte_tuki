package com.tuki.sistema.controller;

import com.tuki.sistema.dto.AuditoriaCajaDTO;
import com.tuki.sistema.dto.ReporteArchivo;
import com.tuki.sistema.service.ReporteDescargaService;
import com.tuki.sistema.service.ReporteService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.core.io.InputStreamResource;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/reportes")
public class ReporteController {

    @Autowired private ReporteService reporteService;
    @Autowired private ReporteDescargaService reporteDescargaService;

    @GetMapping("/manifiesto/{idViaje}/excel")
    public ResponseEntity<InputStreamResource> descargarExcel(@PathVariable Long idViaje) {
        ReporteArchivo archivo = reporteService.generarExcelManifiestoArchivo(idViaje);
        return reporteDescargaService.descargarArchivo(
                archivo,
                "attachment",
                "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
        );
    }

    @GetMapping("/manifiesto/{idViaje}/pdf")
    public ResponseEntity<InputStreamResource> descargarPdf(@PathVariable Long idViaje) {
        ReporteArchivo archivo = reporteService.generarPdfManifiestoArchivo(idViaje);
        return reporteDescargaService.descargarArchivo(archivo, "inline", MediaType.APPLICATION_PDF_VALUE);
    }

    @GetMapping("/auditoria-cajas")
    public ResponseEntity<List<AuditoriaCajaDTO>> obtenerAuditoriaGerencial(
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE_TIME) LocalDateTime inicio,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE_TIME) LocalDateTime fin) {
        return ResponseEntity.ok(reporteService.obtenerAuditoriaGerencial(inicio, fin));
    }

    @GetMapping("/movimientos")
    public ResponseEntity<List<Map<String, Object>>> obtenerExtractoMovimientos() {
        return ResponseEntity.ok(reporteService.obtenerExtractoMovimientos());
    }

}
