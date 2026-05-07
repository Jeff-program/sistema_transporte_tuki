package com.tuki.sistema.controller;

import com.tuki.sistema.entity.Puerto;
import com.tuki.sistema.repository.PuertoRepository;
import com.tuki.sistema.service.PuertoService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/puertos")
public class PuertoController {

    @Autowired
    private PuertoService service; 

    @Autowired
    private PuertoRepository puertoRepository;

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
        service.eliminar(id);
        return ResponseEntity.ok(Map.of("mensaje", "Puerto eliminado"));
    }

    @GetMapping("/rio/{idRio}")
    public List<Puerto> listarPorRio(@PathVariable Long idRio) {
        return puertoRepository.findByRio_IdRioOrEsPrincipalTrueAndEstado(idRio, "ACTIVO");
    }
}