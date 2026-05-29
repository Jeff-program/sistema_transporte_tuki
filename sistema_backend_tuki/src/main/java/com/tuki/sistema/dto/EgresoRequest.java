package com.tuki.sistema.dto;

import lombok.Data;

import java.math.BigDecimal;

@Data
public class EgresoRequest {
    private String concepto;
    private BigDecimal monto;
}
