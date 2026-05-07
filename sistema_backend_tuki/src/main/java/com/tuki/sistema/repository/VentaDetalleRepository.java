package com.tuki.sistema.repository;

import com.tuki.sistema.entity.VentaDetalle;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import java.util.List;

@Repository
public interface VentaDetalleRepository extends JpaRepository<VentaDetalle, Long> {
    
    List<VentaDetalle> findByVenta_Viaje_IdViajeAndEstadoPasaje(Long idViaje, String estadoPasaje);

    List<VentaDetalle> findByVenta_Viaje_IdViajeAndAsiento_IdAsientoAndEstadoPasaje(Long idViaje, Long idAsiento, String estadoPasaje);

    List<VentaDetalle> findByVenta_Viaje_IdViaje(Long idViaje);
}