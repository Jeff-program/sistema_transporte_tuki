package com.tuki.sistema.repository;

import com.tuki.sistema.entity.RecuperacionPassword;
import com.tuki.sistema.entity.Usuario;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.Optional;

public interface RecuperacionPasswordRepository extends JpaRepository<RecuperacionPassword, Long> {
    Optional<RecuperacionPassword> findByUsuario(Usuario usuario);
    void deleteByUsuario(Usuario usuario);
}