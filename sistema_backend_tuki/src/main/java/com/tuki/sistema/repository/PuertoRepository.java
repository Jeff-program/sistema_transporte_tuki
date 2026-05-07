package com.tuki.sistema.repository;

import com.tuki.sistema.entity.Puerto;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;
import java.util.Optional;

public interface PuertoRepository extends JpaRepository<Puerto, Long> {
    List<Puerto> findByEstado(String estado);

    Optional<Puerto> findByNombrePuertoIgnoreCaseAndEstadoNot(String nombre, String estado);

    List<Puerto> findByRio_IdRioOrEsPrincipalTrueAndEstado(Long idRio, String estado);
}
