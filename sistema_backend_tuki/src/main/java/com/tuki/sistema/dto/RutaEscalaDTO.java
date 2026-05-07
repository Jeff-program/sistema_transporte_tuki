package com.tuki.sistema.dto;
import lombok.Data;
import java.time.LocalTime;
import com.fasterxml.jackson.annotation.JsonFormat;

@Data
public class RutaEscalaDTO {
    private Long idEscala;
    private Long idRuta;
    private Long idPuerto;
    private String nombrePuerto;
    private Integer orden;
    
    @JsonFormat(pattern = "HH:mm")
    private LocalTime horaEmbarque;
}