package com.tuki.sistema.entity;

import jakarta.persistence.*;
import lombok.Data;
import java.math.BigDecimal;
import java.time.LocalDateTime;

@Data
@Entity
@Table(name = "cancelaciones")
public class Cancelacion {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "id_cancelacion")
    private Long idCancelacion;

    @ManyToOne
    @JoinColumn(name = "id_venta")
    private Venta venta;

    @ManyToOne
    @JoinColumn(name = "id_viaje")
    private Viaje viaje;

    @ManyToOne
    @JoinColumn(name = "id_usuario_autoriza", nullable = false)
    private Usuario usuarioAutoriza;

    @Column(nullable = false, columnDefinition = "TEXT")
    private String motivo;

    @Column(name = "monto_devuelto", precision = 10, scale = 2)
    private BigDecimal montoDevuelto = BigDecimal.ZERO;

    @Column(name = "fecha_cancelacion")
    private LocalDateTime fechaCancelacion = LocalDateTime.now();

    @Column(name = "tipo_resolucion", length = 50)
    private String tipoResolucion; 

    @ManyToOne
    @JoinColumn(name = "id_turno")
    private CajaTurno cajaTurno;

    public CajaTurno getCajaTurno() { return cajaTurno; }
    public void setCajaTurno(CajaTurno cajaTurno) { this.cajaTurno = cajaTurno; }
}