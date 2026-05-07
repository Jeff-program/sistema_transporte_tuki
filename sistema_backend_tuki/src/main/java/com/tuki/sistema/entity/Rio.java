package com.tuki.sistema.entity;

import jakarta.persistence.*;
import lombok.Data;

@Data
@Entity
@Table(name = "rios")
public class Rio {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "id_rio")
    private Long idRio;

    @Column(name = "nombre_rio", nullable = false, length = 100)
    private String nombreRio;

    @Column(length = 20)
    private String estado = "ACTIVO";
}