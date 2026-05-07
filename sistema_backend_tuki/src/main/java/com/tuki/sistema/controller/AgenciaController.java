package com.tuki.sistema.controller;

import com.tuki.sistema.dto.AgenciaDTO;
import com.tuki.sistema.entity.Agencia;
import com.tuki.sistema.repository.AgenciaRepository;
import com.tuki.sistema.repository.PuertoRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/agencias")
public class AgenciaController {

    @Autowired private AgenciaRepository agenciaRepository;
    @Autowired private PuertoRepository puertoRepository;

    @GetMapping
    public List<Agencia> listarTodas() {
        return agenciaRepository.findAll();
    }

    @GetMapping("/activas")
    public List<Agencia> listarActivas() {
        return agenciaRepository.findByEstado("ACTIVO");
    }

    @GetMapping("/puerto/{idPuerto}")
    public List<Agencia> listarPorPuerto(@PathVariable Long idPuerto) {
        return agenciaRepository.findByPuerto_IdPuertoAndEstado(idPuerto, "ACTIVO");
    }

    @PostMapping
    public Agencia guardar(@RequestBody AgenciaDTO dto) {
        Agencia agencia = new Agencia();
        
        agencia.setNombreAgencia(dto.getNombreAgencia()); 
        agencia.setDireccion(dto.getDireccion());
        agencia.setTelefono(dto.getTelefono());
        
        if (dto.getPuerto() != null && dto.getPuerto().getIdPuerto() != null) {
            agencia.setPuerto(puertoRepository.findById(dto.getPuerto().getIdPuerto())
                .orElseThrow(() -> new RuntimeException("El puerto seleccionado no existe.")));
        } else {
            throw new RuntimeException("El puerto es obligatorio para crear una agencia.");
        }
        
        return agenciaRepository.save(agencia);
    }
    
    @PutMapping("/{id}")
    public Agencia actualizar(@PathVariable Long id, @RequestBody Agencia agencia) {
        agencia.setIdAgencia(id);
        return agenciaRepository.save(agencia);
    }

    @PutMapping("/{id}/estado")
    public ResponseEntity<?> cambiarEstado(@PathVariable Long id) {
        Agencia agencia = agenciaRepository.findById(id).orElseThrow();
        agencia.setEstado("ACTIVO".equals(agencia.getEstado()) ? "INACTIVO" : "ACTIVO");
        return ResponseEntity.ok(agenciaRepository.save(agencia));
    }
}