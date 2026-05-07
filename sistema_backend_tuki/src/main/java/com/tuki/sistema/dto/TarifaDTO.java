package com.tuki.sistema.dto;
import lombok.Data;
import java.math.BigDecimal;

@Data
public class TarifaDTO {
    private Long idTarifa;
    private Long idRuta;
    private Long idPuertoOrigen;
    private Long idPuertoDestino;
    private String nombreRuta;
    private String nombreOrigen;
    private String nombreDestino;
    private BigDecimal precio;
}