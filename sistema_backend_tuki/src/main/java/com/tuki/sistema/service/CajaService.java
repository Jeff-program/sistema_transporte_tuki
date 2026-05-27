package com.tuki.sistema.service;

import com.tuki.sistema.dto.EgresoDTO;
import com.tuki.sistema.entity.CajaTurno;
import com.tuki.sistema.entity.Pago;
import com.tuki.sistema.entity.Usuario;
import com.tuki.sistema.entity.Cancelacion;
import com.tuki.sistema.entity.Egreso;
import com.tuki.sistema.repository.CajaTurnoRepository;
import com.tuki.sistema.repository.PagoRepository;
import com.tuki.sistema.repository.UsuarioRepository;
import com.tuki.sistema.repository.CancelacionRepository;
import com.tuki.sistema.repository.EgresoRepository;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;


import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

@Service
public class CajaService {

    @Autowired private CajaTurnoRepository cajaTurnoRepository;
    @Autowired private PagoRepository pagoRepository;
    @Autowired private UsuarioRepository usuarioRepository;
    @Autowired private CancelacionRepository cancelacionRepository;
    @Autowired private EgresoRepository egresoRepository;

    public CajaTurno obtenerCajaActiva(Long idUsuario) {
        return cajaTurnoRepository.findByUsuario_IdUsuarioAndEstado(idUsuario, "ABIERTO").orElse(null);
    }

    @Transactional
    public CajaTurno abrirCaja(Long idUsuario, BigDecimal montoInicial, String observacionesApertura) {
        BigDecimal saldoInicial = montoInicial != null ? montoInicial : BigDecimal.ZERO;
        if (saldoInicial.compareTo(BigDecimal.ZERO) < 0) {
            throw new RuntimeException("El saldo inicial no puede ser negativo.");
        }

        if (obtenerCajaActiva(idUsuario) != null) {
            throw new RuntimeException("Ya tienes un turno de caja abierto. Cierra el anterior primero.");
        }

        Usuario usuario = usuarioRepository.findById(idUsuario)
                .orElseThrow(() -> new RuntimeException("Usuario no encontrado en la base de datos."));

        CajaTurno nuevaCaja = new CajaTurno();
        nuevaCaja.setUsuario(usuario);
        nuevaCaja.setAgencia(usuario.getAgencia());
        nuevaCaja.setSaldoInicial(saldoInicial);
        nuevaCaja.setObservacionesApertura(observacionesApertura); // SE GUARDA OBSERVACIÃ“N INICIAL
        nuevaCaja.setEstado("ABIERTO");
        nuevaCaja.setFechaApertura(LocalDateTime.now());

        return cajaTurnoRepository.save(nuevaCaja);
    }

    @Transactional
    public EgresoDTO registrarEgreso(Long idUsuario, String concepto, BigDecimal monto) {
        if (concepto == null || concepto.trim().isEmpty()) {
            throw new RuntimeException("El concepto del egreso es obligatorio.");
        }
        if (monto == null || monto.compareTo(BigDecimal.ZERO) <= 0) {
            throw new RuntimeException("El monto del egreso debe ser mayor a cero.");
        }

        CajaTurno turno = cajaTurnoRepository.findByUsuario_IdUsuarioAndEstado(idUsuario, "ABIERTO")
                .orElseThrow(() -> new RuntimeException("No tienes caja abierta para registrar egresos."));

        Egreso egreso = new Egreso();
        egreso.setCajaTurno(turno);
        egreso.setConcepto(concepto);
        egreso.setMonto(monto);
        egreso.setFechaEgreso(LocalDateTime.now());

        egreso = egresoRepository.save(egreso);

        // Convertimos a DTO para mandarlo limpio al Frontend
        EgresoDTO dto = new EgresoDTO();
        dto.setIdEgreso(egreso.getIdEgreso());
        dto.setIdTurno(turno.getIdTurno());
        dto.setConcepto(egreso.getConcepto());
        dto.setMonto(egreso.getMonto());
        dto.setFechaEgreso(egreso.getFechaEgreso());

        return dto;
    }

