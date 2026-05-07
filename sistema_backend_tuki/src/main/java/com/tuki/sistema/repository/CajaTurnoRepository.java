package com.tuki.sistema.repository;

import com.tuki.sistema.dto.AuditoriaCajaDTO;
import com.tuki.sistema.entity.CajaTurno;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

public interface CajaTurnoRepository extends JpaRepository<CajaTurno, Long> {
    Optional<CajaTurno> findByUsuario_IdUsuarioAndEstado(Long idUsuario, String estado);

    @Query("SELECT new com.tuki.sistema.dto.AuditoriaCajaDTO( " +
           "c.idTurno, u.nombreCompleto, COALESCE(a.nombreAgencia, 'Sede Principal'), c.estado, " +
           "c.fechaApertura, c.fechaCierre, c.saldoInicial, COALESCE(c.saldoFinal, 0), COALESCE(c.diferencia, 0), " +
           "COALESCE((SELECT SUM(v.total) FROM Venta v WHERE v.cajaTurno.idTurno = c.idTurno AND v.estado = 'COMPLETADA'), 0), " +
           "COALESCE((SELECT SUM(canc.montoDevuelto) FROM Cancelacion canc JOIN canc.venta v2 WHERE v2.cajaTurno.idTurno = c.idTurno), 0) " +
           ") " +
           "FROM CajaTurno c " +
           "JOIN c.usuario u " +
           "LEFT JOIN c.agencia a " +
           "WHERE c.fechaApertura >= :inicio AND (c.fechaApertura <= :fin OR c.fechaCierre <= :fin) " +
           "ORDER BY c.fechaApertura DESC")
    List<AuditoriaCajaDTO> obtenerReporteAuditoria(
            @Param("inicio") LocalDateTime inicio, 
            @Param("fin") LocalDateTime fin);
}