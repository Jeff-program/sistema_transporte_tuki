package com.tuki.sistema.repository;

import com.tuki.sistema.entity.ViajeEscala;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface ViajeEscalaRepository extends JpaRepository<ViajeEscala, Long> {
    
    List<ViajeEscala> findByViaje_IdViajeOrderByOrdenAsc(Long idViaje);
}