package com.tuki.sistema.controller;

import com.tuki.sistema.entity.Puerto;
import com.tuki.sistema.service.PuertoService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
@RestController
@RequestMapping("/api/puertos")
public class PuertoController {

    @Autowired
    private PuertoService service; 

    @GetMapping
    public List<Puerto> listar() {
        return service.listarTodos();
    }

    @GetMapping("/activos")
    public List<Puerto> listarActivos() {
        return service.listarActivos();
    }

    @PostMapping
    public ResponseEntity<?> guardar(@RequestBody Puerto puerto) {
        return ResponseEntity.ok(service.guardar(puerto));
    }
    
    @PutMapping("/{id}/estado")
    public ResponseEntity<?> toggleEstado(@PathVariable Long id) {
        return ResponseEntity.ok(service.toggleEstado(id));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<?> eliminar(@PathVariable Long id) {
        return ResponseEntity.ok(service.eliminarConMensaje(id));
    }

    @GetMapping("/rio/{idRio}")
    public List<Puerto> listarPorRio(@PathVariable Long idRio) {
        return service.listarActivosPorRioOPrincipal(idRio);
    }
}
