package com.tuki.sistema.dto;
import lombok.Data;

@Data
public class UsuarioDTO {
    private Long idUsuario;
    private String nombreCompleto;
    private String email;
    private String rol;
    private String fotoUrl;
    private String estado;
    private Long idAgencia;
}