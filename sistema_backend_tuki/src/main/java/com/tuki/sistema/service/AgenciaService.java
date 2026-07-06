package com.tuki.sistema.service;

import com.tuki.sistema.dto.AgenciaDTO;
import com.tuki.sistema.dto.AgenciaUpdateRequest;
import com.tuki.sistema.entity.Agencia;
import com.tuki.sistema.entity.Puerto;
import com.tuki.sistema.repository.AgenciaRepository;
import com.tuki.sistema.repository.PuertoRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

import java.text.Normalizer;
import java.util.List;
import java.util.Locale;

@Service
public class AgenciaService {

    @Autowired private AgenciaRepository agenciaRepository;
    @Autowired private PuertoRepository puertoRepository;

    public List<Agencia> listarTodas() {
        return agenciaRepository.findAll();
    }

    public List<Agencia> listarActivas() {
        return agenciaRepository.findByEstado("ACTIVO");
    }

    public List<Agencia> listarPorPuerto(Long idPuerto) {
        return agenciaRepository.findByPuerto_IdPuertoAndEstado(idPuerto, "ACTIVO");
    }

    public Agencia guardar(AgenciaDTO dto) {
        String nombreAgencia = validarNombreAgenciaUnico(dto.getNombreAgencia(), null);

        Agencia agencia = new Agencia();
        agencia.setNombreAgencia(nombreAgencia);
        agencia.setDireccion(dto.getDireccion());
        agencia.setTelefono(dto.getTelefono());
        agencia.setPuerto(obtenerPuertoActivo(obtenerIdPuertoCreacion(dto)));

        return agenciaRepository.save(agencia);
    }

    public Agencia actualizar(Long id, AgenciaUpdateRequest request) {
        Agencia agencia = agenciaRepository.findById(id)
            .orElseThrow(() -> new RuntimeException("Agencia no encontrada"));

        if (request.getNombreAgencia() != null) {
            agencia.setNombreAgencia(validarNombreAgenciaUnico(request.getNombreAgencia(), id));
        }
        if (request.getDireccion() != null) {
            agencia.setDireccion(request.getDireccion());
        }
        if (request.getTelefono() != null) {
            agencia.setTelefono(request.getTelefono());
        }

        Long idPuerto = obtenerIdPuertoActualizacion(request);
        if (idPuerto != null) {
            agencia.setPuerto(obtenerPuertoActivo(idPuerto));
        }

        return agenciaRepository.save(agencia);
    }

    public Agencia cambiarEstado(Long id) {
        Agencia agencia = agenciaRepository.findById(id)
            .orElseThrow(() -> new RuntimeException("Agencia no encontrada"));
        agencia.setEstado("ACTIVO".equals(agencia.getEstado()) ? "INACTIVO" : "ACTIVO");
        return agenciaRepository.save(agencia);
    }

    private Long obtenerIdPuertoCreacion(AgenciaDTO dto) {
        if (dto.getPuerto() == null || dto.getPuerto().getIdPuerto() == null) {
            throw new RuntimeException("El puerto es obligatorio para crear una agencia.");
        }
        return dto.getPuerto().getIdPuerto();
    }

    private Long obtenerIdPuertoActualizacion(AgenciaUpdateRequest request) {
        if (request.getIdPuerto() != null) {
            return request.getIdPuerto();
        }
        if (request.getPuerto() != null) {
            return request.getPuerto().getIdPuerto();
        }
        return null;
    }

    private Puerto obtenerPuertoActivo(Long idPuerto) {
        Puerto puerto = puertoRepository.findById(idPuerto)
            .orElseThrow(() -> new RuntimeException("El puerto seleccionado no existe."));
        if (!"ACTIVO".equals(puerto.getEstado())) {
            throw new RuntimeException("El puerto seleccionado debe estar activo.");
        }
        return puerto;
    }

    private String validarNombreAgenciaUnico(String nombreAgencia, Long idAgenciaActual) {
        if (nombreAgencia == null || nombreAgencia.trim().isEmpty()) {
            throw new RuntimeException("El nombre de la agencia es obligatorio.");
        }

        String nombreLimpio = nombreAgencia.trim();
        String nombreNormalizado = normalizarNombreAgencia(nombreLimpio);

        boolean existeDuplicado = agenciaRepository.findAll().stream()
            .filter(agencia -> idAgenciaActual == null || !idAgenciaActual.equals(agencia.getIdAgencia()))
            .map(Agencia::getNombreAgencia)
            .filter(nombreExistente -> nombreExistente != null && !nombreExistente.trim().isEmpty())
            .map(this::normalizarNombreAgencia)
            .anyMatch(nombreNormalizado::equals);

        if (existeDuplicado) {
            throw new RuntimeException("Ya existe una agencia registrada con ese nombre.");
        }

        return nombreLimpio;
    }

    private String normalizarNombreAgencia(String nombreAgencia) {
        String sinTildes = Normalizer.normalize(nombreAgencia, Normalizer.Form.NFD)
            .replaceAll("\\p{M}+", "");

        return sinTildes
            .toLowerCase(Locale.ROOT)
            .trim()
            .replaceAll("\\s+", " ");
    }
}
