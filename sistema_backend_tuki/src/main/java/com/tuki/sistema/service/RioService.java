package com.tuki.sistema.service;

import com.tuki.sistema.entity.*;
import com.tuki.sistema.repository.*;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.stream.Collectors;

@Service
public class RioService {

    @Autowired
    private RioRepository rioRepository;

    @Autowired
    private PuertoRepository puertoRepository;

    @Autowired
    private AgenciaRepository agenciaRepository;

    @Autowired
    private UsuarioRepository usuarioRepository;

    @Autowired
    private RutaRepository rutaRepository;

    public List<Rio> listarTodos() {
        return rioRepository.findAll().stream()
                .filter(r -> !"ELIMINADO".equals(r.getEstado()))
                .collect(Collectors.toList());
    }

    public List<Rio> listarActivos() {
        return rioRepository.findByEstado("ACTIVO");
    }

    private void validarNombreUnico(String nombreRio, Long idActual) {
        if (nombreRio == null || nombreRio.trim().isEmpty()) {
            throw new RuntimeException("El nombre del río no puede estar vacío");
        }

        boolean existe = rioRepository.findAll().stream()
                .anyMatch(r -> r.getNombreRio().equalsIgnoreCase(nombreRio.trim()) 
                        && !"ELIMINADO".equals(r.getEstado()) 
                        && (idActual == null || !r.getIdRio().equals(idActual))); 
                        
        if (existe) {
            throw new RuntimeException("Ya existe un río registrado con el nombre: " + nombreRio.trim());
        }
    }

    public Rio guardar(Rio rio) {
        validarNombreUnico(rio.getNombreRio(), null);
        return rioRepository.save(rio);
    }

    public Rio actualizar(Long id, Rio rio) {
        validarNombreUnico(rio.getNombreRio(), id);
        rio.setIdRio(id);
        return rioRepository.save(rio);
    }

    @Transactional
    public void cambiarEstado(Long id) {
        Rio rio = rioRepository.findById(id).orElseThrow(() -> new RuntimeException("Río no encontrado"));
        String nuevoEstado = "ACTIVO".equals(rio.getEstado()) ? "INACTIVO" : "ACTIVO";
        rio.setEstado(nuevoEstado);
        rioRepository.save(rio);

        aplicarCascadaDeEstado(id, nuevoEstado);
    }

    @Transactional
    public void eliminar(Long id) {
        Rio rio = rioRepository.findById(id).orElseThrow(() -> new RuntimeException("Río no encontrado"));
        rio.setEstado("ELIMINADO");
        rioRepository.save(rio);

        aplicarCascadaDeEstado(id, "ELIMINADO");
    }

    private void aplicarCascadaDeEstado(Long idRio, String nuevoEstado) {
        List<Puerto> puertosVinculados = puertoRepository.findAll().stream()
                .filter(p -> p.getRio() != null && p.getRio().getIdRio().equals(idRio))
                .collect(Collectors.toList());

        for (Puerto puerto : puertosVinculados) {
            puerto.setEstado(nuevoEstado);
            puertoRepository.save(puerto);

            List<Ruta> rutasVinculadas = rutaRepository.findAll().stream()
                    .filter(r -> (r.getOrigen() != null && r.getOrigen().getIdPuerto().equals(puerto.getIdPuerto())) ||
                                 (r.getDestino() != null && r.getDestino().getIdPuerto().equals(puerto.getIdPuerto())))
                    .collect(Collectors.toList());

            for (Ruta ruta : rutasVinculadas) {
                ruta.setEstado(nuevoEstado);
                rutaRepository.save(ruta);
            }

            List<Agencia> agenciasVinculadas = agenciaRepository.findAll().stream()
                    .filter(a -> a.getPuerto() != null && a.getPuerto().getIdPuerto().equals(puerto.getIdPuerto()))
                    .collect(Collectors.toList());

            for (Agencia agencia : agenciasVinculadas) {
                agencia.setEstado(nuevoEstado);
                agenciaRepository.save(agencia);

                List<Usuario> usuarios = usuarioRepository.findAll().stream()
                        .filter(u -> u.getAgencia() != null && u.getAgencia().getIdAgencia().equals(agencia.getIdAgencia()))
                        .collect(Collectors.toList());

                for (Usuario usuario : usuarios) {
                    usuario.setEstado(nuevoEstado);
                    usuarioRepository.save(usuario);
                }
            }
        }
    }
}