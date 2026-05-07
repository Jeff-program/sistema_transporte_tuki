package com.tuki.sistema.repository;

import com.tuki.sistema.entity.Rio;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import java.util.List;

@Repository
public interface RioRepository extends JpaRepository<Rio, Long> {
    List<Rio> findByEstado(String estado);
}