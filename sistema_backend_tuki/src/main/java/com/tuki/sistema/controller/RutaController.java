package com.tuki.sistema.controller;

import com.tuki.sistema.entity.Ruta;
import com.tuki.sistema.service.RutaService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
@RestController
@RequestMapping("/api/rutas")
public class RutaController {

    @Autowired
    private RutaService service;

    @GetMapping
    public List<Ruta> listar() {
        return service.listarTodas();
    }

    @GetMapping("/activas")
    public List<Ruta> listarActivas() {
        return service.listarActivas();
    }

    @PostMapping
    public ResponseEntity<?> guardar(@RequestBody Ruta ruta) {
        return ResponseEntity.ok(service.guardar(ruta));
    }

    @PutMapping("/{id}/estado")
    public ResponseEntity<?> toggleEstado(@PathVariable Long id) {
        service.toggleEstado(id);
        return ResponseEntity.ok().build();
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<?> eliminar(@PathVariable Long id) {
        return ResponseEntity.ok(service.eliminarConMensaje(id));
    }
}
