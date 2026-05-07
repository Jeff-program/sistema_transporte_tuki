package com.tuki.sistema.service;

import com.tuki.sistema.entity.Puerto;
import com.tuki.sistema.entity.Agencia;
import com.tuki.sistema.entity.Usuario;
import com.tuki.sistema.repository.AgenciaRepository;
import com.tuki.sistema.repository.PuertoRepository;
import com.tuki.sistema.repository.UsuarioRepository;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

import java.util.List;
import java.util.stream.Collectors;

@Service
public class PuertoService {

    @Autowired
    private PuertoRepository repository;

    @Autowired
    private AgenciaRepository agenciaRepository;

    @Autowired
    private UsuarioRepository usuarioRepository;

    public List<Puerto> listarTodos() {
        return repository.findAll().stream()
                .filter(p -> !"ELIMINADO".equals(p.getEstado()))
                .collect(Collectors.toList());
    }

    public List<Puerto> listarActivos() {
        return repository.findByEstado("ACTIVO");
    }

    public Puerto guardar(Puerto puerto) {
        if (puerto.getIdPuerto() == null) {
            repository.findByNombrePuertoIgnoreCaseAndEstadoNot(puerto.getNombrePuerto().trim(), "ELIMINADO")
                .ifPresent(p -> { throw new RuntimeException("Ya existe un puerto con el nombre: " + puerto.getNombrePuerto()); });
        }
        
        return repository.save(puerto);
    }

    public Puerto toggleEstado(Long id) {
        Puerto p = repository.findById(id).orElseThrow();
        String nuevoEstado = "ACTIVO".equals(p.getEstado()) ? "INACTIVO" : "ACTIVO";
        p.setEstado(nuevoEstado);
        
        List<Agencia> agenciasVinculadas = agenciaRepository.findAll().stream()
                .filter(a -> a.getPuerto() != null && a.getPuerto().getIdPuerto().equals(id))
                .collect(Collectors.toList());
                
        for (Agencia agencia : agenciasVinculadas) {
            // Apagamos/Encendemos la Agencia
            agencia.setEstado(nuevoEstado);
            agenciaRepository.save(agencia);

            List<Usuario> usuariosDeLaAgencia = usuarioRepository.findAll().stream()
                    .filter(u -> u.getAgencia() != null && u.getAgencia().getIdAgencia().equals(agencia.getIdAgencia()))
                    .collect(Collectors.toList());

            for (Usuario usuario : usuariosDeLaAgencia) {
                usuario.setEstado(nuevoEstado);
                usuarioRepository.save(usuario);
            }
        }

        return repository.save(p);
    }

    public void eliminar(Long id) {
        Puerto p = repository.findById(id).orElseThrow();
        p.setEstado("ELIMINADO");
        repository.save(p);
    }
}