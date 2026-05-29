package com.tuki.sistema.controller;

import com.tuki.sistema.dto.TarifaDTO;
import com.tuki.sistema.service.TarifaService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/tarifas")
public class TarifaController {

    @Autowired
    private TarifaService service;

    @GetMapping("/ruta/{idRuta}")
    public ResponseEntity<List<TarifaDTO>> listarPorRuta(@PathVariable Long idRuta) {
        return ResponseEntity.ok(service.listarPorRuta(idRuta));
    }

    @GetMapping("/consultar")
    public ResponseEntity<?> consultarPrecio(
            @RequestParam Long ruta,
            @RequestParam Long origen,
            @RequestParam Long destino) {
        return ResponseEntity.ok(service.consultarPrecioRespuesta(ruta, origen, destino));
    }

    @PostMapping
    public ResponseEntity<TarifaDTO> guardar(@RequestBody TarifaDTO dto) {
        return ResponseEntity.ok(service.guardar(dto));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<?> eliminarTarifa(@PathVariable Long id) {
        service.eliminar(id);
        return ResponseEntity.ok().build();
    }
}
