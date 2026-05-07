package com.tuki.sistema.entity;

import jakarta.persistence.*;
import lombok.Data;
import java.time.LocalDateTime;

@Data
@Entity
@Table(name = "comprobantes", uniqueConstraints = {@UniqueConstraint(columnNames = {"tipo_comprobante", "serie", "numero_correlativo"})})
public class Comprobante {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "id_comprobante")
    private Long idComprobante;

    @ManyToOne
    @JoinColumn(name = "id_venta", nullable = false)
    private Venta venta;

    @Column(name = "tipo_comprobante", nullable = false, length = 20)
    private String tipoComprobante; 

    @Column(nullable = false, length = 4)
    private String serie;

    @Column(name = "numero_correlativo", nullable = false)
    private Long numeroCorrelativo; 

    @Column(name = "documento_cliente", length = 20)
    private String documentoCliente;

    @Column(name = "ruc", length = 20)
    private String ruc;

    @Column(name = "razon_social_cliente")
    private String razonSocialCliente;

    @Column(name = "fecha_emision")
    private LocalDateTime fechaEmision = LocalDateTime.now();

    @Column(name = "url_pdf")
    private String urlPdf;

    @Column(name = "xml_hash")
    private String xmlHash;

    @Column(name = "estado_sunat", length = 20)
    private String estadoSunat = "PENDIENTE";
}