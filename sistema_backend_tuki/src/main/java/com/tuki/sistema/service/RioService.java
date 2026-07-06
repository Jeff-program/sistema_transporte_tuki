package com.tuki.sistema.service;

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

import java.text.Normalizer;
import java.util.List;
import java.util.Locale;
import java.util.stream.Collectors;

@Service
public class RioService {

    @Autowired private RioRepository rioRepository;
    @Autowired private PuertoRepository puertoRepository;
    @Autowired private AgenciaRepository agenciaRepository;
    @Autowired private UsuarioRepository usuarioRepository;
    @Autowired private RutaRepository rutaRepository;

    public List<Rio> listarTodos() {
        return rioRepository.findAll().stream()
                .filter(r -> !"ELIMINADO".equals(r.getEstado()))
                .collect(Collectors.toList());
    }

    public List<Rio> listarActivos() {
        return rioRepository.findByEstado("ACTIVO");
    }

    public Rio guardar(Rio rio) {
        String nombre = validarNombreUnico(rio.getNombreRio(), null);
        rio.setNombreRio(nombre);
        if (rio.getEstado() == null || rio.getEstado().isBlank()) {
            rio.setEstado("ACTIVO");
        }
        return rioRepository.save(rio);
    }

    public Rio actualizar(Long id, Rio rio) {
        String nombre = validarNombreUnico(rio.getNombreRio(), id);
        Rio existente = rioRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Rio no encontrado"));
        existente.setNombreRio(nombre);
        return rioRepository.save(existente);
    }

    @Transactional
    public void cambiarEstado(Long id) {
        Rio rio = rioRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Rio no encontrado"));
        String nuevoEstado = "ACTIVO".equals(rio.getEstado()) ? "INACTIVO" : "ACTIVO";
        rio.setEstado(nuevoEstado);
        rioRepository.save(rio);

        aplicarCascadaDeEstado(id, nuevoEstado);
    }

    @Transactional
    public void eliminar(Long id) {
        Rio rio = rioRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Rio no encontrado"));
        rio.setEstado("ELIMINADO");
        rioRepository.save(rio);

        aplicarCascadaDeEstado(id, "ELIMINADO");
    }

    private String validarNombreUnico(String nombreRio, Long idActual) {
        if (nombreRio == null || nombreRio.trim().isEmpty()) {
            throw new RuntimeException("El nombre del rio no puede estar vacio");
        }

        String nombreLimpio = nombreRio.trim().replaceAll("\\s+", " ");
        String nombreNormalizado = normalizarNombre(nombreLimpio);

        boolean existe = rioRepository.findAll().stream()
                .anyMatch(r -> normalizarNombre(r.getNombreRio()).equals(nombreNormalizado)
                        && !"ELIMINADO".equals(r.getEstado())
                        && (idActual == null || !r.getIdRio().equals(idActual)));

        if (existe) {
            throw new RuntimeException("Ya existe un rio registrado con el nombre: " + nombreLimpio);
        }

        return nombreLimpio;
    }

    private void aplicarCascadaDeEstado(Long idRio, String nuevoEstado) {
        List<Puerto> puertosVinculados = puertoRepository.findAll().stream()
                .filter(p -> p.getRio() != null && p.getRio().getIdRio().equals(idRio))
                .collect(Collectors.toList());

        for (Puerto puerto : puertosVinculados) {
            puerto.setEstado(nuevoEstado);
            puertoRepository.save(puerto);

            List<Ruta> rutasVinculadas = rutaRepository.findAll().stream()
                    .filter(r -> (r.getOrigen() != null && r.getOrigen().getIdPuerto().equals(puerto.getIdPuerto()))
                            || (r.getDestino() != null && r.getDestino().getIdPuerto().equals(puerto.getIdPuerto())))
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

    private String normalizarNombre(String valor) {
        if (valor == null) {
            return "";
        }
        return Normalizer.normalize(valor, Normalizer.Form.NFD)
                .replaceAll("\\p{M}+", "")
                .toLowerCase(Locale.ROOT)
                .trim()
                .replaceAll("\\s+", " ");
    }
}
