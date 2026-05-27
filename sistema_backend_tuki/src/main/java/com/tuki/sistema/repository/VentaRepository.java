package com.tuki.sistema.repository;

import com.tuki.sistema.entity.Venta;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;

public interface VentaRepository extends JpaRepository<Venta, Long> {
    List<Venta> findByViaje_IdViaje(Long idViaje);

    List<Venta> findByCajaTurno_IdTurno(Long idTurno);
}