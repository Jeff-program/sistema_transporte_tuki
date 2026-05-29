package com.tuki.sistema.controller;

import com.tuki.sistema.dto.AgenciaDTO;
import com.tuki.sistema.dto.AgenciaUpdateRequest;
import com.tuki.sistema.entity.Agencia;
import com.tuki.sistema.service.AgenciaService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/agencias")
public class AgenciaController {

    @Autowired private AgenciaService agenciaService;

    @GetMapping
    public List<Agencia> listarTodas() {
        return agenciaService.listarTodas();
    }

    @GetMapping("/activas")
    public List<Agencia> listarActivas() {
        return agenciaService.listarActivas();
    }

    @GetMapping("/puerto/{idPuerto}")
    public List<Agencia> listarPorPuerto(@PathVariable Long idPuerto) {
        return agenciaService.listarPorPuerto(idPuerto);
    }

    @PostMapping
    public Agencia guardar(@RequestBody AgenciaDTO dto) {
        return agenciaService.guardar(dto);
    }
    
    @PutMapping("/{id}")
    public ResponseEntity<?> actualizar(@PathVariable Long id, @RequestBody AgenciaUpdateRequest request) {
        return ResponseEntity.ok(agenciaService.actualizar(id, request));
    }

    @PutMapping("/{id}/estado")
    public ResponseEntity<?> cambiarEstado(@PathVariable Long id) {
        return ResponseEntity.ok(agenciaService.cambiarEstado(id));
    }
}
