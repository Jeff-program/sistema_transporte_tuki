package com.tuki.sistema.repository;

import com.tuki.sistema.entity.Comprobante;
import java.util.List;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

@Repository
public interface ComprobanteRepository extends JpaRepository<Comprobante, Long> {

    @Query("SELECT COALESCE(MAX(c.numeroCorrelativo), 0) FROM Comprobante c WHERE c.serie = :serie")
    Long findMaxCorrelativoBySerie(@Param("serie") String serie);
    
    List<Comprobante> findByVenta_IdVenta(Long idVenta);
}