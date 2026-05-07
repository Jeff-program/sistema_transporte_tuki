package com.tuki.sistema.repository;

import com.tuki.sistema.entity.Embarcacion;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;
import java.util.Optional;

public interface EmbarcacionRepository extends JpaRepository<Embarcacion, Long> {
    List<Embarcacion> findByEstado(String estado);
    Optional<Embarcacion> findByMatriculaAndEstadoNot(String matricula, String estado);
    Optional<Embarcacion> findByNombreIgnoreCaseAndEstadoNot(String nombre, String estado);
}