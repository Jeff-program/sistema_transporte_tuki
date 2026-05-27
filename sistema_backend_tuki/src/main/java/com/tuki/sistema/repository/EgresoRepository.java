package com.tuki.sistema.repository;

import com.tuki.sistema.entity.Egreso;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import java.util.List;

@Repository
public interface EgresoRepository extends JpaRepository<Egreso, Long> {
    List<Egreso> findByCajaTurno_IdTurno(Long idTurno);
}
