package com.tuki.sistema.controller;

import com.tuki.sistema.dto.TarifaDTO;
import com.tuki.sistema.repository.TarifaRepository;
import com.tuki.sistema.service.TarifaService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.math.BigDecimal;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/tarifas")
public class TarifaController {

    @Autowired
    private TarifaService service;

    @Autowired
    private TarifaRepository tarifaRepository;

    @GetMapping("/ruta/{idRuta}")
    public ResponseEntity<List<TarifaDTO>> listarPorRuta(@PathVariable Long idRuta) {
        return ResponseEntity.ok(service.listarPorRuta(idRuta));
    }

    @GetMapping("/consultar")
    public ResponseEntity<Map<String, BigDecimal>> consultarPrecio(
            @RequestParam Long ruta,
            @RequestParam Long origen,
            @RequestParam Long destino) {
        
        BigDecimal precio = service.consultarPrecio(ruta, origen, destino);
        return ResponseEntity.ok(Map.of("precio", precio));
    }

    @PostMapping
    public ResponseEntity<TarifaDTO> guardar(@RequestBody TarifaDTO dto) {
        return ResponseEntity.ok(service.guardar(dto));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<?> eliminarTarifa(@PathVariable Long id) {
        tarifaRepository.deleteById(id);
        return ResponseEntity.ok().build();
    }
}