package com.tuki.sistema.controller;

import com.tuki.sistema.entity.CajaTurno;
import com.tuki.sistema.entity.Usuario;
import com.tuki.sistema.repository.UsuarioRepository;
import com.tuki.sistema.service.CajaService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.web.bind.annotation.*;

import java.math.BigDecimal;
import java.util.Map;

@RestController
@RequestMapping("/api/caja")
@CrossOrigin(origins = "*")
public class CajaController {

    @Autowired
    private CajaService cajaService;

    @Autowired
    private UsuarioRepository usuarioRepository;

    private Long idUsuarioAutenticado() {
        String email = SecurityContextHolder.getContext().getAuthentication().getName();
        Usuario usuario = usuarioRepository.findByEmail(email)
                .orElseThrow(() -> new RuntimeException("Usuario autenticado no encontrado."));
        return usuario.getIdUsuario();
    }

    @GetMapping("/activa/{idUsuario}")
    public ResponseEntity<?> obtenerCajaActiva(@PathVariable Long idUsuario) {
        try {
            CajaTurno caja = cajaService.obtenerCajaActiva(idUsuarioAutenticado());
            if (caja != null) {
                // 🔥 CAMBIO CLAVE: Devolvemos la caja directamente sin envolverla en "Map.of"
                return ResponseEntity.ok(caja);
            }
            // Si es null, enviamos un estado cerrado para que React lo entienda
            return ResponseEntity.ok(Map.of("estado", "INACTIVO"));
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
            
            // Extraer la observación si viene desde el frontend
            String obsApertura = payload.containsKey("observacionesApertura") && payload.get("observacionesApertura") != null ? payload.get("observacionesApertura").toString() : null;

            return ResponseEntity.ok(cajaService.abrirCaja(idUsuarioAutenticado(), montoInicial, obsApertura));
        } catch (NumberFormatException e) {
            return ResponseEntity.badRequest().body(Map.of("error", "El monto ingresado no es válido."));
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(Map.of("error", e.getMessage()));
        }
    }

    @PostMapping("/cerrar")
    public ResponseEntity<?> cerrarCaja(
            @RequestParam(required = false) Long idUsuario,
            @RequestParam(required = false) String montoDeclaradoEfectivo,
            @RequestParam(required = false) String observacionesCierre) {
        try {
            BigDecimal montoEfectivo = BigDecimal.ZERO;
            if (montoDeclaradoEfectivo != null && !montoDeclaradoEfectivo.trim().isEmpty()) {
                montoEfectivo = new BigDecimal(montoDeclaradoEfectivo.trim());
            }
            // Retorna todo el arqueo multimetodo al Frontend
            return ResponseEntity.ok(cajaService.cerrarCaja(idUsuarioAutenticado(), montoEfectivo, observacionesCierre));
        } catch (NumberFormatException e) {
            return ResponseEntity.badRequest().body(Map.of("error", "El monto ingresado no es válido."));
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(Map.of("error", e.getMessage()));
        }
    }

    @GetMapping("/resumen-movimientos")
    public ResponseEntity<?> obtenerResumenMovimientos(@RequestParam Long idUsuario) {
        try {
            return ResponseEntity.ok(cajaService.obtenerResumenMovimientos(idUsuarioAutenticado()));
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(Map.of("error", e.getMessage()));
        }
    }

    @PostMapping("/egreso")
    public ResponseEntity<?> registrarEgreso(@RequestParam Long idUsuario, @RequestBody Map<String, Object> payload) {
        try {
            String concepto = payload.get("concepto").toString();
            BigDecimal monto = new BigDecimal(payload.get("monto").toString());
            return ResponseEntity.ok(cajaService.registrarEgreso(idUsuarioAutenticado(), concepto, monto));
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(Map.of("error", e.getMessage()));
        }
    }
}
