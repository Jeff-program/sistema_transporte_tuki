package com.tuki.sistema.service;

import com.tuki.sistema.entity.RutaEscala;
import com.tuki.sistema.repository.RutaEscalaRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

import java.util.List;

@Service
public class RutaEscalaService {

    @Autowired private RutaEscalaRepository repository;

    public List<RutaEscala> listarPorRuta(Long idRuta) {
        return repository.findByRuta_IdRutaOrderByOrdenAsc(idRuta);
    }

    public RutaEscala guardar(RutaEscala escala) {
        return repository.save(escala);
    }

    public void eliminar(Long id) {
        repository.deleteById(id);
    }
}
