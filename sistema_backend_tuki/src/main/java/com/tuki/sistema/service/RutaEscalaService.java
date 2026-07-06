package com.tuki.sistema.service;

import com.tuki.sistema.entity.Puerto;
import com.tuki.sistema.entity.Ruta;
import com.tuki.sistema.entity.RutaEscala;
import com.tuki.sistema.repository.PuertoRepository;
import com.tuki.sistema.repository.RutaEscalaRepository;
import com.tuki.sistema.repository.RutaRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

import java.util.List;
import java.util.Objects;

@Service
public class RutaEscalaService {

    @Autowired private RutaEscalaRepository repository;
    @Autowired private RutaRepository rutaRepository;
    @Autowired private PuertoRepository puertoRepository;

    public List<RutaEscala> listarPorRuta(Long idRuta) {
        return repository.findByRuta_IdRutaOrderByOrdenAsc(idRuta);
    }

    public RutaEscala guardar(RutaEscala escala) {
        validarEscala(escala);

        Ruta ruta = rutaRepository.findById(escala.getRuta().getIdRuta())
                .orElseThrow(() -> new RuntimeException("La ruta seleccionada no existe."));
        Puerto puerto = puertoRepository.findById(escala.getPuerto().getIdPuerto())
                .orElseThrow(() -> new RuntimeException("El puerto de escala no existe."));

        if (!"ACTIVO".equals(ruta.getEstado())) {
            throw new RuntimeException("No se pueden agregar escalas a una ruta inactiva o eliminada.");
        }
        if (!"ACTIVO".equals(puerto.getEstado())) {
            throw new RuntimeException("El puerto de escala debe estar activo.");
        }
        if (ruta.getOrigen() != null && ruta.getOrigen().getIdPuerto().equals(puerto.getIdPuerto())
                || ruta.getDestino() != null && ruta.getDestino().getIdPuerto().equals(puerto.getIdPuerto())) {
            throw new RuntimeException("El puerto de escala no puede ser el origen ni el destino de la ruta.");
        }

        boolean puertoRepetido = repository.findByRuta_IdRutaAndPuerto_IdPuerto(ruta.getIdRuta(), puerto.getIdPuerto())
                .filter(existente -> !Objects.equals(existente.getIdEscala(), escala.getIdEscala()))
                .isPresent();
        if (puertoRepetido) {
            throw new RuntimeException("Ese puerto ya esta registrado como escala de la ruta.");
        }

        boolean ordenRepetido = repository.findByRuta_IdRutaOrderByOrdenAsc(ruta.getIdRuta()).stream()
                .anyMatch(existente -> Objects.equals(existente.getOrden(), escala.getOrden())
                        && !Objects.equals(existente.getIdEscala(), escala.getIdEscala()));
        if (ordenRepetido) {
            throw new RuntimeException("Ya existe una escala con ese orden en la ruta.");
        }

        escala.setRuta(ruta);
        escala.setPuerto(puerto);
        return repository.save(escala);
    }

    public void eliminar(Long id) {
        repository.deleteById(id);
    }

    private void validarEscala(RutaEscala escala) {
        if (escala == null) {
            throw new RuntimeException("Los datos de la escala son obligatorios.");
        }
        if (escala.getRuta() == null || escala.getRuta().getIdRuta() == null) {
            throw new RuntimeException("La ruta de la escala es obligatoria.");
        }
        if (escala.getPuerto() == null || escala.getPuerto().getIdPuerto() == null) {
            throw new RuntimeException("El puerto de la escala es obligatorio.");
        }
        if (escala.getOrden() == null || escala.getOrden() <= 0) {
            throw new RuntimeException("El orden de la escala debe ser mayor a cero.");
        }
    }
}
