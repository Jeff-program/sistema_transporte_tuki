package com.tuki.sistema.service;

import com.tuki.sistema.dto.PasajeDTO;
import com.tuki.sistema.dto.VentaDTO;
import com.tuki.sistema.entity.*;
import com.tuki.sistema.repository.*;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

@Service
public class VentaService {

    @Autowired private ViajeRepository viajeRepository;
    @Autowired private VentaRepository ventaRepository;
    @Autowired private VentaDetalleRepository detalleRepository;
    @Autowired private PasajeroRepository pasajeroRepository;
    @Autowired private PuertoRepository puertoRepository;
    @Autowired private AsientoRepository asientoRepository;
    @Autowired private CajaTurnoRepository cajaTurnoRepository;
    @Autowired private UsuarioRepository usuarioRepository;
    @Autowired private PagoRepository pagoRepository;
    @Autowired private FacturacionService facturacionService;
    @Autowired private ViajeEscalaRepository viajeEscalaRepository;
    @Autowired private RutaEscalaRepository rutaEscalaRepository;
    @Autowired private ComprobanteRepository comprobanteRepository;
    @Autowired private CancelacionRepository cancelacionRepository;

    private int getOrdenEscala(Viaje viaje, Long idPuerto) {
        if (viaje != null && viaje.getRuta() != null) {
            if (viaje.getRuta().getOrigen().getIdPuerto().equals(idPuerto)) return 0;
            if (viaje.getRuta().getDestino().getIdPuerto().equals(idPuerto)) return 999;

            List<ViajeEscala> escalas = viajeEscalaRepository.findByViaje_IdViajeOrderByOrdenAsc(viaje.getIdViaje());
            for (ViajeEscala e : escalas) {
                if (e.getPuerto().getIdPuerto().equals(idPuerto)) return e.getOrden();
            }

            List<RutaEscala> escalasRuta = rutaEscalaRepository.findByRuta_IdRutaOrderByOrdenAsc(viaje.getRuta().getIdRuta());
            for (RutaEscala e : escalasRuta) {
                if (e.getPuerto().getIdPuerto().equals(idPuerto)) return e.getOrden();
            }
        }
        return -1;
    }

    private boolean tramosSeCruzan(int origenA, int destinoA, int origenB, int destinoB) {
        return origenA < destinoB && destinoA > origenB;
    }

    @Transactional(readOnly = true)
    public Map<String, String> obtenerEstadoAsientos(Long idViaje, Long idPuertoOrigen, Long idPuertoDestino) {
        Map<String, String> mapaOcupados = new HashMap<>();

        Viaje viaje = viajeRepository.findById(idViaje).orElse(null);
        if (viaje == null) return mapaOcupados;

        int ordenOrigenDeseado = getOrdenEscala(viaje, idPuertoOrigen);
        int ordenDestinoDeseado = getOrdenEscala(viaje, idPuertoDestino);

        List<VentaDetalle> detalles = detalleRepository.findByVenta_Viaje_IdViajeAndEstadoPasaje(idViaje, "VENDIDO");

        for (VentaDetalle detalle : detalles) {
            if (detalle.getAsiento() == null || detalle.getPuertoOrigen() == null || detalle.getPuertoDestino() == null) continue;

            int ordenOrigenVenta = getOrdenEscala(viaje, detalle.getPuertoOrigen().getIdPuerto());
            int ordenDestinoVenta = getOrdenEscala(viaje, detalle.getPuertoDestino().getIdPuerto());

            if (ordenOrigenVenta < ordenDestinoDeseado && ordenDestinoVenta > ordenOrigenDeseado) {
                mapaOcupados.put(detalle.getAsiento().getNumero(), "VENDIDO");
            }
        }
        return mapaOcupados;
    }

