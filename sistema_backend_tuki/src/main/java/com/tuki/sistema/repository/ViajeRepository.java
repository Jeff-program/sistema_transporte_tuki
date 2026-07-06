package com.tuki.sistema.repository;

import com.tuki.sistema.entity.Viaje;
import jakarta.persistence.LockModeType;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.time.LocalDate;
import java.util.List;
import java.util.Optional;

public interface ViajeRepository extends JpaRepository<Viaje, Long> {
    List<Viaje> findByFechaSalidaAndRuta_IdRuta(LocalDate fecha, Long idRuta);
    List<Viaje> findByEstado(String estado);
    List<Viaje> findByEmbarcacion_IdEmbarcacionAndEstado(Long idEmbarcacion, String estado);
    boolean existsByEmbarcacion_IdEmbarcacionAndFechaSalidaAndEstadoNot(Long idEmbarcacion, LocalDate fechaSalida, String estado);

    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("SELECT v FROM Viaje v WHERE v.idViaje = :id")
    Optional<Viaje> findByIdWithLock(@Param("id") Long id);
}
