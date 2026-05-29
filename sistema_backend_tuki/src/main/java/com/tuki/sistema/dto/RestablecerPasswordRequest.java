package com.tuki.sistema.dto;

import lombok.Data;

@Data
public class RestablecerPasswordRequest {
    private String email;
    private String codigo;
    private String nuevaPassword;
}
