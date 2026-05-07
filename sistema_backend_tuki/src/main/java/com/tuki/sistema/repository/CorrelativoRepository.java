package com.tuki.sistema.repository;

import com.tuki.sistema.entity.Correlativo;
import jakarta.persistence.LockModeType;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.Optional;

public interface CorrelativoRepository extends JpaRepository<Correlativo, String> {
    
    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("SELECT c FROM Correlativo c WHERE c.serie = :serie")
    Optional<Correlativo> findBySerieWithLock(@Param("serie") String serie);
}