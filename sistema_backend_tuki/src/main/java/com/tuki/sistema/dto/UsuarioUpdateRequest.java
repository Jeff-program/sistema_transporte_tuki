package com.tuki.sistema.dto;

import com.fasterxml.jackson.annotation.JsonIgnore;
import com.fasterxml.jackson.annotation.JsonSetter;
import lombok.Data;

@Data
public class UsuarioUpdateRequest {
    private String nombreCompleto;
    private String email;
    private String rol;
    private String password;
    private String newPassword;
    private String currentPassword;
    private Long idAgencia;

    @JsonIgnore
    private boolean idAgenciaPresente;

    @JsonSetter("idAgencia")
    public void setIdAgencia(Long idAgencia) {
        this.idAgencia = idAgencia;
        this.idAgenciaPresente = true;
    }
}
