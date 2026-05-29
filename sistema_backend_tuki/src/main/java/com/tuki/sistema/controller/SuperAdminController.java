package com.tuki.sistema.controller;

import com.tuki.sistema.service.SuperAdminService;
import org.springframework.beans.factory.annotation.Autowired;

import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/superadmin")
@PreAuthorize("hasRole('SUPER_ADMIN')")
public class SuperAdminController {

    @Autowired
    private SuperAdminService superAdminService;

    @PostMapping("/mantenimiento/toggle")
    public ResponseEntity<?> toggleMantenimiento() {
        return ResponseEntity.ok(superAdminService.alternarMantenimiento());
    }

    @GetMapping("/mantenimiento/estado")
    public ResponseEntity<?> getEstadoMantenimiento() {
        return ResponseEntity.ok(superAdminService.obtenerEstadoMantenimiento());
    }
}
