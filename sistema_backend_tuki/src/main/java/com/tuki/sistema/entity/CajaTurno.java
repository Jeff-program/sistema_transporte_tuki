package com.tuki.sistema.entity;

import jakarta.persistence.*;
import lombok.Data;
import java.math.BigDecimal;
import java.time.LocalDateTime;

@Data
@Entity
@Table(name = "caja_turnos")
public class CajaTurno {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "id_turno")
    private Long idTurno;

    @ManyToOne
    @JoinColumn(name = "id_usuario", nullable = false)
    private Usuario usuario;

    @ManyToOne
    @JoinColumn(name = "id_agencia")
    private Agencia agencia;

    @Column(name = "fecha_apertura")
    private LocalDateTime fechaApertura = LocalDateTime.now();

    @Column(name = "saldo_inicial", nullable = false, precision = 10, scale = 2)
    private BigDecimal saldoInicial;

    @Column(name = "fecha_cierre")
    private LocalDateTime fechaCierre;

    @Column(name = "saldo_final", precision = 10, scale = 2)
    private BigDecimal saldoFinal;

    @Column(precision = 10, scale = 2)
    private BigDecimal diferencia;

    @Column(length = 20)
    private String estado = "ABIERTO"; 

    @Column(name = "observaciones_apertura", columnDefinition = "TEXT")
    private String observacionesApertura;

    @Column(name = "observaciones_cierre", columnDefinition = "TEXT")
    private String observacionesCierre;
}