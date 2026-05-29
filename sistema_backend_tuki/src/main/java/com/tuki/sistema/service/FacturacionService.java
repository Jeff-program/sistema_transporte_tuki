package com.tuki.sistema.service;

import com.tuki.sistema.entity.Comprobante;
import com.tuki.sistema.entity.Correlativo;
import com.tuki.sistema.entity.Pago;
import com.tuki.sistema.entity.Venta;
import com.tuki.sistema.repository.ComprobanteRepository;
import com.tuki.sistema.repository.CorrelativoRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.UUID;

@Service
public class FacturacionService {
    private static final Logger log = LoggerFactory.getLogger(FacturacionService.class);

    @Autowired private ComprobanteRepository comprobanteRepository;
    @Autowired private CorrelativoRepository correlativoRepository;

    private Long obtenerSiguienteCorrelativoSeguro(String serie) {
        Correlativo correlativoDB = correlativoRepository.findBySerieWithLock(serie)
            .orElseGet(() -> {
                Correlativo nuevo = new Correlativo();
                nuevo.setSerie(serie);
                nuevo.setUltimoNumero(0L);
                return nuevo;
            });

        Long nuevoCorrelativo = correlativoDB.getUltimoNumero() + 1L;
        correlativoDB.setUltimoNumero(nuevoCorrelativo);
        correlativoRepository.save(correlativoDB);
        
        return nuevoCorrelativo;
    }

    @Transactional
    public Comprobante procesarComprobanteElectronico(
            Venta venta, 
            Pago pago, 
            String tipoComprobante, 
            String documentoCliente, 
            String razonSocial) {

        log.info("Iniciando facturacion electronica. Operacion=emision, moneda=PEN, total={}", venta.getTotal());
        log.debug("Cliente Doc: {}; Denominacion: {}", documentoCliente != null ? documentoCliente : "S/D", razonSocial != null ? razonSocial : "CLIENTE VARIOS");
        pausarSimulacion(500);

        String tipo = tipoComprobante != null ? tipoComprobante.toUpperCase() : "BOLETA";
        String serieGenerada = tipo.equals("FACTURA") ? "F001" : tipo.equals("BOLETA") ? "B001" : "T001";
        
        Long correlativoGenerado = obtenerSiguienteCorrelativoSeguro(serieGenerada);
        
        String correlativoStr = String.format("%06d", correlativoGenerado);
        String xmlHashSimulado = UUID.randomUUID().toString().substring(0, 20).toUpperCase() + "==";
        String urlPdfGenerado = "https://tuki-transporte.s3.amazonaws.com/comprobantes/" + serieGenerada + "-" + correlativoStr + ".pdf";

        log.info("{} {}-{} procesada correctamente. Hash CDR: {}", tipo, serieGenerada, correlativoStr, xmlHashSimulado);

        Comprobante comprobante = new Comprobante();
        comprobante.setVenta(venta);
        comprobante.setTipoComprobante(tipo);
        comprobante.setSerie(serieGenerada);
        comprobante.setNumeroCorrelativo(correlativoGenerado); 
        
        if ("FACTURA".equals(tipo)) {
            comprobante.setRuc(documentoCliente); 
        } else {
            comprobante.setDocumentoCliente(documentoCliente); 
        }
        
        comprobante.setRazonSocialCliente(razonSocial);
        comprobante.setUrlPdf(urlPdfGenerado); 
        comprobante.setEstadoSunat("ACEPTADO");
        comprobante.setXmlHash(xmlHashSimulado);

        return comprobanteRepository.save(comprobante);
    }

    @Transactional
    public Comprobante generarNotaCredito(Venta venta, String motivo) {
        log.info("Generando nota de credito electronica");
        
        List<Comprobante> comprobantes = comprobanteRepository.findByVenta_IdVenta(venta.getIdVenta());
        if (comprobantes.isEmpty()) return null;
        
        Comprobante original = comprobantes.stream()
            .filter(c -> !"NOTA_CREDITO".equals(c.getTipoComprobante()))
            .findFirst()
            .orElse(null);
            
        if (original == null) return null;

        log.info("Documento a afectar: {}-{}", original.getSerie(), String.format("%06d", original.getNumeroCorrelativo()));
        log.debug("Motivo de anulacion: {}", motivo);
        pausarSimulacion(400);

        String serieNC = "FACTURA".equalsIgnoreCase(original.getTipoComprobante()) ? "FC01" : "BC01";
        
        Long correlativoNC = obtenerSiguienteCorrelativoSeguro(serieNC);
        
        String correlativoStr = String.format("%06d", correlativoNC);
        String xmlHashSimulado = UUID.randomUUID().toString().substring(0, 20).toUpperCase() + "==";
        String urlPdfGenerado = "https://tuki-transporte.s3.amazonaws.com/comprobantes/" + serieNC + "-" + correlativoStr + ".pdf";
        
        Comprobante notaCredito = new Comprobante();
        notaCredito.setVenta(venta);
        notaCredito.setTipoComprobante("NOTA_CREDITO");
        notaCredito.setSerie(serieNC);
        notaCredito.setNumeroCorrelativo(correlativoNC);
        
        notaCredito.setDocumentoCliente(original.getDocumentoCliente());
        notaCredito.setRuc(original.getRuc()); 
        notaCredito.setRazonSocialCliente(original.getRazonSocialCliente());
        notaCredito.setUrlPdf(urlPdfGenerado); 
        notaCredito.setEstadoSunat("ACEPTADO");
        notaCredito.setXmlHash(xmlHashSimulado);
        comprobanteRepository.save(notaCredito);
        
        original.setEstadoSunat("ANULADO");
        comprobanteRepository.save(original);
        
        log.info("Nota de credito emitida: {}-{}. Hash de baja: {}", serieNC, correlativoStr, xmlHashSimulado);
        return notaCredito;
    }

    private void pausarSimulacion(long millis) {
        try {
            Thread.sleep(millis);
        } catch (InterruptedException e) {
            Thread.currentThread().interrupt();
            log.warn("Simulacion de facturacion interrumpida", e);
        }
    }
}
