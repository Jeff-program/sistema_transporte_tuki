package com.tuki.sistema.repository;

import com.tuki.sistema.entity.Pago;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import java.time.LocalDateTime;
import java.util.List;

public interface PagoRepository extends JpaRepository<Pago, Long> {
    @Query("SELECT p FROM Pago p WHERE p.venta.usuarioVendedor.idUsuario = :idUsuario AND p.fechaPago >= :fechaInicio AND p.fechaPago <= :fechaFin AND p.estado = 'APROBADO'")
    List<Pago> findPagosParaCaja(
        @Param("idUsuario") Long idUsuario, 
        @Param("fechaInicio") LocalDateTime fechaInicio, 
        @Param("fechaFin") LocalDateTime fechaFin
    );

    List<Pago> findByVenta_IdVenta(Long idVenta);
}