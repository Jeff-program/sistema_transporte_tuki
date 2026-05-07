package com.tuki.sistema.entity;

import jakarta.persistence.*;
import lombok.Data;
import java.math.BigDecimal;

@Data
@Entity
@Table(name = "venta_detalle")
public class VentaDetalle {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "id_detalle")
    private Long idDetalle;

    @ManyToOne
    @JoinColumn(name = "id_venta", nullable = false)
    private Venta venta;

    @ManyToOne
    @JoinColumn(name = "id_pasajero", nullable = false)
    private Pasajero pasajero;

    @ManyToOne
    @JoinColumn(name = "id_asiento", nullable = false)
    private Asiento asiento;

    @ManyToOne
    @JoinColumn(name = "id_puerto_origen", nullable = false)
    private Puerto puertoOrigen;

    @ManyToOne
    @JoinColumn(name = "id_puerto_destino", nullable = false)
    private Puerto puertoDestino;

    @Column(name = "precio_unitario", nullable = false, precision = 10, scale = 2)
    private BigDecimal precioUnitario;

    @Column(name = "estado_pasaje", length = 20)
    private String estadoPasaje = "VENDIDO"; 
}