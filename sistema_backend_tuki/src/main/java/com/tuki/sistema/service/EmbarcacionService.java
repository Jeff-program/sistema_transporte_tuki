package com.tuki.sistema.service;

import com.tuki.sistema.dto.MensajeResponse;
import com.tuki.sistema.entity.Embarcacion;
import com.tuki.sistema.entity.Viaje;
import com.tuki.sistema.repository.EmbarcacionRepository;
import com.tuki.sistema.repository.ViajeRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

import java.util.List;
import java.util.stream.Collectors;

@Service
public class EmbarcacionService {

    @Autowired
    private EmbarcacionRepository repository;

    @Autowired
    private ViajeRepository viajeRepository;

    public List<Embarcacion> listarTodas() {
        return repository.findAll().stream()
                .filter(e -> !"ELIMINADO".equals(e.getEstado()))
                .collect(Collectors.toList());
    }

    public List<Embarcacion> listarOperativas() {
        return repository.findByEstado("OPERATIVO");
    }

    public Embarcacion guardar(Embarcacion nave) {
        
        if (nave.getMatricula() != null) {
            nave.setMatricula(nave.getMatricula().trim().toUpperCase());
        }
        if (nave.getNombre() != null) {
            nave.setNombre(nave.getNombre().trim());
        }

        if (nave.getIdEmbarcacion() == null) {
            
            repository.findByMatriculaAndEstadoNot(nave.getMatricula(), "ELIMINADO")
                    .ifPresent(e -> { throw new RuntimeException("La matrícula ya está registrada."); });
            
            repository.findByNombreIgnoreCaseAndEstadoNot(nave.getNombre(), "ELIMINADO")
                    .ifPresent(e -> { throw new RuntimeException("El nombre de la embarcación ya existe."); });
                    
        } else {
            repository.findByMatriculaAndEstadoNot(nave.getMatricula(), "ELIMINADO")
                    .ifPresent(e -> { 
                        if (!e.getIdEmbarcacion().equals(nave.getIdEmbarcacion())) {
                            throw new RuntimeException("La matrícula ya pertenece a otra embarcación."); 
                        }
                    });

            repository.findByNombreIgnoreCaseAndEstadoNot(nave.getNombre(), "ELIMINADO")
                    .ifPresent(e -> { 
                        if (!e.getIdEmbarcacion().equals(nave.getIdEmbarcacion())) {
                            throw new RuntimeException("El nombre ya pertenece a otra embarcación."); 
                        }
                    });
        }

        return repository.save(nave);
    }

    public void toggleMantenimiento(Long id) {
        Embarcacion e = repository.findById(id).orElseThrow();
        e.setEstado("OPERATIVO".equals(e.getEstado()) ? "MANTENIMIENTO" : "OPERATIVO");
        repository.save(e);
    }

    public void eliminar(Long id) {
        Embarcacion e = repository.findById(id).orElseThrow();
        e.setEstado("ELIMINADO");
        
        e.setMatricula(e.getMatricula() + "-DEL-" + id);
        e.setNombre(e.getNombre() + " (BAJA)");
        
        repository.save(e);

        for (Viaje viaje : viajeRepository.findByEmbarcacion_IdEmbarcacionAndEstado(id, "PROGRAMADO")) {
            viaje.setEstado("CANCELADO");
            viajeRepository.save(viaje);
        }
    }

    public MensajeResponse eliminarConMensaje(Long id) {
        eliminar(id);
        return new MensajeResponse("Nave eliminada correctamente");
    }
}
