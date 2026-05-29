package com.tuki.sistema.dto;

import lombok.Data;

@Data
public class AgenciaUpdateRequest {
    private String nombreAgencia;
    private String direccion;
    private String telefono;
    private Long idPuerto;
    private AgenciaDTO.PuertoData puerto;
}
