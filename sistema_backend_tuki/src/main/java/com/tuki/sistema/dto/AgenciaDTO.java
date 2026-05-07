package com.tuki.sistema.dto;

import lombok.Data;

@Data 
public class AgenciaDTO {
    private String nombreAgencia;
    private String direccion;
    private String telefono;
    
    private PuertoData puerto; 

    @Data
    public static class PuertoData {
        private Long idPuerto;
    }
}