package com.tuki.sistema.dto;

import lombok.Data;

@Data
public class UsuarioRegistroRequest {
    private String nombreCompleto;
    private String email;
    private String password;
    private String rol;
    private Long idAgencia;
}