    @Transactional
    public Map<String, Object> registrarVentaGrupal(VentaDTO dto, Long idUsuarioVendedorReal) {
        if (dto.getPasajes() == null || dto.getPasajes().isEmpty()) {
            throw new RuntimeException("La venta debe incluir al menos un pasaje.");
        }

        Viaje viaje = viajeRepository.findByIdWithLock(dto.getIdViaje())
                .orElseThrow(() -> new RuntimeException("Viaje no encontrado"));

        if (!"PROGRAMADO".equalsIgnoreCase(viaje.getEstado())) {
            throw new RuntimeException("Solo se pueden vender pasajes de viajes programados.");
        }

        CajaTurno cajaTurno = cajaTurnoRepository.findByUsuario_IdUsuarioAndEstado(idUsuarioVendedorReal, "ABIERTO")
                .orElseThrow(() -> new RuntimeException("OPERACIÃ“N RECHAZADA: No tienes un turno de caja abierto. Debes ABRIR TU CAJA primero para poder realizar ventas."));

        Usuario vendedorReal = usuarioRepository.findById(idUsuarioVendedorReal)
                .orElseThrow(() -> new RuntimeException("Vendedor no encontrado"));

        Venta venta = new Venta();
        venta.setViaje(viaje);
        venta.setCajaTurno(cajaTurno);
        venta.setUsuarioVendedor(vendedorReal);
        venta.setFechaVenta(LocalDateTime.now());
        venta.setEstado("COMPLETADA");

        List<VentaDetalle> listaDetalles = new ArrayList<>();
        BigDecimal totalCalculado = BigDecimal.ZERO;

        for (PasajeDTO pDto : dto.getPasajes()) {
            if (pDto.getNumeroAsientoTexto() == null || pDto.getNumeroAsientoTexto().trim().isEmpty()) {
                throw new RuntimeException("Todos los pasajes deben tener asiento.");
            }
            if (pDto.getPrecio() == null || pDto.getPrecio().compareTo(BigDecimal.ZERO) <= 0) {
                throw new RuntimeException("El precio de cada pasaje debe ser mayor a cero.");
            }

            String numeroAsiento = pDto.getNumeroAsientoTexto().trim();
            Integer capacidad = viaje.getEmbarcacion().getCapacidad();
            if (capacidad != null && numeroAsiento.matches("\\d+") && Integer.parseInt(numeroAsiento) > capacidad) {
                throw new RuntimeException("El asiento " + numeroAsiento + " supera la capacidad de la embarcacion.");
            }

            Asiento asiento = asientoRepository.findByEmbarcacion_IdEmbarcacionAndNumero(
                    viaje.getEmbarcacion().getIdEmbarcacion(), numeroAsiento)
                    .orElseGet(() -> {
                        Asiento nuevoAsiento = new Asiento();
                        nuevoAsiento.setEmbarcacion(viaje.getEmbarcacion());
                        nuevoAsiento.setNumero(numeroAsiento);
                        nuevoAsiento.setEstadoActual("DISPONIBLE");
                        return asientoRepository.save(nuevoAsiento);
                    });

            int ordenOrigenDeseado = getOrdenEscala(viaje, pDto.getIdPuertoOrigen());
            int ordenDestinoDeseado = getOrdenEscala(viaje, pDto.getIdPuertoDestino());
            if (ordenOrigenDeseado < 0 || ordenDestinoDeseado < 0 || ordenOrigenDeseado >= ordenDestinoDeseado) {
                throw new RuntimeException("El tramo seleccionado para el asiento " + asiento.getNumero() + " no es valido.");
            }

            List<VentaDetalle> ventasPrevias = detalleRepository.findByVenta_Viaje_IdViajeAndAsiento_IdAsientoAndEstadoPasaje(
                    viaje.getIdViaje(), asiento.getIdAsiento(), "VENDIDO");

            for (VentaDetalle vda : ventasPrevias) {
                if (vda.getPuertoOrigen() == null || vda.getPuertoDestino() == null) continue;

                int ordenOrigenVenta = getOrdenEscala(viaje, vda.getPuertoOrigen().getIdPuerto());
                int ordenDestinoVenta = getOrdenEscala(viaje, vda.getPuertoDestino().getIdPuerto());

                if (tramosSeCruzan(ordenOrigenVenta, ordenDestinoVenta, ordenOrigenDeseado, ordenDestinoDeseado)) {
                    throw new RuntimeException("El asiento " + asiento.getNumero() + " ya estÃ¡ ocupado para el tramo seleccionado.");
                }
            }

            for (VentaDetalle detalleActual : listaDetalles) {
                if (detalleActual.getAsiento().getIdAsiento().equals(asiento.getIdAsiento())) {
                    int ordenOrigenActual = getOrdenEscala(viaje, detalleActual.getPuertoOrigen().getIdPuerto());
                    int ordenDestinoActual = getOrdenEscala(viaje, detalleActual.getPuertoDestino().getIdPuerto());
                    if (tramosSeCruzan(ordenOrigenActual, ordenDestinoActual, ordenOrigenDeseado, ordenDestinoDeseado)) {
                        throw new RuntimeException("El asiento " + asiento.getNumero() + " esta duplicado en la misma venta para tramos que se cruzan.");
                    }
                }
            }

            Pasajero pasajero = pasajeroRepository.findByNumeroDocumento(pDto.getNumeroDocumento()).orElse(new Pasajero());
            pasajero.setTipoDocumento(pDto.getTipoDocumento());
            pasajero.setNumeroDocumento(pDto.getNumeroDocumento());
            pasajero.setNombres(pDto.getNombres().trim().toUpperCase());
            pasajero.setApellidoPaterno(pDto.getApellidoPaterno().trim().toUpperCase());
            pasajero.setApellidoMaterno(pDto.getApellidoMaterno() != null ? pDto.getApellidoMaterno().trim().toUpperCase() : "");
            pasajero.setNacionalidad(pDto.getNacionalidad() != null ? pDto.getNacionalidad().trim().toUpperCase() : "PERUANA");
            pasajero.setFechaNacimiento(pDto.getFechaNacimiento());
            pasajero.setTelefono(pDto.getTelefono());
            pasajero = pasajeroRepository.save(pasajero);

            Puerto origen = puertoRepository.findById(pDto.getIdPuertoOrigen()).orElseThrow();
            Puerto destino = puertoRepository.findById(pDto.getIdPuertoDestino()).orElseThrow();

            VentaDetalle detalle = new VentaDetalle();
            detalle.setVenta(venta);
            detalle.setPasajero(pasajero);
            detalle.setAsiento(asiento);
            detalle.setPuertoOrigen(origen);
            detalle.setPuertoDestino(destino);
            detalle.setPrecioUnitario(pDto.getPrecio());
            detalle.setEstadoPasaje("VENDIDO");

            listaDetalles.add(detalle);
            totalCalculado = totalCalculado.add(pDto.getPrecio());
        }

        BigDecimal subtotal = totalCalculado.divide(new BigDecimal("1.18"), 2, java.math.RoundingMode.HALF_UP);
        BigDecimal igv = totalCalculado.subtract(subtotal);

        venta.setSubtotal(subtotal);
        venta.setIgv(igv);
        venta.setTotal(totalCalculado);
        venta.setDetalles(listaDetalles);

        venta = ventaRepository.save(venta);

        Pago pago = new Pago();
        pago.setVenta(venta);
        pago.setMetodoPago(dto.getMetodoPago() != null ? dto.getMetodoPago().toUpperCase() : "EFECTIVO");
        pago.setMonto(totalCalculado);
        pago.setReferenciaOperacion(dto.getReferenciaPago());
        pagoRepository.save(pago);

        Comprobante comprobante = facturacionService.procesarComprobanteElectronico(
                venta, pago, dto.getTipoComprobante(), dto.getDocumentoCliente(), dto.getRazonSocialNombre());

        Map<String, Object> response = new HashMap<>();
        response.put("idVenta", venta.getIdVenta());
        response.put("serie", comprobante.getSerie());
        response.put("correlativo", comprobante.getNumeroCorrelativo());
        response.put("total", venta.getTotal());
        response.put("nombreVendedor", vendedorReal.getNombreCompleto());

        return response;
    }

