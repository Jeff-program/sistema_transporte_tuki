package com.tuki.sistema.service;

import com.tuki.sistema.dto.MensajeResponse;
import com.tuki.sistema.entity.Agencia;
import com.tuki.sistema.entity.Puerto;
import com.tuki.sistema.entity.Rio;
import com.tuki.sistema.entity.Ruta;
import com.tuki.sistema.entity.Usuario;
import com.tuki.sistema.repository.AgenciaRepository;
import com.tuki.sistema.repository.PuertoRepository;
import com.tuki.sistema.repository.RioRepository;
import com.tuki.sistema.repository.RutaRepository;
import com.tuki.sistema.repository.UsuarioRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.Objects;
import java.util.stream.Collectors;

@Service
public class PuertoService {

    @Autowired private PuertoRepository repository;
    @Autowired private AgenciaRepository agenciaRepository;
    @Autowired private UsuarioRepository usuarioRepository;
    @Autowired private RutaRepository rutaRepository;
    @Autowired private RioRepository rioRepository;

    public List<Puerto> listarTodos() {
        return repository.findAll().stream()
                .filter(p -> !"ELIMINADO".equals(p.getEstado()))
                .collect(Collectors.toList());
    }

    public List<Puerto> listarActivos() {
        return repository.findByEstado("ACTIVO");
    }

    public List<Puerto> listarActivosPorRioOPrincipal(Long idRio) {
        return repository.findActivosByRioOrPrincipal(idRio, "ACTIVO");
    }

    public Puerto guardar(Puerto puerto) {
        normalizarYValidarPuerto(puerto);

        repository.findByNombrePuertoIgnoreCaseAndEstadoNot(puerto.getNombrePuerto(), "ELIMINADO")
                .ifPresent(existente -> {
                    if (!Objects.equals(existente.getIdPuerto(), puerto.getIdPuerto())) {
                        throw new RuntimeException("Ya existe un puerto con el nombre: " + puerto.getNombrePuerto());
                    }
                });

        return repository.save(puerto);
    }

    @Transactional
    public Puerto toggleEstado(Long id) {
        Puerto puerto = repository.findById(id).orElseThrow(() -> new RuntimeException("Puerto no encontrado"));
        String nuevoEstado = "ACTIVO".equals(puerto.getEstado()) ? "INACTIVO" : "ACTIVO";
        puerto.setEstado(nuevoEstado);
        aplicarCascadaDeEstado(id, nuevoEstado);
        return repository.save(puerto);
    }

    @Transactional
    public void eliminar(Long id) {
        Puerto puerto = repository.findById(id).orElseThrow(() -> new RuntimeException("Puerto no encontrado"));
        puerto.setEstado("ELIMINADO");
        aplicarCascadaDeEstado(id, "ELIMINADO");
        repository.save(puerto);
    }

    public MensajeResponse eliminarConMensaje(Long id) {
        eliminar(id);
        return new MensajeResponse("Puerto eliminado");
    }

    private void normalizarYValidarPuerto(Puerto puerto) {
        if (puerto.getNombrePuerto() == null || puerto.getNombrePuerto().trim().isEmpty()) {
            throw new RuntimeException("El nombre del puerto es obligatorio.");
        }
        if (puerto.getCiudad() == null || puerto.getCiudad().trim().isEmpty()) {
            throw new RuntimeException("La ciudad del puerto es obligatoria.");
        }
        if (puerto.getRio() == null || puerto.getRio().getIdRio() == null) {
            throw new RuntimeException("El rio del puerto es obligatorio.");
        }

        Rio rio = rioRepository.findById(puerto.getRio().getIdRio())
                .orElseThrow(() -> new RuntimeException("El rio seleccionado no existe."));
        if (!"ACTIVO".equals(rio.getEstado())) {
            throw new RuntimeException("No se puede registrar un puerto en un rio inactivo o eliminado.");
        }

        puerto.setNombrePuerto(puerto.getNombrePuerto().trim().replaceAll("\\s+", " "));
        puerto.setCiudad(puerto.getCiudad().trim().replaceAll("\\s+", " "));
        if (puerto.getDireccion() != null) {
            puerto.setDireccion(puerto.getDireccion().trim());
        }
        puerto.setRio(rio);
        if (puerto.getEstado() == null || puerto.getEstado().isBlank()) {
            puerto.setEstado("ACTIVO");
        }
        if (puerto.getEsPrincipal() == null) {
            puerto.setEsPrincipal(false);
        }
    }

    private void aplicarCascadaDeEstado(Long idPuerto, String nuevoEstado) {
        List<Ruta> rutasVinculadas = rutaRepository.findAll().stream()
                .filter(r -> (r.getOrigen() != null && idPuerto.equals(r.getOrigen().getIdPuerto()))
                        || (r.getDestino() != null && idPuerto.equals(r.getDestino().getIdPuerto())))
                .collect(Collectors.toList());
        for (Ruta ruta : rutasVinculadas) {
            ruta.setEstado(nuevoEstado);
            rutaRepository.save(ruta);
        }

        List<Agencia> agenciasVinculadas = agenciaRepository.findAll().stream()
                .filter(a -> a.getPuerto() != null && idPuerto.equals(a.getPuerto().getIdPuerto()))
                .collect(Collectors.toList());

        for (Agencia agencia : agenciasVinculadas) {
            agencia.setEstado(nuevoEstado);
            agenciaRepository.save(agencia);

            List<Usuario> usuariosDeLaAgencia = usuarioRepository.findAll().stream()
                    .filter(u -> u.getAgencia() != null && agencia.getIdAgencia().equals(u.getAgencia().getIdAgencia()))
                    .collect(Collectors.toList());

            for (Usuario usuario : usuariosDeLaAgencia) {
                usuario.setEstado(nuevoEstado);
                usuarioRepository.save(usuario);
            }
        }
    }
}
