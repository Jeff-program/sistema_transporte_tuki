package com.tuki.sistema.entity;

import jakarta.persistence.*;
import lombok.Data;
import java.math.BigDecimal;

@Data
@Entity
@Table(name = "tarifas")
public class Tarifa {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "id_tarifa")
    private Long idTarifa;

    @ManyToOne
    @JoinColumn(name = "id_ruta", nullable = false)
    private Ruta ruta;

    @ManyToOne
    @JoinColumn(name = "id_puerto_origen", nullable = false)
    private Puerto origen;

    @ManyToOne
    @JoinColumn(name = "id_puerto_destino", nullable = false)
    private Puerto destino;

    @Column(nullable = false, precision = 10, scale = 2)
    private BigDecimal precio;
}