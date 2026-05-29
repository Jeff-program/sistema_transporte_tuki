package com.tuki.sistema.dto;

import lombok.Data;

@Data
public class PerfilUpdateRequest {
    private String nombreCompleto;
    private String email;
    private String nuevaPassword;
    private String passwordActual;
}
