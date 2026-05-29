package com.tuki.sistema.service;

import com.tuki.sistema.dto.ReporteArchivo;
import org.springframework.core.io.InputStreamResource;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.stereotype.Service;

@Service
public class ReporteDescargaService {

    public ResponseEntity<InputStreamResource> descargarArchivo(ReporteArchivo archivo, String disposicion, String mediaType) {
        HttpHeaders headers = new HttpHeaders();
        headers.add("Content-Disposition", disposicion + "; filename=\"" + archivo.getNombreArchivo() + "\"");

        return ResponseEntity.ok()
                .headers(headers)
                .contentType(MediaType.parseMediaType(mediaType))
                .body(new InputStreamResource(archivo.getContenido()));
    }
}
