package com.tuki.sistema.service;

import com.tuki.sistema.dto.MensajeResponse;
import com.tuki.sistema.entity.Puerto;
import com.tuki.sistema.entity.Ruta;
import com.tuki.sistema.repository.PuertoRepository;
import com.tuki.sistema.repository.RutaRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

import java.util.List;
import java.util.Objects;
import java.util.stream.Collectors;

@Service
public class RutaService {

    @Autowired private RutaRepository repository;
    @Autowired private PuertoRepository puertoRepository;

    public List<Ruta> listarTodas() {
        return repository.findAll().stream()
                .filter(r -> !"ELIMINADO".equals(r.getEstado()))
                .filter(this::tienePuertosUtilizables)
                .collect(Collectors.toList());
    }

    public List<Ruta> listarActivas() {
        return repository.findByEstado("ACTIVO").stream()
                .filter(this::tienePuertosUtilizables)
                .collect(Collectors.toList());
    }

    public Ruta guardar(Ruta ruta) {
        validarRuta(ruta);

        String nombreRuta = ruta.getNombreRuta().trim().replaceAll("\\s+", " ");
        ruta.setNombreRuta(nombreRuta);

        Puerto origen = puertoRepository.findById(ruta.getOrigen().getIdPuerto())
                .orElseThrow(() -> new RuntimeException("El puerto de origen no existe."));
        Puerto destino = puertoRepository.findById(ruta.getDestino().getIdPuerto())
                .orElseThrow(() -> new RuntimeException("El puerto de destino no existe."));

        validarPuertoActivo(origen, "origen");
        validarPuertoActivo(destino, "destino");
        validarMismoRio(origen, destino);

        ruta.setOrigen(origen);
        ruta.setDestino(destino);
        if (ruta.getEstado() == null || ruta.getEstado().isBlank()) {
            ruta.setEstado("ACTIVO");
        }

        boolean existeMismoTrayecto = repository.findByOrigen_IdPuertoAndDestino_IdPuertoAndEstadoNot(
                origen.getIdPuerto(),
                destino.getIdPuerto(),
                "ELIMINADO"
            ).stream()
            .anyMatch(r -> !Objects.equals(r.getIdRuta(), ruta.getIdRuta()));

        if (existeMismoTrayecto) {
            throw new RuntimeException("Ya existe una ruta registrada con el mismo puerto de origen y destino.");
        }

        return repository.save(ruta);
    }

    public void toggleEstado(Long id) {
        Ruta ruta = repository.findById(id).orElseThrow(() -> new RuntimeException("Ruta no encontrada"));
        if (!tienePuertosUtilizables(ruta)) {
            throw new RuntimeException("No se puede activar una ruta con puertos inactivos o eliminados.");
        }
        ruta.setEstado("ACTIVO".equals(ruta.getEstado()) ? "INACTIVO" : "ACTIVO");
        repository.save(ruta);
    }

    public void eliminar(Long id) {
        Ruta ruta = repository.findById(id).orElseThrow(() -> new RuntimeException("Ruta no encontrada"));
        ruta.setEstado("ELIMINADO");
        repository.save(ruta);
    }

    public MensajeResponse eliminarConMensaje(Long id) {
        eliminar(id);
        return new MensajeResponse("Ruta eliminada correctamente");
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

    private void validarPuertoActivo(Puerto puerto, String etiqueta) {
        if (!"ACTIVO".equals(puerto.getEstado())) {
            throw new RuntimeException("El puerto de " + etiqueta + " debe estar activo.");
        }
        if (puerto.getRio() == null || !"ACTIVO".equals(puerto.getRio().getEstado())) {
            throw new RuntimeException("El rio del puerto de " + etiqueta + " debe estar activo.");
        }
    }

    private void validarMismoRio(Puerto origen, Puerto destino) {
        Long idRioOrigen = origen.getRio() != null ? origen.getRio().getIdRio() : null;
        Long idRioDestino = destino.getRio() != null ? destino.getRio().getIdRio() : null;
        if (idRioOrigen == null || idRioDestino == null || !idRioOrigen.equals(idRioDestino)) {
            throw new RuntimeException("Los puertos de origen y destino deben pertenecer al mismo rio.");
        }
    }

    private boolean tienePuertosUtilizables(Ruta ruta) {
        return ruta.getOrigen() != null
                && ruta.getDestino() != null
                && "ACTIVO".equals(ruta.getOrigen().getEstado())
                && "ACTIVO".equals(ruta.getDestino().getEstado())
                && ruta.getOrigen().getRio() != null
                && ruta.getDestino().getRio() != null
                && "ACTIVO".equals(ruta.getOrigen().getRio().getEstado())
                && "ACTIVO".equals(ruta.getDestino().getRio().getEstado());
    }
}
