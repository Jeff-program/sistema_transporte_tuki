package com.tuki.sistema.controller;

import com.tuki.sistema.dto.VentaDTO;
import com.tuki.sistema.service.UsuarioService;
import com.tuki.sistema.service.VentaService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/ventas")
public class VentaController {

    @Autowired private VentaService ventaService;
    @Autowired private UsuarioService usuarioService;

    @PostMapping("/grupal")
    public ResponseEntity<?> registrarVentaGrupal(@RequestBody VentaDTO dto) {
        return ResponseEntity.ok(ventaService.registrarVentaGrupal(dto, usuarioService.obtenerIdUsuarioAutenticado()));
    }

    @GetMapping("/viajes/{idViaje}/ocupados")
    public ResponseEntity<?> getAsientosOcupados(
            @PathVariable Long idViaje,
            @RequestParam Long origen,
            @RequestParam Long destino) {
        return ResponseEntity.ok(ventaService.obtenerEstadoAsientos(idViaje, origen, destino));
    }

    @GetMapping("/viajes/{idViaje}/manifiesto")
    public ResponseEntity<?> getManifiesto(@PathVariable Long idViaje) {
        return ResponseEntity.ok(ventaService.obtenerManifiesto(idViaje));
    }

    @GetMapping("/detalle/{idViaje}/{idVenta}")
    public ResponseEntity<?> getDetalleVenta(@PathVariable Long idViaje, @PathVariable Long idVenta) {
        return ResponseEntity.ok(ventaService.obtenerDetalleVenta(idVenta));
    }

    @DeleteMapping("/viajes/{idViaje}/asientos/{asiento}")
    public ResponseEntity<?> anularVenta(@PathVariable Long idViaje, @PathVariable String asiento) {
        return ResponseEntity.ok(ventaService.anularVentaConMensaje(idViaje, asiento, usuarioService.obtenerUsuarioAutenticado()));
    }

    @GetMapping("/mis-ventas-turno")
    public ResponseEntity<?> obtenerVentasDelTurnoActual(@RequestParam(required = false) Long idUsuario) {
        return ResponseEntity.ok(ventaService.obtenerVentasDelTurnoActual(usuarioService.obtenerIdUsuarioAutenticado()));
    }
}
