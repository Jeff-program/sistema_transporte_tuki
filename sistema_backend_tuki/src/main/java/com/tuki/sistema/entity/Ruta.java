package com.tuki.sistema.entity;

import jakarta.persistence.*;
import lombok.Data;

@Data
@Entity
@Table(name = "rutas")
public class Ruta {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "id_ruta")
    private Long idRuta;

    @Column(name = "nombre_ruta", nullable = false, length = 150)
    private String nombreRuta;

    @ManyToOne
    @JoinColumn(name = "origen_id", nullable = false)
    private Puerto origen;

    @ManyToOne
    @JoinColumn(name = "destino_id", nullable = false)
    private Puerto destino;

    @Column(length = 20)
    private String estado = "ACTIVO";
}