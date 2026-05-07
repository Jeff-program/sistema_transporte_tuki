package com.tuki.sistema.entity;

import jakarta.persistence.*;
import lombok.Data;

@Data
@Entity
@Table(name = "asientos", uniqueConstraints = {@UniqueConstraint(columnNames = {"id_embarcacion", "numero"})})
public class Asiento {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "id_asiento")
    private Long idAsiento;

    @ManyToOne
    @JoinColumn(name = "id_embarcacion", nullable = false)
    private Embarcacion embarcacion;

    @Column(nullable = false, length = 10)
    private String numero;

    @Column(name = "estado_actual", length = 20)
    private String estadoActual = "DISPONIBLE"; 
}