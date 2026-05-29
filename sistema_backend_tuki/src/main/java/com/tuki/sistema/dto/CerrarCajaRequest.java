package com.tuki.sistema.dto;

import lombok.Data;

import java.math.BigDecimal;

@Data
public class CerrarCajaRequest {
    private BigDecimal montoDeclaradoEfectivo = BigDecimal.ZERO;
    private String observacionesCierre;
}