    public List<Map<String, Object>> obtenerManifiesto(Long idViaje) {
        List<VentaDetalle> detalles = detalleRepository.findByVenta_Viaje_IdViaje(idViaje);
        List<Map<String, Object>> lista = new ArrayList<>();

        Viaje viaje = viajeRepository.findById(idViaje).orElse(null);

        for (VentaDetalle d : detalles) {
            Map<String, Object> map = new HashMap<>();

            map.put("idVenta", d.getVenta() != null ? d.getVenta().getIdVenta() : d.getIdDetalle());
            map.put("idDetalle", d.getIdDetalle());
            map.put("asiento", d.getAsiento() != null ? d.getAsiento().getNumero() : "S/A");
            map.put("estado", d.getEstadoPasaje());
            map.put("monto", d.getPrecioUnitario());

            if (d.getPasajero() != null) {
                map.put("nombres", d.getPasajero().getNombres());
                map.put("apellidoPaterno", d.getPasajero().getApellidoPaterno());
                map.put("apellidoMaterno", d.getPasajero().getApellidoMaterno());
                map.put("documento", d.getPasajero().getNumeroDocumento());
                map.put("tipoDocumento", d.getPasajero().getTipoDocumento());
                map.put("nacionalidad", d.getPasajero().getNacionalidad());
                map.put("telefono", d.getPasajero().getTelefono());
                map.put("fechaNacimiento", d.getPasajero().getFechaNacimiento() != null ? d.getPasajero().getFechaNacimiento().toString() : null);
            }

            if (d.getPuertoOrigen() != null) {
                map.put("origen", d.getPuertoOrigen().getCiudad());
                map.put("nombrePuerto", d.getPuertoOrigen().getNombrePuerto());

                if(viaje != null) {
                    map.put("ordenOrigen", getOrdenEscala(viaje, d.getPuertoOrigen().getIdPuerto()));
                }
            }
            if (d.getPuertoDestino() != null) {
                map.put("destino", d.getPuertoDestino().getCiudad());

                if(viaje != null) {
                    map.put("ordenDestino", getOrdenEscala(viaje, d.getPuertoDestino().getIdPuerto()));
                }
            }

            if (d.getVenta() != null) {
                map.put("fechaVenta", d.getVenta().getFechaVenta() != null ? d.getVenta().getFechaVenta().toString() : null);

                if (d.getVenta().getUsuarioVendedor() != null) {
                    map.put("vendedor", d.getVenta().getUsuarioVendedor().getNombreCompleto());
                    if (d.getVenta().getUsuarioVendedor().getAgencia() != null) {
                        map.put("agencia", d.getVenta().getUsuarioVendedor().getAgencia().getNombreAgencia());
                    }
                }

                List<Pago> pagos = pagoRepository.findByVenta_IdVenta(d.getVenta().getIdVenta());
                if (!pagos.isEmpty()) {
                    map.put("metodoPago", pagos.get(0).getMetodoPago());
                }

                List<Comprobante> comprobantes = comprobanteRepository.findByVenta_IdVenta(d.getVenta().getIdVenta());
                if (!comprobantes.isEmpty()) {
                    Comprobante compFinal = comprobantes.get(0);

                    if ("ANULADO".equals(d.getEstadoPasaje()) || "CANCELADO".equals(d.getEstadoPasaje())) {
                        for (Comprobante c : comprobantes) {
                            if ("NOTA_CREDITO".equals(c.getTipoComprobante())) {
                                compFinal = c;
                            }
                        }
                    }

                    map.put("serie", compFinal.getSerie());
                    map.put("correlativo", compFinal.getNumeroCorrelativo());
                }

                if (d.getVenta().getCajaTurno() != null) {
                    Map<String, Object> turnoMap = new HashMap<>();
                    CajaTurno ct = d.getVenta().getCajaTurno();
                    turnoMap.put("idTurno", ct.getIdTurno());
                    turnoMap.put("estado", ct.getEstado());
                    turnoMap.put("diferencia", ct.getDiferencia());
                    turnoMap.put("saldoInicial", ct.getSaldoInicial());
                    turnoMap.put("saldoFinal", ct.getSaldoFinal());
                    turnoMap.put("fechaApertura", ct.getFechaApertura() != null ? ct.getFechaApertura().toString() : null);
                    turnoMap.put("fechaCierre", ct.getFechaCierre() != null ? ct.getFechaCierre().toString() : null);
                    map.put("cajaTurno", turnoMap);
                }
            }

            lista.add(map);
        }
        return lista;
    }

