package com.tuki.sistema.controller;

import com.tuki.sistema.entity.Rio;
import com.tuki.sistema.service.RioService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/rios")
public class RioController {

    @Autowired
    private RioService rioService;

    @GetMapping
    public List<Rio> listarTodos() {
        return rioService.listarTodos();
    }

    @GetMapping("/activos")
    public List<Rio> listarActivos() {
        return rioService.listarActivos();
    }

    @PostMapping
    public Rio guardar(@RequestBody Rio rio) {
        return rioService.guardar(rio);
    }

    @PutMapping("/{id}")
    public Rio actualizar(@PathVariable Long id, @RequestBody Rio rio) {
        return rioService.actualizar(id, rio);
    }

    @PutMapping("/{id}/estado")
    public ResponseEntity<?> cambiarEstado(@PathVariable Long id) {
        rioService.cambiarEstado(id);
        return ResponseEntity.ok().build();
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<?> eliminar(@PathVariable Long id) {
        rioService.eliminar(id);
        return ResponseEntity.ok().build();
    }
}