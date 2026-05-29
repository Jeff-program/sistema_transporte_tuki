package com.tuki.sistema.controller;

import com.tuki.sistema.entity.Pasajero;
import com.tuki.sistema.service.PasajeroService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/pasajeros")
public class PasajeroController {

    @Autowired
    private PasajeroService pasajeroService;

    @GetMapping("/documento/{numero}")
    public ResponseEntity<?> buscarPorDocumento(@PathVariable String numero) {
        return pasajeroService.buscarPorDocumento(numero)
                .map(ResponseEntity::ok)
                .orElse(ResponseEntity.notFound().build());
    }

    @PutMapping("/documento/{numero}")
    public ResponseEntity<?> actualizarPasajero(@PathVariable String numero, @RequestBody Pasajero datos) {
        return pasajeroService.actualizarPorDocumento(numero, datos)
                .map(ResponseEntity::ok)
                .orElse(ResponseEntity.notFound().build());
    }
}
