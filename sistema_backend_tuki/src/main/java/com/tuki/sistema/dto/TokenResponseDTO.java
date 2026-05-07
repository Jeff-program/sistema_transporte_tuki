package com.tuki.sistema.dto;
import lombok.Data;
@Data
public class TokenResponseDTO {
    private String accessToken;
    private String tokenType = "Bearer";
    public TokenResponseDTO(String accessToken) {
        this.accessToken = accessToken;
    }
}