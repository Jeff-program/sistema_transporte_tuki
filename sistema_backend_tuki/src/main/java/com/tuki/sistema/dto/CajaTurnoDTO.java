package com.tuki.sistema.dto;
import lombok.Data;
import java.math.BigDecimal;
import java.time.LocalDateTime;

@Data
public class CajaTurnoDTO {
    private Long idTurno;
    private Long idUsuario;
    private String nombreUsuario;
    private LocalDateTime fechaApertura;
    private BigDecimal saldoInicial;
    private LocalDateTime fechaCierre;
    private BigDecimal saldoFinal;
    private BigDecimal diferencia;
    private String estado;
    private String observacionesApertura;
    private String observacionesCierre;
}