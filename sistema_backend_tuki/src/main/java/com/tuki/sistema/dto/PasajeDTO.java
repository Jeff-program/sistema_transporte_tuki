package com.tuki.sistema.dto;

import lombok.Data;
import java.math.BigDecimal;
import java.time.LocalDate;

@Data
public class PasajeDTO {
    private String tipoDocumento;
    private String numeroDocumento;
    private String nombres;
    private String apellidoPaterno;
    private String apellidoMaterno;
    private LocalDate fechaNacimiento;
    private String nacionalidad;
    private String telefono;
    
    private Long idPuertoOrigen;
    private Long idPuertoDestino;
    
    private Long idAsiento; 
    private String numeroAsientoTexto;
    
    private BigDecimal precio;
}