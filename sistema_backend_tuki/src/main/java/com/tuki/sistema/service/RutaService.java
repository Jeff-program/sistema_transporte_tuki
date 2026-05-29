package com.tuki.sistema.service;

import com.tuki.sistema.dto.MensajeResponse;
import com.tuki.sistema.entity.Ruta;
import com.tuki.sistema.repository.RutaRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

import java.util.List;
import java.util.Objects;
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
        validarRuta(ruta);

        String nombreRuta = ruta.getNombreRuta() != null ? ruta.getNombreRuta().trim() : "";
        ruta.setNombreRuta(nombreRuta);

        boolean existeMismoTrayecto = repository.findByOrigen_IdPuertoAndDestino_IdPuertoAndEstadoNot(
                ruta.getOrigen().getIdPuerto(),
                ruta.getDestino().getIdPuerto(),
                "ELIMINADO"
            ).stream()
            .anyMatch(r -> !Objects.equals(r.getIdRuta(), ruta.getIdRuta()));

        if (existeMismoTrayecto) {
            throw new RuntimeException("Ya existe una ruta registrada con el mismo puerto de origen y destino.");
        }
        
        return repository.save(ruta);
    }

    private void validarRuta(Ruta ruta) {
        if (ruta.getNombreRuta() == null || ruta.getNombreRuta().trim().isEmpty()) {
            throw new RuntimeException("El nombre de la ruta es obligatorio.");
        }
        if (ruta.getOrigen() == null || ruta.getOrigen().getIdPuerto() == null) {
            throw new RuntimeException("El puerto de origen es obligatorio.");
        }
        if (ruta.getDestino() == null || ruta.getDestino().getIdPuerto() == null) {
            throw new RuntimeException("El puerto de destino es obligatorio.");
        }
        if (Objects.equals(ruta.getOrigen().getIdPuerto(), ruta.getDestino().getIdPuerto())) {
            throw new RuntimeException("El origen y el destino no pueden ser el mismo puerto.");
        }
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

    public MensajeResponse eliminarConMensaje(Long id) {
        eliminar(id);
        return new MensajeResponse("Ruta eliminada correctamente");
    }
}
