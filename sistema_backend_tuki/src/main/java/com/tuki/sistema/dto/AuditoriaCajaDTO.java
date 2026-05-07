package com.tuki.sistema.dto;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;
import java.time.LocalDateTime;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class AuditoriaCajaDTO {
    private Long idTurno;
    private String asesor;
    private String agencia;
    private String estado;
    private LocalDateTime fechaApertura;
    private LocalDateTime fechaCierre;
    private BigDecimal saldoInicial;
    private BigDecimal saldoFinal;
    private BigDecimal diferencia;
    private BigDecimal ingresos;
    private BigDecimal devoluciones;
}
