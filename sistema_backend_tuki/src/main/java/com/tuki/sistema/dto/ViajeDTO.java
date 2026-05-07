package com.tuki.sistema.dto;
import lombok.Data;
import java.time.LocalDate;
import java.time.LocalTime;
@Data
public class ViajeDTO {
    private Long idViaje;
    private String nombreRuta;
    private String nombreEmbarcacion;
    private String matriculaEmbarcacion;
    private LocalDate fechaSalida;
    private LocalTime horaZarpe;
    private Integer cuposDisponibles;
    private String estado; 
    private Long idRuta;
    private Long idEmbarcacion;
    private Integer capacidadTotal;
}