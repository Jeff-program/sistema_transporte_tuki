package com.tuki.sistema.entity;

import jakarta.persistence.*;
import lombok.Data;

@Data
@Entity
@Table(name = "puertos")
public class Puerto {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "id_puerto")
    private Long idPuerto;

    @Column(name = "nombre_puerto", nullable = false, length = 150)
    private String nombrePuerto;

    @Column(nullable = false, length = 100)
    private String ciudad;

    @Column(length = 255)
    private String direccion;

    @Column(length = 20)
    private String estado = "ACTIVO";

    @ManyToOne
    @JoinColumn(name = "id_rio")
    private Rio rio;

    @Column(name = "es_principal")
    private Boolean esPrincipal = false;
}