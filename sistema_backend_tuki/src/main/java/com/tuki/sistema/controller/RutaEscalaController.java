package com.tuki.sistema.controller;

import com.tuki.sistema.entity.RutaEscala;
import com.tuki.sistema.service.RutaEscalaService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.web.bind.annotation.*;
import java.util.List;

@RestController
@RequestMapping("/api/escalas")
public class RutaEscalaController {

    @Autowired
    private RutaEscalaService service;

    @GetMapping("/ruta/{idRuta}")
    public List<RutaEscala> listarPorRuta(@PathVariable Long idRuta) {
        return service.listarPorRuta(idRuta);
    }

    @PostMapping
    public RutaEscala guardar(@RequestBody RutaEscala escala) {
        return service.guardar(escala);
    }
    
    @DeleteMapping("/{id}")
    public void eliminar(@PathVariable Long id) {
        service.eliminar(id);
    }
}
