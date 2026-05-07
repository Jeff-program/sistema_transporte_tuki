package com.tuki.sistema.entity;

import jakarta.persistence.*;
import lombok.Data;

@Data
@Entity
@Table(name = "viaje_escalas")
public class ViajeEscala {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "id_viaje_escala")
    private Long idViajeEscala;

    @ManyToOne
    @JoinColumn(name = "id_viaje", nullable = false)
    private Viaje viaje;

    @ManyToOne
    @JoinColumn(name = "id_puerto", nullable = false)
    private Puerto puerto;

    @Column(nullable = false)
    private Integer orden;

    @Column(length = 20)
    private String estado = "PENDIENTE"; 
}