package com.tuki.sistema.controller;

import com.tuki.sistema.dto.AgenciaDTO;
import com.tuki.sistema.entity.Agencia;
import com.tuki.sistema.repository.AgenciaRepository;
import com.tuki.sistema.repository.PuertoRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

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
    public ResponseEntity<?> actualizar(@PathVariable Long id, @RequestBody Map<String, Object> payload) {
        try {
            Agencia agencia = agenciaRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Agencia no encontrada"));

            if (payload.get("nombreAgencia") != null) {
                agencia.setNombreAgencia(payload.get("nombreAgencia").toString());
            }
            if (payload.get("direccion") != null) {
                agencia.setDireccion(payload.get("direccion").toString());
            }
            if (payload.get("telefono") != null) {
                agencia.setTelefono(payload.get("telefono").toString());
            }

            if (payload.get("idPuerto") != null && !payload.get("idPuerto").toString().trim().isEmpty()) {
                Long idPuerto = Long.valueOf(payload.get("idPuerto").toString());
                agencia.setPuerto(puertoRepository.findById(idPuerto)
                    .orElseThrow(() -> new RuntimeException("El puerto seleccionado no existe.")));
            } 
            else if (payload.get("puerto") != null) {
                Map<String, Object> puertoData = (Map<String, Object>) payload.get("puerto");
                if (puertoData.get("idPuerto") != null) {
                    Long idPuerto = Long.valueOf(puertoData.get("idPuerto").toString());
                    agencia.setPuerto(puertoRepository.findById(idPuerto)
                        .orElseThrow(() -> new RuntimeException("El puerto seleccionado no existe.")));
                }
            }
            return ResponseEntity.ok(agenciaRepository.save(agencia));
            
        } catch (Exception e) {
            return ResponseEntity.badRequest().body("Error al actualizar: " + e.getMessage());
        }
    }

    @PutMapping("/{id}/estado")
    public ResponseEntity<?> cambiarEstado(@PathVariable Long id) {
        Agencia agencia = agenciaRepository.findById(id).orElseThrow();
        agencia.setEstado("ACTIVO".equals(agencia.getEstado()) ? "INACTIVO" : "ACTIVO");
        return ResponseEntity.ok(agenciaRepository.save(agencia));
    }
}