    public Map<String, Object> obtenerDetalleVenta(Long idVentaDetalle) {
        VentaDetalle d = detalleRepository.findById(idVentaDetalle)
                .orElseThrow(() -> new RuntimeException("Detalle de venta no encontrado"));

        Map<String, Object> map = new HashMap<>();

        map.put("idVenta", d.getVenta() != null ? d.getVenta().getIdVenta() : d.getIdDetalle());
        map.put("asiento", d.getAsiento() != null ? d.getAsiento().getNumero() : "S/A");
        map.put("estado", d.getEstadoPasaje());
        map.put("monto", d.getPrecioUnitario());

        if (d.getPasajero() != null) {
            map.put("nombres", d.getPasajero().getNombres());
            map.put("apellidoPaterno", d.getPasajero().getApellidoPaterno());
            map.put("apellidoMaterno", d.getPasajero().getApellidoMaterno());
            map.put("documento", d.getPasajero().getNumeroDocumento());
            map.put("tipoDocumento", d.getPasajero().getTipoDocumento());
            map.put("nacionalidad", d.getPasajero().getNacionalidad());
            map.put("telefono", d.getPasajero().getTelefono());
            map.put("fechaNacimiento", d.getPasajero().getFechaNacimiento() != null ? d.getPasajero().getFechaNacimiento().toString() : null);
        }

        if (d.getPuertoOrigen() != null) {
            map.put("origen", d.getPuertoOrigen().getCiudad());
            map.put("nombrePuerto", d.getPuertoOrigen().getNombrePuerto());
            map.put("direccionOrigen", d.getPuertoOrigen().getDireccion());
        }

        if (d.getPuertoDestino() != null) {
            map.put("destino", d.getPuertoDestino().getCiudad());
        }

        if (d.getVenta() != null && d.getVenta().getUsuarioVendedor() != null) {
            map.put("vendedor", d.getVenta().getUsuarioVendedor().getNombreCompleto());
        }

        if (d.getVenta() != null) {
            List<Comprobante> comprobantes = comprobanteRepository.findByVenta_IdVenta(d.getVenta().getIdVenta());
            if (!comprobantes.isEmpty()) {
                Comprobante compFinal = comprobantes.get(0);

                if ("ANULADO".equals(d.getEstadoPasaje()) || "CANCELADO".equals(d.getEstadoPasaje())) {
                    for (Comprobante c : comprobantes) {
                        if ("NOTA_CREDITO".equals(c.getTipoComprobante())) {
                            compFinal = c;
                        }
                    }
                }

                map.put("serie", compFinal.getSerie());
                map.put("correlativo", compFinal.getNumeroCorrelativo());
                map.put("tipoComprobante", compFinal.getTipoComprobante());
                map.put("documentoClienteComprobante", compFinal.getDocumentoCliente() != null ? compFinal.getDocumentoCliente() : compFinal.getRuc());
                map.put("razonSocialComprobante", compFinal.getRazonSocialCliente());
            }

            if (d.getVenta().getCajaTurno() != null) {
                Map<String, Object> turnoMap = new HashMap<>();
                CajaTurno ct = d.getVenta().getCajaTurno();
                turnoMap.put("idTurno", ct.getIdTurno());
                turnoMap.put("estado", ct.getEstado());
                turnoMap.put("diferencia", ct.getDiferencia());
                turnoMap.put("saldoInicial", ct.getSaldoInicial());
                turnoMap.put("saldoFinal", ct.getSaldoFinal());
                turnoMap.put("fechaApertura", ct.getFechaApertura() != null ? ct.getFechaApertura().toString() : null);
                turnoMap.put("fechaCierre", ct.getFechaCierre() != null ? ct.getFechaCierre().toString() : null);
                map.put("cajaTurno", turnoMap);
            }
        }

        if (d.getVenta() != null) {
            List<Pago> pagos = pagoRepository.findByVenta_IdVenta(d.getVenta().getIdVenta());
            if (!pagos.isEmpty()) {
                Pago p = pagos.get(0);
                map.put("metodoPago", p.getMetodoPago());
                map.put("montoRecibido", p.getMonto());
                map.put("vuelto", 0);
            }
        }

        return map;
    }

