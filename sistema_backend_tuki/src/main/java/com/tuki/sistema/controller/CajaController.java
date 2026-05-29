package com.tuki.sistema.controller;

import com.tuki.sistema.dto.AbrirCajaRequest;
import com.tuki.sistema.dto.CerrarCajaRequest;
import com.tuki.sistema.dto.EgresoRequest;
import com.tuki.sistema.service.CajaService;
import com.tuki.sistema.service.UsuarioService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.math.BigDecimal;

@RestController
@RequestMapping("/api/caja")
public class CajaController {

    @Autowired private CajaService cajaService;
    @Autowired private UsuarioService usuarioService;

    @GetMapping("/activa/{idUsuario}")
    public ResponseEntity<?> obtenerCajaActiva(@PathVariable Long idUsuario) {
        return ResponseEntity.ok(cajaService.obtenerCajaActivaRespuesta(usuarioService.obtenerIdUsuarioAutenticado()));
    }

    @PostMapping("/abrir/{idUsuario}")
    public ResponseEntity<?> abrirCaja(@PathVariable Long idUsuario, @RequestBody(required = false) AbrirCajaRequest request) {
        return ResponseEntity.ok(cajaService.abrirCaja(usuarioService.obtenerIdUsuarioAutenticado(), request));
    }

    @PostMapping("/cerrar")
    public ResponseEntity<?> cerrarCaja(
            @RequestParam(required = false) Long idUsuario,
            @RequestParam(required = false) BigDecimal montoDeclaradoEfectivo,
            @RequestParam(required = false) String observacionesCierre,
            @RequestBody(required = false) CerrarCajaRequest request) {
        return ResponseEntity.ok(cajaService.cerrarCaja(
                usuarioService.obtenerIdUsuarioAutenticado(),
                montoDeclaradoEfectivo,
                observacionesCierre,
                request
        ));
    }

    @GetMapping("/resumen-movimientos")
    public ResponseEntity<?> obtenerResumenMovimientos(@RequestParam(required = false) Long idUsuario) {
        return ResponseEntity.ok(cajaService.obtenerResumenMovimientos(usuarioService.obtenerIdUsuarioAutenticado()));
    }

    @PostMapping("/egreso")
    public ResponseEntity<?> registrarEgreso(@RequestParam(required = false) Long idUsuario, @RequestBody(required = false) EgresoRequest request) {
        return ResponseEntity.ok(cajaService.registrarEgreso(usuarioService.obtenerIdUsuarioAutenticado(), request));
    }
}
