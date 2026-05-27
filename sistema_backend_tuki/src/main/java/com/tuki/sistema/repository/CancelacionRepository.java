package com.tuki.sistema.repository;

import com.tuki.sistema.entity.Cancelacion;

import java.util.List;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

@Repository
public interface CancelacionRepository extends JpaRepository<Cancelacion, Long> {
    List<Cancelacion> findByVenta_CajaTurno_IdTurno(Long idTurno);

    List<Cancelacion> findByCajaTurno_IdTurno(Long idTurno);
}