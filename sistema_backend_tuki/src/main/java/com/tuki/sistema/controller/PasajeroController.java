package com.tuki.sistema.controller;

import com.tuki.sistema.repository.PasajeroRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/pasajeros")
public class PasajeroController {

    @Autowired
    private PasajeroRepository pasajeroRepository;

    @GetMapping("/documento/{numero}")
    public ResponseEntity<?> buscarPorDocumento(@PathVariable String numero) {
        return pasajeroRepository.findByNumeroDocumento(numero)
                .map(ResponseEntity::ok)
                .orElse(ResponseEntity.notFound().build());
    }

    @PutMapping("/documento/{numero}")
    public ResponseEntity<?> actualizarPasajero(@PathVariable String numero, @RequestBody com.tuki.sistema.entity.Pasajero datos) {
        return pasajeroRepository.findByNumeroDocumento(numero)
                .map(p -> {
                    p.setNombres(datos.getNombres());
                    p.setApellidoPaterno(datos.getApellidoPaterno());
                    p.setApellidoMaterno(datos.getApellidoMaterno());
                    p.setTelefono(datos.getTelefono());
                    p.setFechaNacimiento(datos.getFechaNacimiento());
                    p.setNacionalidad(datos.getNacionalidad());
                    return ResponseEntity.ok(pasajeroRepository.save(p));
                })
                .orElse(ResponseEntity.notFound().build());
    }
}