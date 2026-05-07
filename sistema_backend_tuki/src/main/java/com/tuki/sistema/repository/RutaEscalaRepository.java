package com.tuki.sistema.repository;

import com.tuki.sistema.entity.RutaEscala;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;
import java.util.Optional;

public interface RutaEscalaRepository extends JpaRepository<RutaEscala, Long> {
    List<RutaEscala> findByRuta_IdRutaOrderByOrdenAsc(Long idRuta);
    Optional<RutaEscala> findByRuta_IdRutaAndPuerto_IdPuerto(Long idRuta, Long idPuerto);
}