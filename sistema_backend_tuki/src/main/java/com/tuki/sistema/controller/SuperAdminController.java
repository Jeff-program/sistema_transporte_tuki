package com.tuki.sistema.controller;

import com.tuki.sistema.service.SistemaService;
import org.springframework.beans.factory.annotation.Autowired;

import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

@RestController
@RequestMapping("/api/superadmin")
@PreAuthorize("hasRole('SUPER_ADMIN')")
public class SuperAdminController {

    @Autowired
    private SistemaService sistemaService;

    @PostMapping("/mantenimiento/toggle")
    public ResponseEntity<?> toggleMantenimiento() {
        boolean actual = sistemaService.isEnMantenimiento();
        sistemaService.setEnMantenimiento(!actual);
        return ResponseEntity.ok("Mantenimiento " + (!actual ? "ACTIVADO" : "DESACTIVADO"));
    }

    @GetMapping("/mantenimiento/estado")
    public ResponseEntity<?> getEstadoMantenimiento() {
        return ResponseEntity.ok(Map.of("mantenimiento", sistemaService.isEnMantenimiento()));
    }
}
