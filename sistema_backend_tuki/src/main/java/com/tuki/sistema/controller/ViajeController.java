package com.tuki.sistema.controller;

import com.tuki.sistema.dto.ViajeDTO;
import com.tuki.sistema.entity.Viaje;
import com.tuki.sistema.service.ViajeService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/viajes")
public class ViajeController {

    @Autowired
    private ViajeService viajeService;

    @GetMapping
    public ResponseEntity<List<ViajeDTO>> listar() {
        return ResponseEntity.ok(viajeService.listarTodos());
    }

    @GetMapping("/programados")
    public ResponseEntity<List<ViajeDTO>> listarProgramados() {
        return ResponseEntity.ok(viajeService.listarProgramados());
    }

    @PostMapping
    public ResponseEntity<?> guardar(@RequestBody Viaje viaje) {
        return ResponseEntity.ok(viajeService.guardar(viaje));
    }

    @PutMapping("/{id}/cancelar")
    public ResponseEntity<?> cancelarViaje(@PathVariable Long id) {
        viajeService.cancelarViaje(id);
        return ResponseEntity.ok().build();
    }
}
