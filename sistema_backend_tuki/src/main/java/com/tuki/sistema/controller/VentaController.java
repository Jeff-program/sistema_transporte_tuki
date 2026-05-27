package com.tuki.sistema.controller;

import com.tuki.sistema.dto.VentaDTO;
import com.tuki.sistema.entity.Usuario;
import com.tuki.sistema.entity.Venta;
import com.tuki.sistema.repository.UsuarioRepository; // <-- NECESITAMOS ESTO
import com.tuki.sistema.service.VentaService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/ventas")
@CrossOrigin(origins = "*") 
public class VentaController {

    @Autowired
    private VentaService ventaService;

    @Autowired
    private UsuarioRepository usuarioRepository; // <-- INYECTAMOS EL REPOSITORIO

    @PostMapping("/grupal")
    public ResponseEntity<?> registrarVentaGrupal(@RequestBody VentaDTO dto) {
        try {
            String emailLogueado = SecurityContextHolder.getContext().getAuthentication().getName();
            
            Usuario usuarioReal = usuarioRepository.findByEmail(emailLogueado)
                    .orElseThrow(() -> new RuntimeException("Usuario autenticado no encontrado en el sistema"));
            Map<String, Object> response = ventaService.registrarVentaGrupal(dto, usuarioReal.getIdUsuario());
            
            return ResponseEntity.ok(response);
        } catch (Exception e) {
            return ResponseEntity.badRequest().body("Error en la venta: " + e.getMessage());
        }
    }

    @GetMapping("/viajes/{idViaje}/ocupados")
    public ResponseEntity<?> getAsientosOcupados(
            @PathVariable Long idViaje,
            @RequestParam Long origen,
            @RequestParam Long destino) {
        try {
            Map<String, String> mapa = ventaService.obtenerEstadoAsientos(idViaje, origen, destino);
            return ResponseEntity.ok(mapa);
        } catch (Exception e) {
            String errorMsg = e.getMessage() != null ? e.getMessage() : "Error interno (Ventas antiguas detectadas)";
            return ResponseEntity.status(500).body(Map.of("error", errorMsg));
        }
    }
    
    @GetMapping("/viajes/{idViaje}/manifiesto")
    public ResponseEntity<?> getManifiesto(@PathVariable Long idViaje) {
        try {
            return ResponseEntity.ok(ventaService.obtenerManifiesto(idViaje));
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(Map.of("error", e.getMessage()));
        }
    }

    @GetMapping("/detalle/{idViaje}/{idVenta}")
    public ResponseEntity<?> getDetalleVenta(@PathVariable Long idViaje, @PathVariable Long idVenta) {
        try {
            return ResponseEntity.ok(ventaService.obtenerDetalleVenta(idVenta));
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(Map.of("error", e.getMessage()));
        }
    }

    @DeleteMapping("/viajes/{idViaje}/asientos/{asiento}")
    public ResponseEntity<?> anularVenta(@PathVariable Long idViaje, @PathVariable String asiento) {
        try {
            String emailLogueado = SecurityContextHolder.getContext().getAuthentication().getName();
            Usuario usuarioReal = usuarioRepository.findByEmail(emailLogueado)
                    .orElseThrow(() -> new RuntimeException("Usuario autenticado no encontrado en el sistema"));

            ventaService.anularVenta(idViaje, asiento, usuarioReal);
            return ResponseEntity.ok(Map.of("mensaje", "Venta anulada correctamente"));
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(Map.of("error", e.getMessage()));
        }
    }

    @GetMapping("/mis-ventas-turno")
    public ResponseEntity<?> obtenerVentasDelTurnoActual(@RequestParam Long idUsuario) {
        try {
            // El servicio ahora retorna una lista limpia y sin bucles infinitos
            return ResponseEntity.ok(ventaService.obtenerVentasDelTurnoActual(idUsuario));
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(Map.of("error", e.getMessage()));
        }
    }
}