package com.tuki.sistema.dto;
import lombok.Data;

@Data
public class EmbarcacionDTO {
    private Long idEmbarcacion;
    private String nombre;
    private String matricula;
    private Integer capacidad;
    private String estado;
    private Integer numeroFilas; 
    private String distribucionColumnas;
}