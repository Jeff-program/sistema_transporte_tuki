package com.tuki.sistema.controller;

import com.tuki.sistema.entity.RutaEscala;
import com.tuki.sistema.repository.RutaEscalaRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.web.bind.annotation.*;
import java.util.List;

@RestController
@RequestMapping("/api/escalas")
public class RutaEscalaController {

    @Autowired
    private RutaEscalaRepository repository;

    @GetMapping("/ruta/{idRuta}")
    public List<RutaEscala> listarPorRuta(@PathVariable Long idRuta) {
        return repository.findByRuta_IdRutaOrderByOrdenAsc(idRuta);
    }

    @PostMapping
    public RutaEscala guardar(@RequestBody RutaEscala escala) {
        return repository.save(escala);
    }
    
    @DeleteMapping("/{id}")
    public void eliminar(@PathVariable Long id) {
        repository.deleteById(id);
    }
}