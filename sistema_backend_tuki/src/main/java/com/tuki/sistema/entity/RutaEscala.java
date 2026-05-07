package com.tuki.sistema.entity;

import jakarta.persistence.*;
import lombok.Data;
import java.time.LocalTime;
import com.fasterxml.jackson.annotation.JsonFormat;

@Data
@Entity
@Table(name = "ruta_escalas")
public class RutaEscala {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "id_escala")
    private Long idEscala;

    @ManyToOne
    @JoinColumn(name = "id_ruta", nullable = false)
    private Ruta ruta;

    @ManyToOne
    @JoinColumn(name = "id_puerto", nullable = false)
    private Puerto puerto;

    @Column(nullable = false)
    private Integer orden;

    @Column(name = "hora_embarque")
    @JsonFormat(pattern = "HH:mm")
    private LocalTime horaEmbarque; 
}