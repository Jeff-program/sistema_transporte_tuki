package com.tuki.sistema.repository;

import com.tuki.sistema.entity.Agencia;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;

public interface AgenciaRepository extends JpaRepository<Agencia, Long> {
    List<Agencia> findByEstado(String estado);
    List<Agencia> findByPuerto_IdPuertoAndEstado(Long idPuerto, String estado);
}
