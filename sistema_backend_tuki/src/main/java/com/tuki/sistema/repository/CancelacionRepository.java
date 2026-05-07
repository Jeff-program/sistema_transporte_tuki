package com.tuki.sistema.repository;

import com.tuki.sistema.entity.Cancelacion;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

@Repository
public interface CancelacionRepository extends JpaRepository<Cancelacion, Long> {
}