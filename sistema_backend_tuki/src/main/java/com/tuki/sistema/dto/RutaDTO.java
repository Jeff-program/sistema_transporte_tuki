package com.tuki.sistema.dto;
import lombok.Data;
@Data
public class RutaDTO {
    private Long idRuta;
    private String nombreRuta;
    private String origen; 
    private String destino; 
    private String estado;
}