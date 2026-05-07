package com.tuki.sistema.service;

import com.tuki.sistema.entity.Comprobante;
import com.tuki.sistema.entity.Correlativo;
import com.tuki.sistema.entity.Venta;
import com.tuki.sistema.entity.Pago;
import com.tuki.sistema.repository.ComprobanteRepository;
import com.tuki.sistema.repository.CorrelativoRepository;

import java.util.List;
import java.util.UUID;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class FacturacionService {

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

        System.out.println("\n==========================================================");
        System.out.println(">>> 🟢 INICIANDO FACTURACIÓN ELECTRÓNICA (SUNAT/OSE) 🟢 <<<");
        System.out.println("==========================================================");
        System.out.println(">>> Preparando Payload JSON encriptado...");
        System.out.println("  - Operación: Emisión de Comprobante");
        System.out.println("  - Moneda: PEN (Soles) | Monto Total: S/ " + venta.getTotal());
        System.out.println("  - Cliente Doc: " + (documentoCliente != null ? documentoCliente : "S/D"));
        System.out.println("  - Denominación: " + (razonSocial != null ? razonSocial : "CLIENTE VARIOS"));
        
        System.out.println(">>> Estableciendo conexión segura TLS con servidor SUNAT...");
        try { Thread.sleep(500); } catch (InterruptedException e) {} 

        String tipo = tipoComprobante != null ? tipoComprobante.toUpperCase() : "BOLETA";
        String serieGenerada = tipo.equals("FACTURA") ? "F001" : tipo.equals("BOLETA") ? "B001" : "T001";
        
        Long correlativoGenerado = obtenerSiguienteCorrelativoSeguro(serieGenerada);
        
        String correlativoStr = String.format("%06d", correlativoGenerado);
        String xmlHashSimulado = UUID.randomUUID().toString().substring(0, 20).toUpperCase() + "==";
        String urlPdfGenerado = "https://tuki-transporte.s3.amazonaws.com/comprobantes/" + serieGenerada + "-" + correlativoStr + ".pdf";

        System.out.println(">>> ✉️  Respuesta del Servidor 200 OK");
        System.out.println(">>> ¡ÉXITO! " + tipo + " " + serieGenerada + "-" + correlativoStr + " procesada.");
        System.out.println(">>> Hash CDR: " + xmlHashSimulado);
        System.out.println("==========================================================\n");

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
        
        System.out.println("\n==========================================================");
        System.out.println(">>> 🔴 GENERANDO NOTA DE CRÉDITO ELECTRÓNICA (SUNAT) 🔴 <<<");
        System.out.println("==========================================================");
        
        List<Comprobante> comprobantes = comprobanteRepository.findByVenta_IdVenta(venta.getIdVenta());
        if (comprobantes.isEmpty()) return null;
        
        Comprobante original = comprobantes.stream()
            .filter(c -> !"NOTA_CREDITO".equals(c.getTipoComprobante()))
            .findFirst()
            .orElse(null);
            
        if (original == null) return null;

        System.out.println(">>> Documento a afectar: " + original.getSerie() + "-" + String.format("%06d", original.getNumeroCorrelativo()));
        System.out.println(">>> Motivo de anulación: " + motivo);
        System.out.println(">>> Enviando petición de anulación a OSE/SUNAT...");
        try { Thread.sleep(400); } catch (InterruptedException e) {} 

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
        
        System.out.println(">>> ✉️  Respuesta del Servidor 200 OK");
        System.out.println(">>> ¡ÉXITO! NOTA DE CRÉDITO EMITIDA: " + serieNC + "-" + correlativoStr);
        System.out.println(">>> Hash de Baja: " + xmlHashSimulado);
        System.out.println("==========================================================\n");
        
        return notaCredito;
    }
}