package com.tuki.sistema.dto;

import lombok.AllArgsConstructor;
import lombok.Data;

import java.io.ByteArrayInputStream;

@Data
@AllArgsConstructor
public class ReporteArchivo {
    private ByteArrayInputStream contenido;
    private String nombreArchivo;
}
