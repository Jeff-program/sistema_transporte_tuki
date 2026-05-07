package com.tuki.sistema.repository;

import com.tuki.sistema.entity.Tarifa;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;
import java.util.Optional;

public interface TarifaRepository extends JpaRepository<Tarifa, Long> {
    Optional<Tarifa> findTopByRuta_IdRutaAndOrigen_IdPuertoAndDestino_IdPuertoOrderByIdTarifaDesc(
        Long idRuta, Long idOrigen, Long idDestino
    );
    List<Tarifa> findByRuta_IdRuta(Long idRuta);
}
