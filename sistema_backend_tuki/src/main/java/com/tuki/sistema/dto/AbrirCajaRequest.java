package com.tuki.sistema.dto;

import lombok.Data;

import java.math.BigDecimal;

@Data
public class AbrirCajaRequest {
    private BigDecimal montoInicial = BigDecimal.ZERO;
    private String observacionesApertura;
}
