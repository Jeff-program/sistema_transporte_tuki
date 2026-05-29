package com.tuki.sistema.repository;

import com.tuki.sistema.entity.Puerto;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import java.util.List;
import java.util.Optional;

public interface PuertoRepository extends JpaRepository<Puerto, Long> {
    List<Puerto> findByEstado(String estado);

    Optional<Puerto> findByNombrePuertoIgnoreCaseAndEstadoNot(String nombre, String estado);

    @Query("""
           SELECT p FROM Puerto p
           WHERE p.estado = :estado
           AND (p.rio.idRio = :idRio OR p.esPrincipal = true)
           """)
    List<Puerto> findActivosByRioOrPrincipal(@Param("idRio") Long idRio, @Param("estado") String estado);
}
