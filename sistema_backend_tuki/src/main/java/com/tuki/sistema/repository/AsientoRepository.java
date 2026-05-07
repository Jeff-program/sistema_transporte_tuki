package com.tuki.sistema.repository;

import com.tuki.sistema.entity.Asiento;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.Optional;

public interface AsientoRepository extends JpaRepository<Asiento, Long> {
    Optional<Asiento> findByEmbarcacion_IdEmbarcacionAndNumero(Long idEmbarcacion, String numero);
}