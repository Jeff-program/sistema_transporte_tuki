package com.tuki.sistema.dto;

import lombok.Data;
import java.math.BigDecimal;
import java.util.List;

@Data
public class VentaDTO {
    private Long idViaje;
    private Long idTurno;

    private String tipoComprobante; 
    private String documentoCliente; 
    private String razonSocialNombre; 
    private String metodoPago;
    private BigDecimal montoRecibido;
    private BigDecimal vuelto;
    private String referenciaPago;

    private List<PasajeDTO> pasajes;
}