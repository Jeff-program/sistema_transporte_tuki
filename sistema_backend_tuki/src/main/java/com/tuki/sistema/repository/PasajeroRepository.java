package com.tuki.sistema.repository;

import com.tuki.sistema.entity.Pasajero;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;
import java.util.Optional;

public interface PasajeroRepository extends JpaRepository<Pasajero, Long> {
    Optional<Pasajero> findByNumeroDocumento(String numeroDocumento);
    List<Pasajero> findByEstado(String estado);
}