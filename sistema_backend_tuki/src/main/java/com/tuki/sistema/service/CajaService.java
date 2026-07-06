package com.tuki.sistema.service;

import com.tuki.sistema.dto.AbrirCajaRequest;
import com.tuki.sistema.dto.CerrarCajaRequest;
import com.tuki.sistema.dto.EgresoDTO;
import com.tuki.sistema.dto.EgresoRequest;
import com.tuki.sistema.entity.CajaTurno;
import com.tuki.sistema.entity.Cancelacion;
import com.tuki.sistema.entity.Egreso;
import com.tuki.sistema.entity.Pago;
import com.tuki.sistema.entity.Usuario;
import com.tuki.sistema.repository.CajaTurnoRepository;
import com.tuki.sistema.repository.CancelacionRepository;
import com.tuki.sistema.repository.EgresoRepository;
import com.tuki.sistema.repository.PagoRepository;
import com.tuki.sistema.repository.UsuarioRepository;
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

    public Object obtenerCajaActivaRespuesta(Long idUsuario) {
        CajaTurno caja = obtenerCajaActiva(idUsuario);
        return caja != null ? caja : Map.of("estado", "INACTIVO");
    }

    @Transactional
    public CajaTurno abrirCaja(Long idUsuario, AbrirCajaRequest request) {
        BigDecimal montoInicial = request != null && request.getMontoInicial() != null
                ? request.getMontoInicial()
                : BigDecimal.ZERO;
        String observaciones = request != null ? request.getObservacionesApertura() : null;
        return abrirCaja(idUsuario, montoInicial, observaciones);
    }

    @Transactional
    public CajaTurno abrirCaja(Long idUsuario, BigDecimal montoInicial, String observacionesApertura) {
        BigDecimal saldoInicial = montoSeguro(montoInicial);
        if (saldoInicial.compareTo(BigDecimal.ZERO) < 0) {
            throw new RuntimeException("El saldo inicial no puede ser negativo.");
        }

        if (obtenerCajaActiva(idUsuario) != null) {
            throw new RuntimeException("Ya tienes un turno de caja abierto. Cierra el anterior primero.");
        }

        Usuario usuario = usuarioRepository.findByIdWithLock(idUsuario)
                .orElseThrow(() -> new RuntimeException("Usuario no encontrado en la base de datos."));

        if (obtenerCajaActiva(idUsuario) != null) {
            throw new RuntimeException("Ya tienes un turno de caja abierto. Cierra el anterior primero.");
        }

        CajaTurno nuevaCaja = new CajaTurno();
        nuevaCaja.setUsuario(usuario);
        nuevaCaja.setAgencia(usuario.getAgencia());
        nuevaCaja.setSaldoInicial(saldoInicial);
        nuevaCaja.setObservacionesApertura(observacionesApertura);
        nuevaCaja.setEstado("ABIERTO");
        nuevaCaja.setArqueoGuardado(false);
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
        validarTurnoSinArqueo(turno);

        Egreso egreso = new Egreso();
        egreso.setCajaTurno(turno);
        egreso.setConcepto(concepto.trim());
        egreso.setMonto(monto);
        egreso.setFechaEgreso(LocalDateTime.now());

        egreso = egresoRepository.save(egreso);

        EgresoDTO dto = new EgresoDTO();
        dto.setIdEgreso(egreso.getIdEgreso());
        dto.setIdTurno(turno.getIdTurno());
        dto.setConcepto(egreso.getConcepto());
        dto.setMonto(egreso.getMonto());
        dto.setFechaEgreso(egreso.getFechaEgreso());

        return dto;
    }

    @Transactional
    public EgresoDTO registrarEgreso(Long idUsuario, EgresoRequest request) {
        String concepto = request != null ? request.getConcepto() : null;
        BigDecimal monto = request != null ? request.getMonto() : null;
        return registrarEgreso(idUsuario, concepto, monto);
    }

    @Transactional(readOnly = true)
    public Map<String, Object> obtenerResumenMovimientos(Long idUsuario) {
        CajaTurno turno = cajaTurnoRepository.findByUsuario_IdUsuarioAndEstado(idUsuario, "ABIERTO")
                .orElseThrow(() -> new RuntimeException("No tienes ningun turno de caja abierto en este momento."));

        ResumenCaja resumenCaja = calcularResumen(turno);

        Map<String, Object> resumen = new HashMap<>();
        resumen.put("idTurno", turno.getIdTurno());
        resumen.put("saldoInicial", turno.getSaldoInicial());
        resumen.put("fechaApertura", turno.getFechaApertura().toString());
        resumen.put("totalVentas", resumenCaja.totalVentas);
        resumen.put("totalAnulaciones", resumenCaja.totalAnulacionesEfectivo);
        resumen.put("totalEgresos", resumenCaja.totalEgresos);
        resumen.put("esperadoPorMetodo", resumenCaja.esperadoPorMetodo);
        resumen.put("montoEsperadoGlobal", resumenCaja.montoEsperadoGlobal);
        resumen.put("egresosDetalle", resumenCaja.egresos);
        resumen.put("arqueoGuardado", Boolean.TRUE.equals(turno.getArqueoGuardado()));

        return resumen;
    }

    @Transactional
    public Map<String, Object> cerrarCaja(Long idUsuario, BigDecimal montoDeclaradoEfectivo, String observacionesCierre) {
        return cerrarCaja(idUsuario, montoDeclaradoEfectivo, BigDecimal.ZERO, BigDecimal.ZERO, observacionesCierre);
    }

    @Transactional
    public Map<String, Object> cerrarCaja(Long idUsuario, BigDecimal montoDeclaradoEfectivo, String observacionesCierre, CerrarCajaRequest request) {
        BigDecimal montoEfectivo = montoDeclaradoEfectivo != null
                ? montoDeclaradoEfectivo
                : request != null ? request.getMontoDeclaradoEfectivo() : BigDecimal.ZERO;
        BigDecimal montoYapePlin = request != null ? request.getMontoDeclaradoYapePlin() : BigDecimal.ZERO;
        BigDecimal montoTarjeta = request != null ? request.getMontoDeclaradoTarjeta() : BigDecimal.ZERO;
        String observaciones = observacionesCierre != null
                ? observacionesCierre
                : request != null ? request.getObservacionesCierre() : null;
        return cerrarCaja(idUsuario, montoEfectivo, montoYapePlin, montoTarjeta, observaciones);
    }

    @Transactional
    public Map<String, Object> cerrarCaja(
            Long idUsuario,
            BigDecimal montoDeclaradoEfectivo,
            BigDecimal montoDeclaradoYapePlin,
            BigDecimal montoDeclaradoTarjeta,
            String observacionesCierre) {
        CajaTurno turno = cajaTurnoRepository.findByUsuario_IdUsuarioAndEstado(idUsuario, "ABIERTO")
                .orElseThrow(() -> new RuntimeException("No hay ninguna caja abierta para este usuario."));

        ResumenCaja resumen = calcularResumen(turno);
        BigDecimal declaradoEfectivo = montoSeguro(montoDeclaradoEfectivo);
        BigDecimal declaradoYapePlin = montoSeguro(montoDeclaradoYapePlin);
        BigDecimal declaradoTarjeta = montoSeguro(montoDeclaradoTarjeta);
        BigDecimal declaradoGeneral = declaradoEfectivo.add(declaradoYapePlin).add(declaradoTarjeta);

        turno.setFechaCierre(LocalDateTime.now());
        turno.setObservacionesCierre(observacionesCierre);
        turno.setSaldoFinal(resumen.esperadoEfectivo);
        turno.setDiferencia(declaradoEfectivo.subtract(resumen.esperadoEfectivo));
        turno.setMontoDeclaradoEfectivo(declaradoEfectivo);
        turno.setMontoDeclaradoYapePlin(declaradoYapePlin);
        turno.setMontoDeclaradoTarjeta(declaradoTarjeta);
        turno.setDiferenciaYapePlin(declaradoYapePlin.subtract(resumen.esperadoYapePlin));
        turno.setDiferenciaTarjeta(declaradoTarjeta.subtract(resumen.esperadoTarjeta));
        turno.setDiferenciaGeneral(declaradoGeneral.subtract(resumen.montoEsperadoGlobal));
        turno.setArqueoGuardado(false);
        turno.setEstado("CERRADO");

        cajaTurnoRepository.save(turno);

        Map<String, Object> respuesta = new HashMap<>();
        respuesta.put("turno", turno);
        respuesta.put("desglosePagos", resumen.desgloseMetodos);
        respuesta.put("esperadoEfectivo", resumen.esperadoEfectivo);
        respuesta.put("esperadoYapePlin", resumen.esperadoYapePlin);
        respuesta.put("esperadoTarjeta", resumen.esperadoTarjeta);

        return respuesta;
    }

    @Transactional
    public CajaTurno guardarArqueo(Long idUsuario, CerrarCajaRequest request) {
        CajaTurno turno = cajaTurnoRepository.findByUsuario_IdUsuarioAndEstado(idUsuario, "ABIERTO")
                .orElseThrow(() -> new RuntimeException("No hay ninguna caja abierta para este usuario."));

        turno.setArqueoGuardado(true);
        if (request != null) {
            turno.setMontoDeclaradoEfectivo(montoSeguro(request.getMontoDeclaradoEfectivo()));
            turno.setMontoDeclaradoYapePlin(montoSeguro(request.getMontoDeclaradoYapePlin()));
            turno.setMontoDeclaradoTarjeta(montoSeguro(request.getMontoDeclaradoTarjeta()));
            turno.setObservacionesCierre(request.getObservacionesCierre());
        }
        return cajaTurnoRepository.save(turno);
    }

    @Transactional
    public CajaTurno cancelarArqueo(Long idUsuario) {
        CajaTurno turno = cajaTurnoRepository.findByUsuario_IdUsuarioAndEstado(idUsuario, "ABIERTO")
                .orElseThrow(() -> new RuntimeException("No hay ninguna caja abierta para este usuario."));
        turno.setArqueoGuardado(false);
        return cajaTurnoRepository.save(turno);
    }

    private ResumenCaja calcularResumen(CajaTurno turno) {
        List<Pago> pagos = pagoRepository.findByVenta_CajaTurno_IdTurno(turno.getIdTurno());

        BigDecimal totalVentas = BigDecimal.ZERO;
        Map<String, BigDecimal> desgloseMetodos = new HashMap<>();
        desgloseMetodos.put("EFECTIVO", BigDecimal.ZERO);
        desgloseMetodos.put("YAPE", BigDecimal.ZERO);
        desgloseMetodos.put("PLIN", BigDecimal.ZERO);
        desgloseMetodos.put("TARJETA", BigDecimal.ZERO);
        desgloseMetodos.put("TRANSFERENCIA", BigDecimal.ZERO);

        for (Pago pago : pagos) {
            String metodo = pago.getMetodoPago() != null ? pago.getMetodoPago().toUpperCase().trim() : "EFECTIVO";
            BigDecimal monto = montoSeguro(pago.getMonto());
            totalVentas = totalVentas.add(monto);
            desgloseMetodos.put(metodo, desgloseMetodos.getOrDefault(metodo, BigDecimal.ZERO).add(monto));
        }

        BigDecimal totalAnulacionesEfectivo = BigDecimal.ZERO;
        for (Cancelacion cancelacion : cancelacionRepository.findByCajaTurno_IdTurno(turno.getIdTurno())) {
            if ("DEVOLUCION_EFECTIVO".equals(cancelacion.getTipoResolucion())) {
                totalAnulacionesEfectivo = totalAnulacionesEfectivo.add(montoSeguro(cancelacion.getMontoDevuelto()));
            }
        }

        List<Egreso> egresos = egresoRepository.findByCajaTurno_IdTurno(turno.getIdTurno());
        BigDecimal totalEgresos = BigDecimal.ZERO;
        for (Egreso egreso : egresos) {
            totalEgresos = totalEgresos.add(montoSeguro(egreso.getMonto()));
        }

        BigDecimal esperadoEfectivo = montoSeguro(turno.getSaldoInicial())
                .add(desgloseMetodos.get("EFECTIVO"))
                .subtract(totalAnulacionesEfectivo)
                .subtract(totalEgresos);
        BigDecimal esperadoYapePlin = desgloseMetodos.get("YAPE").add(desgloseMetodos.get("PLIN"));
        BigDecimal esperadoTarjeta = desgloseMetodos.get("TARJETA");

        Map<String, BigDecimal> esperadoPorMetodo = new HashMap<>(desgloseMetodos);
        esperadoPorMetodo.put("EFECTIVO", esperadoEfectivo);

        BigDecimal montoEsperadoGlobal = BigDecimal.ZERO;
        for (BigDecimal valor : esperadoPorMetodo.values()) {
            montoEsperadoGlobal = montoEsperadoGlobal.add(valor);
        }

        ResumenCaja resumen = new ResumenCaja();
        resumen.totalVentas = totalVentas;
        resumen.totalAnulacionesEfectivo = totalAnulacionesEfectivo;
        resumen.totalEgresos = totalEgresos;
        resumen.esperadoEfectivo = esperadoEfectivo;
        resumen.esperadoYapePlin = esperadoYapePlin;
        resumen.esperadoTarjeta = esperadoTarjeta;
        resumen.montoEsperadoGlobal = montoEsperadoGlobal;
        resumen.desgloseMetodos = desgloseMetodos;
        resumen.esperadoPorMetodo = esperadoPorMetodo;
        resumen.egresos = egresos;
        return resumen;
    }

    private void validarTurnoSinArqueo(CajaTurno turno) {
        if (Boolean.TRUE.equals(turno.getArqueoGuardado())) {
            throw new RuntimeException("El arqueo de caja ya fue guardado. Cancela el arqueo antes de registrar ventas o egresos.");
        }
    }

    private BigDecimal montoSeguro(BigDecimal monto) {
        return monto != null ? monto : BigDecimal.ZERO;
    }

    private static class ResumenCaja {
        private BigDecimal totalVentas;
        private BigDecimal totalAnulacionesEfectivo;
        private BigDecimal totalEgresos;
        private BigDecimal esperadoEfectivo;
        private BigDecimal esperadoYapePlin;
        private BigDecimal esperadoTarjeta;
        private BigDecimal montoEsperadoGlobal;
        private Map<String, BigDecimal> desgloseMetodos;
        private Map<String, BigDecimal> esperadoPorMetodo;
        private List<Egreso> egresos;
    }
}