    @Transactional(readOnly = true)
    public Map<String, Object> obtenerResumenMovimientos(Long idUsuario) {
        CajaTurno turno = cajaTurnoRepository.findByUsuario_IdUsuarioAndEstado(idUsuario, "ABIERTO")
                .orElseThrow(() -> new RuntimeException("No tienes ningÃºn turno de caja abierto en este momento."));

        List<Pago> pagos = pagoRepository.findByVenta_CajaTurno_IdTurno(turno.getIdTurno());

        BigDecimal totalVentas = BigDecimal.ZERO;
        Map<String, BigDecimal> desgloseMetodos = new HashMap<>();
        desgloseMetodos.put("EFECTIVO", BigDecimal.ZERO);
        desgloseMetodos.put("YAPE", BigDecimal.ZERO);
        desgloseMetodos.put("PLIN", BigDecimal.ZERO);
        desgloseMetodos.put("TARJETA", BigDecimal.ZERO);
        desgloseMetodos.put("TRANSFERENCIA", BigDecimal.ZERO);

        for (Pago p : pagos) {
            String metodo = p.getMetodoPago() != null ? p.getMetodoPago().toUpperCase().trim() : "EFECTIVO";
            BigDecimal monto = p.getMonto() != null ? p.getMonto() : BigDecimal.ZERO;
            totalVentas = totalVentas.add(monto);
            desgloseMetodos.put(metodo, desgloseMetodos.getOrDefault(metodo, BigDecimal.ZERO).add(monto));
        }

        // 2. Anulaciones (Solo las que se devolviÃ³ efectivo en ESTE turno)
        List<Cancelacion> cancelaciones = cancelacionRepository.findByCajaTurno_IdTurno(turno.getIdTurno());
        BigDecimal totalAnulacionesEfectivo = BigDecimal.ZERO;
        for (Cancelacion c : cancelaciones) {
            if ("DEVOLUCION_EFECTIVO".equals(c.getTipoResolucion())) {
                totalAnulacionesEfectivo = totalAnulacionesEfectivo.add(c.getMontoDevuelto() != null ? c.getMontoDevuelto() : BigDecimal.ZERO);
            }
        }

        // 3. Egresos (Gastos, prÃ©stamos, cambio)
        List<Egreso> egresos = egresoRepository.findByCajaTurno_IdTurno(turno.getIdTurno());
        BigDecimal totalEgresos = BigDecimal.ZERO;
        for (Egreso e : egresos) {
            totalEgresos = totalEgresos.add(e.getMonto() != null ? e.getMonto() : BigDecimal.ZERO);
        }

        // 4. Arqueo MultimÃ©todo
        Map<String, BigDecimal> esperadoPorMetodo = new HashMap<>(desgloseMetodos);
        BigDecimal esperadoEfectivo = turno.getSaldoInicial()
                .add(desgloseMetodos.get("EFECTIVO"))
                .subtract(totalAnulacionesEfectivo)
                .subtract(totalEgresos);

        esperadoPorMetodo.put("EFECTIVO", esperadoEfectivo);

        BigDecimal montoEsperadoGlobal = BigDecimal.ZERO;
        for(BigDecimal val : esperadoPorMetodo.values()) {
            montoEsperadoGlobal = montoEsperadoGlobal.add(val);
        }

        Map<String, Object> resumen = new HashMap<>();
        resumen.put("idTurno", turno.getIdTurno());
        resumen.put("saldoInicial", turno.getSaldoInicial());
        resumen.put("fechaApertura", turno.getFechaApertura().toString());
        resumen.put("totalVentas", totalVentas);
        resumen.put("totalAnulaciones", totalAnulacionesEfectivo); // Solo las de efectivo
        resumen.put("totalEgresos", totalEgresos);
        resumen.put("esperadoPorMetodo", esperadoPorMetodo);
        resumen.put("montoEsperadoGlobal", montoEsperadoGlobal);
        resumen.put("egresosDetalle", egresos);

        return resumen;
    }

    @Transactional
    public Map<String, Object> cerrarCaja(Long idUsuario, BigDecimal montoDeclaradoEfectivo, String observacionesCierre) {
        CajaTurno turno = cajaTurnoRepository.findByUsuario_IdUsuarioAndEstado(idUsuario, "ABIERTO")
                .orElseThrow(() -> new RuntimeException("No hay ninguna caja abierta para este usuario."));

        turno.setFechaCierre(LocalDateTime.now());
        turno.setObservacionesCierre(observacionesCierre); // SE GUARDA OBSERVACIÃ“N FINAL

        List<Pago> pagos = pagoRepository.findByVenta_CajaTurno_IdTurno(turno.getIdTurno());

        BigDecimal totalEfectivoVentas = BigDecimal.ZERO;
        Map<String, BigDecimal> desglosePagos = new HashMap<>(); // ALMACENARÃ YAPE, TARJETA, TRANSFERENCIA, ETC.

        for (Pago p : pagos) {
            String metodo = p.getMetodoPago().toUpperCase();
            // Acumulamos el monto por cada mÃ©todo de pago encontrado
            desglosePagos.put(metodo, desglosePagos.getOrDefault(metodo, BigDecimal.ZERO).add(p.getMonto()));

            // Solo el efectivo fÃ­sico altera el cÃ¡lculo de la diferencia de caja
            if ("EFECTIVO".equals(metodo)) {
                totalEfectivoVentas = totalEfectivoVentas.add(p.getMonto());
            }
        }

        BigDecimal totalAnulacionesEfectivo = BigDecimal.ZERO;
        for (Cancelacion c : cancelacionRepository.findByCajaTurno_IdTurno(turno.getIdTurno())) {
            if ("DEVOLUCION_EFECTIVO".equals(c.getTipoResolucion())) {
                totalAnulacionesEfectivo = totalAnulacionesEfectivo.add(c.getMontoDevuelto() != null ? c.getMontoDevuelto() : BigDecimal.ZERO);
            }
        }

        BigDecimal totalEgresos = BigDecimal.ZERO;
        for (Egreso e : egresoRepository.findByCajaTurno_IdTurno(turno.getIdTurno())) {
            totalEgresos = totalEgresos.add(e.getMonto() != null ? e.getMonto() : BigDecimal.ZERO);
        }

        BigDecimal efectivoEnSistema = turno.getSaldoInicial()
                .add(totalEfectivoVentas)
                .subtract(totalAnulacionesEfectivo)
                .subtract(totalEgresos);
        turno.setSaldoFinal(efectivoEnSistema);
        turno.setDiferencia(montoDeclaradoEfectivo.subtract(efectivoEnSistema));
        turno.setEstado("CERRADO");

        cajaTurnoRepository.save(turno);

        // RETORNAMOS UN MAPA CON EL TURNO Y EL DESGLOSE DE MÃ‰TODOS DE PAGO AL FRONTEND
        Map<String, Object> respuesta = new HashMap<>();
        respuesta.put("turno", turno);
        respuesta.put("desglosePagos", desglosePagos);

        return respuesta;
    }
}
