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

    @Column(name = "arqueo_guardado")
    private Boolean arqueoGuardado = false;

    @Column(name = "monto_declarado_efectivo", precision = 10, scale = 2)
    private BigDecimal montoDeclaradoEfectivo = BigDecimal.ZERO;

    @Column(name = "monto_declarado_yape_plin", precision = 10, scale = 2)
    private BigDecimal montoDeclaradoYapePlin = BigDecimal.ZERO;

    @Column(name = "monto_declarado_tarjeta", precision = 10, scale = 2)
    private BigDecimal montoDeclaradoTarjeta = BigDecimal.ZERO;

    @Column(name = "diferencia_yape_plin", precision = 10, scale = 2)
    private BigDecimal diferenciaYapePlin = BigDecimal.ZERO;

    @Column(name = "diferencia_tarjeta", precision = 10, scale = 2)
    private BigDecimal diferenciaTarjeta = BigDecimal.ZERO;

    @Column(name = "diferencia_general", precision = 10, scale = 2)
    private BigDecimal diferenciaGeneral = BigDecimal.ZERO;

    @Column(length = 20)
    private String estado = "ABIERTO"; 

    @Column(name = "observaciones_apertura", columnDefinition = "TEXT")
    private String observacionesApertura;

    @Column(name = "observaciones_cierre", columnDefinition = "TEXT")
    private String observacionesCierre;
}
