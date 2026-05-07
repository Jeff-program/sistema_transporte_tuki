package com.tuki.sistema.service;

import com.tuki.sistema.entity.Ruta;
import com.tuki.sistema.repository.RutaRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

import java.util.List;
import java.util.stream.Collectors;

@Service
public class RutaService {

    @Autowired
    private RutaRepository repository;

    public List<Ruta> listarTodas() {
        return repository.findAll().stream()
                .filter(r -> !"ELIMINADO".equals(r.getEstado()))
                .collect(Collectors.toList());
    }

    public List<Ruta> listarActivas() {
        return repository.findByEstado("ACTIVO");
    }

    public Ruta guardar(Ruta ruta) {
        if (ruta.getIdRuta() == null) {
            repository.findByNombreRutaIgnoreCaseAndEstadoNot(ruta.getNombreRuta().trim(), "ELIMINADO")
                .ifPresent(r -> { throw new RuntimeException("Ya existe una ruta con el nombre: " + ruta.getNombreRuta()); });
        }
        
        return repository.save(ruta);
    }

    public void toggleEstado(Long id) {
        Ruta r = repository.findById(id).orElseThrow();
        r.setEstado("ACTIVO".equals(r.getEstado()) ? "INACTIVO" : "ACTIVO");
        repository.save(r);
    }

    public void eliminar(Long id) {
        Ruta r = repository.findById(id).orElseThrow();
        r.setEstado("ELIMINADO");
        repository.save(r);
    }
}