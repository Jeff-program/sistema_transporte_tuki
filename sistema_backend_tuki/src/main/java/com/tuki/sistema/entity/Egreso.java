package com.tuki.sistema.entity;

import jakarta.persistence.*;
import lombok.Data;
import java.math.BigDecimal;
import java.time.LocalDateTime;

@Data
@Entity
@Table(name = "egresos")
public class Egreso {
    
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "id_egreso")
    private Long idEgreso;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "id_turno", nullable = false)
    private CajaTurno cajaTurno;

    private String concepto;
    private BigDecimal monto;
    
    @Column(name = "fecha_egreso")
    private LocalDateTime fechaEgreso;
}