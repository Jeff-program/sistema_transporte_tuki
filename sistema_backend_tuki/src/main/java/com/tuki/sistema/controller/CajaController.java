package com.tuki.sistema.controller;

import com.tuki.sistema.entity.CajaTurno;
import com.tuki.sistema.service.CajaService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.math.BigDecimal;
import java.util.Map;

@RestController
@RequestMapping("/api/caja")
@CrossOrigin(origins = "*")
public class CajaController {

    @Autowired
    private CajaService cajaService;

    @GetMapping("/activa/{idUsuario}")
    public ResponseEntity<?> obtenerCajaActiva(@PathVariable Long idUsuario) {
        try {
            CajaTurno caja = cajaService.obtenerCajaActiva(idUsuario);
            if (caja != null) {
                return ResponseEntity.ok(Map.of("activa", true, "caja", caja));
            }
            return ResponseEntity.ok(Map.of("activa", false));
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(Map.of("error", e.getMessage()));
        }
    }

    @PostMapping("/abrir/{idUsuario}")
    public ResponseEntity<?> abrirCaja(@PathVariable Long idUsuario, @RequestBody Map<String, Object> payload) {
        try {
            BigDecimal montoInicial = BigDecimal.ZERO;
            if (payload.containsKey("montoInicial") && payload.get("montoInicial") != null) {
                String montoStr = payload.get("montoInicial").toString().trim();
                if (!montoStr.isEmpty()) {
                    montoInicial = new BigDecimal(montoStr);
                }
            }
            
            return ResponseEntity.ok(cajaService.abrirCaja(idUsuario, montoInicial));
        } catch (NumberFormatException e) {
            return ResponseEntity.badRequest().body(Map.of("error", "El monto ingresado no es válido."));
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(Map.of("error", e.getMessage()));
        }
    }

    @PostMapping("/cerrar")
    public ResponseEntity<?> cerrarCaja(
            @RequestParam Long idUsuario, 
            @RequestParam(required = false) String montoDeclaradoEfectivo) {
        try {
            BigDecimal montoEfectivo = BigDecimal.ZERO;
            if (montoDeclaradoEfectivo != null && !montoDeclaradoEfectivo.trim().isEmpty()) {
                montoEfectivo = new BigDecimal(montoDeclaradoEfectivo.trim());
            }

            return ResponseEntity.ok(cajaService.cerrarCaja(idUsuario, montoEfectivo));
        } catch (NumberFormatException e) {
            return ResponseEntity.badRequest().body(Map.of("error", "El monto ingresado no es válido."));
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(Map.of("error", e.getMessage()));
        }
    }
}