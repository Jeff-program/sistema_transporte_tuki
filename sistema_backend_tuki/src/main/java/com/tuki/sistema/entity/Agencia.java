package com.tuki.sistema.entity;

import jakarta.persistence.*;
import lombok.Data;

@Data
@Entity
@Table(name = "agencias")
public class Agencia {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "id_agencia")
    private Long idAgencia;

    @Column(name = "nombre_agencia", nullable = false, length = 150)
    private String nombreAgencia;

    @ManyToOne
    @JoinColumn(name = "id_puerto", nullable = false)
    private Puerto puerto;

    @Column(length = 255)
    private String direccion;

    @Column(length = 50)
    private String telefono;

    @Column(length = 20)
    private String estado = "ACTIVO";
}