package com.tuki.sistema.dto;

import lombok.Data;
import java.math.BigDecimal;
import java.time.LocalDateTime;

@Data
public class EgresoDTO {
    private Long idEgreso;
    private Long idTurno;
    private String concepto;
    private BigDecimal monto;
    private LocalDateTime fechaEgreso;
}