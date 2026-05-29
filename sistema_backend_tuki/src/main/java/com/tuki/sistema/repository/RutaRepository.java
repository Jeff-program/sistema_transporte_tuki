package com.tuki.sistema.repository;

import com.tuki.sistema.entity.Ruta;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.*;

public interface RutaRepository extends JpaRepository<Ruta, Long> {
    List<Ruta> findByEstado(String estado);

    Optional<Ruta> findByNombreRutaIgnoreCaseAndEstadoNot(String nombre, String estado);

    List<Ruta> findByOrigen_IdPuertoAndDestino_IdPuertoAndEstadoNot(Long idOrigen, Long idDestino, String estado);
}