    @Transactional
    public void anularVenta(Long idViaje, String identificador, Usuario usuarioQueAnula) {
        try {
            Long idDetalle = Long.parseLong(identificador);

            VentaDetalle d = detalleRepository.findById(idDetalle)
                    .orElseThrow(() -> new RuntimeException("No se encontrÃ³ el boleto exacto"));

            if (d.getVenta() == null || d.getVenta().getViaje() == null || !d.getVenta().getViaje().getIdViaje().equals(idViaje)) {
                throw new RuntimeException("El boleto no pertenece al viaje indicado.");
            }
            if (!"VENDIDO".equalsIgnoreCase(d.getEstadoPasaje())) {
                throw new RuntimeException("El boleto ya fue anulado o no esta disponible para anulacion.");
            }

            CajaTurno turnoActivo = cajaTurnoRepository.findByUsuario_IdUsuarioAndEstado(usuarioQueAnula.getIdUsuario(), "ABIERTO")
                    .orElseThrow(() -> new RuntimeException("OPERACIÃ“N RECHAZADA: Para procesar una devoluciÃ³n debes tener tu caja ABIERTA."));

            d.setEstadoPasaje("ANULADO");
            detalleRepository.save(d);

            LocalDateTime fechaVenta = d.getVenta().getFechaVenta();
            LocalDateTime ahora = LocalDateTime.now();
            long horasTranscurridas = java.time.Duration.between(fechaVenta, ahora).toHours();

            BigDecimal montoOriginal = d.getPrecioUnitario();
            BigDecimal montoAdevolver;

            if (horasTranscurridas <= 24) {
                montoAdevolver = montoOriginal;
            } else {
                montoAdevolver = montoOriginal.divide(new BigDecimal("2"), 2, java.math.RoundingMode.HALF_UP); // Devuelve el 50%
            }

            Cancelacion cancelacion = new Cancelacion();
            cancelacion.setVenta(d.getVenta());
            cancelacion.setViaje(d.getVenta().getViaje());
            cancelacion.setUsuarioAutoriza(usuarioQueAnula);
            cancelacion.setCajaTurno(turnoActivo);

            cancelacion.setMotivo("AnulaciÃ³n de Asiento: " + d.getAsiento().getNumero() + " (" + horasTranscurridas + "h transcurridas).");
            cancelacion.setMontoDevuelto(montoAdevolver);
            cancelacion.setFechaCancelacion(ahora);
            cancelacion.setTipoResolucion("DEVOLUCION_EFECTIVO");

            cancelacionRepository.save(cancelacion);

            facturacionService.generarNotaCredito(d.getVenta(), cancelacion.getMotivo());

        } catch (NumberFormatException e) {
            throw new RuntimeException("El identificador del boleto enviado no es vÃ¡lido.");
        }
    }

    @Transactional(readOnly = true)
    public List<Map<String, Object>> obtenerVentasDelTurnoActual(Long idUsuario) {
        CajaTurno turnoActual = cajaTurnoRepository.findTopByUsuario_IdUsuarioOrderByIdTurnoDesc(idUsuario)
                .orElse(null);

        if (turnoActual == null) {
            return new ArrayList<>();
        }

        List<Venta> ventas = ventaRepository.findByCajaTurno_IdTurno(turnoActual.getIdTurno());

        List<Map<String, Object>> listaSegura = new ArrayList<>();

        for (Venta v : ventas) {
            Map<String, Object> map = new HashMap<>();
            map.put("idVenta", v.getIdVenta());
            map.put("fechaVenta", v.getFechaVenta() != null ? v.getFechaVenta().toString() : null);
            map.put("total", v.getTotal());

            List<Pago> pagos = pagoRepository.findByVenta_IdVenta(v.getIdVenta());
            if (!pagos.isEmpty()) {
                map.put("metodoPago", pagos.get(0).getMetodoPago());
            } else {
                map.put("metodoPago", "EFECTIVO");
            }

            listaSegura.add(map);
        }

        return listaSegura;
    }
}
