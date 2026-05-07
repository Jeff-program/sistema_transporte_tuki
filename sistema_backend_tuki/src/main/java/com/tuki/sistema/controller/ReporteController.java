package com.tuki.sistema.controller;

import com.tuki.sistema.dto.AuditoriaCajaDTO;
import com.tuki.sistema.entity.CajaTurno;
import com.tuki.sistema.entity.Cancelacion;
import com.tuki.sistema.entity.Venta;
import com.tuki.sistema.entity.Viaje;
import com.tuki.sistema.repository.CajaTurnoRepository;
import com.tuki.sistema.repository.CancelacionRepository;
import com.tuki.sistema.repository.VentaRepository;
import com.tuki.sistema.repository.ViajeRepository;
import com.tuki.sistema.service.ReporteService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.core.io.InputStreamResource;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.io.ByteArrayInputStream;
import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/reportes")
public class ReporteController {

    @Autowired private ReporteService reporteService;
    @Autowired private ViajeRepository viajeRepository;
    @Autowired private CajaTurnoRepository cajaTurnoRepository;
    @Autowired private VentaRepository ventaRepository;
    @Autowired private CancelacionRepository cancelacionRepository; // Añadir este

    @GetMapping("/manifiesto/{idViaje}/excel")
    public ResponseEntity<InputStreamResource> descargarExcel(@PathVariable Long idViaje) {
        ByteArrayInputStream in = reporteService.generarExcelManifiesto(idViaje);
        Viaje viaje = viajeRepository.findById(idViaje).orElseThrow();
        String fecha = viaje.getFechaSalida().format(DateTimeFormatter.ofPattern("dd-MM-yyyy"));
        String nombreArchivo = "Manifiesto_" + viaje.getEmbarcacion().getNombre().replace(" ", "_") + "_" + fecha + ".xlsx";

        HttpHeaders headers = new HttpHeaders();
        headers.add("Content-Disposition", "attachment; filename=\"" + nombreArchivo + "\"");

        return ResponseEntity.ok()
                .headers(headers)
                .contentType(MediaType.parseMediaType("application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"))
                .body(new InputStreamResource(in));
    }

    @GetMapping("/manifiesto/{idViaje}/pdf")
    public ResponseEntity<InputStreamResource> descargarPdf(@PathVariable Long idViaje) {
        ByteArrayInputStream in = reporteService.generarPdfManifiesto(idViaje);
        Viaje viaje = viajeRepository.findById(idViaje).orElseThrow();
        String fecha = viaje.getFechaSalida().format(DateTimeFormatter.ofPattern("dd-MM-yyyy"));
        String nombreArchivo = "Manifiesto_" + viaje.getEmbarcacion().getNombre().replace(" ", "_") + "_" + fecha + ".pdf";

        HttpHeaders headers = new HttpHeaders();
        headers.add("Content-Disposition", "inline; filename=\"" + nombreArchivo + "\"");

        return ResponseEntity.ok()
                .headers(headers)
                .contentType(MediaType.APPLICATION_PDF)
                .body(new InputStreamResource(in));
    }

    public ReporteController(ViajeRepository viajeRepository) {
        this.viajeRepository = viajeRepository;
    }

    @GetMapping("/auditoria-cajas")
    public ResponseEntity<List<AuditoriaCajaDTO>> obtenerAuditoriaGerencial(
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE_TIME) LocalDateTime inicio,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE_TIME) LocalDateTime fin) {
        
        if (inicio == null) inicio = LocalDateTime.now().minusDays(30);
        if (fin == null) fin = LocalDateTime.now();

        List<AuditoriaCajaDTO> reporte = cajaTurnoRepository.obtenerReporteAuditoria(inicio, fin);
        return ResponseEntity.ok(reporte);
    }

    @GetMapping("/movimientos")
    public ResponseEntity<List<Map<String, Object>>> obtenerExtractoMovimientos() {
        List<Map<String, Object>> movimientos = new ArrayList<>();

        List<CajaTurno> turnos = cajaTurnoRepository.findAll();
        for (CajaTurno t : turnos) {
            String asesor = t.getUsuario() != null ? t.getUsuario().getNombreCompleto() : "S/N";
            String agencia = t.getAgencia() != null ? t.getAgencia().getNombreAgencia() : "Sede Principal";

            Map<String, Object> apertura = new HashMap<>();
            apertura.put("tipo", "APERTURA");
            apertura.put("monto", t.getSaldoInicial());
            apertura.put("hora", t.getFechaApertura());
            apertura.put("usuario", asesor);
            apertura.put("agencia", agencia);
            movimientos.add(apertura);

            if (t.getFechaCierre() != null) {
                Map<String, Object> cierre = new HashMap<>();
                cierre.put("tipo", "CIERRE");
                cierre.put("monto", t.getSaldoFinal().add(t.getDiferencia() != null ? t.getDiferencia() : java.math.BigDecimal.ZERO));
                cierre.put("hora", t.getFechaCierre());
                cierre.put("usuario", asesor);
                cierre.put("agencia", agencia);
                movimientos.add(cierre);
            }
        }

        List<Venta> ventas = ventaRepository.findAll();
        for (Venta v : ventas) {
            if ("COMPLETADA".equals(v.getEstado())) {
                String asesor = v.getUsuarioVendedor() != null ? v.getUsuarioVendedor().getNombreCompleto() : "S/N";
                String agencia = (v.getUsuarioVendedor() != null && v.getUsuarioVendedor().getAgencia() != null) ? v.getUsuarioVendedor().getAgencia().getNombreAgencia() : "Sede Principal";

                Map<String, Object> ventaMap = new HashMap<>();
                ventaMap.put("tipo", "VENTA");
                ventaMap.put("monto", v.getTotal());
                ventaMap.put("hora", v.getFechaVenta());
                ventaMap.put("usuario", asesor);
                ventaMap.put("agencia", agencia);
                movimientos.add(ventaMap);
            }
        }

        List<Cancelacion> cancelaciones = cancelacionRepository.findAll();
        for (Cancelacion c : cancelaciones) {
            String asesor = c.getUsuarioAutoriza() != null ? c.getUsuarioAutoriza().getNombreCompleto() : "S/N";
            String agencia = (c.getUsuarioAutoriza() != null && c.getUsuarioAutoriza().getAgencia() != null) ? c.getUsuarioAutoriza().getAgencia().getNombreAgencia() : "Sede Principal";

            Map<String, Object> devMap = new HashMap<>();
            devMap.put("tipo", "DEVOLUCIÓN");
            devMap.put("monto", c.getMontoDevuelto().negate());
            devMap.put("hora", c.getFechaCancelacion());
            devMap.put("usuario", asesor);
            devMap.put("agencia", agencia);
            movimientos.add(devMap);
        }

        movimientos.sort((m1, m2) -> {
            java.time.LocalDateTime h1 = (java.time.LocalDateTime) m1.get("hora");
            java.time.LocalDateTime h2 = (java.time.LocalDateTime) m2.get("hora");
            if (h1 == null) return 1;
            if (h2 == null) return -1;
            return h2.compareTo(h1);
        });

        return ResponseEntity.ok(movimientos);
    }
}
