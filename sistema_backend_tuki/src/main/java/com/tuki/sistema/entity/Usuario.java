package com.tuki.sistema.entity;

import jakarta.persistence.*;
import lombok.Data;

@Data
@Entity
@Table(name = "usuarios")
public class Usuario {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "id_usuario")
    private Long idUsuario;

    @Column(name = "nombre_completo", nullable = false, length = 150)
    private String nombreCompleto;

    @Column(nullable = false, unique = true, length = 100)
    private String email;

    @Column(nullable = false, length = 255)
    private String password;

    @Column(length = 20)
    private String rol; 

    @ManyToOne
    @JoinColumn(name = "id_agencia")
    private Agencia agencia;

    @Column(name = "foto_url", length = 255)
    private String fotoUrl;

    @Column(name = "tiempo_espera_min")
    private Integer tiempoEsperaMin;

    @Column(length = 20)
    private String estado = "ACTIVO";
}