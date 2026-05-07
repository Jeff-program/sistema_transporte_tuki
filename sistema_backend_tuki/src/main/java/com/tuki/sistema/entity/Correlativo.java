package com.tuki.sistema.entity;

import jakarta.persistence.*;
import lombok.Data;

@Data
@Entity
@Table(name = "correlativos")
public class Correlativo {
    
    @Id
    @Column(length = 4)
    private String serie;

    @Column(name = "ultimo_numero", nullable = false)
    private Long ultimoNumero;
}
