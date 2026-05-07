package com.tuki.sistema.entity;

import jakarta.persistence.*;
import lombok.Data;

@Data
@Entity
@Table(name = "embarcaciones")
public class Embarcacion {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "id_embarcacion")
    private Long idEmbarcacion;

    @Column(nullable = false, length = 150)
    private String nombre;

    @Column(nullable = false, unique = true, length = 50)
    private String matricula;

    @Column(name = "capacidad")
    private Integer capacidad;

    @Column(name = "numero_filas")
    private Integer numeroFilas;

    @Column(name = "distribucion_columnas", columnDefinition = "TEXT")
    private String distribucionColumnas; 

    @Column(length = 20)
    private String estado = "OPERATIVO"; 
}