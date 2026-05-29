package com.tuki.sistema.controller;

import com.tuki.sistema.entity.Embarcacion;
import com.tuki.sistema.service.EmbarcacionService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
@RestController
@RequestMapping("/api/embarcaciones")
public class EmbarcacionController {

    @Autowired
    private EmbarcacionService service;

    @GetMapping
    public List<Embarcacion> listar() {
        return service.listarTodas();
    }

    @GetMapping("/operativas")
    public List<Embarcacion> listarOperativas() {
        return service.listarOperativas();
    }

    @PostMapping
    public ResponseEntity<?> guardar(@RequestBody Embarcacion nave) {
        return ResponseEntity.ok(service.guardar(nave));
    }

    @PutMapping("/{id}/mantenimiento")
    public ResponseEntity<?> toggleMantenimiento(@PathVariable Long id) {
        service.toggleMantenimiento(id);
        return ResponseEntity.ok().build();
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<?> eliminar(@PathVariable Long id) {
        return ResponseEntity.ok(service.eliminarConMensaje(id));
    }
}
