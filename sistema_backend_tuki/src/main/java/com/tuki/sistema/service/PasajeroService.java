package com.tuki.sistema.service;

import com.tuki.sistema.entity.Pasajero;
import com.tuki.sistema.repository.PasajeroRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

import java.util.Optional;

@Service
public class PasajeroService {

    @Autowired private PasajeroRepository pasajeroRepository;

    public Optional<Pasajero> buscarPorDocumento(String numero) {
        return pasajeroRepository.findByNumeroDocumento(numero);
    }

    public Optional<Pasajero> actualizarPorDocumento(String numero, Pasajero datos) {
        return pasajeroRepository.findByNumeroDocumento(numero)
                .map(pasajero -> {
                    pasajero.setNombres(datos.getNombres());
                    pasajero.setApellidoPaterno(datos.getApellidoPaterno());
                    pasajero.setApellidoMaterno(datos.getApellidoMaterno());
                    pasajero.setTelefono(datos.getTelefono());
                    pasajero.setFechaNacimiento(datos.getFechaNacimiento());
                    pasajero.setNacionalidad(datos.getNacionalidad());
                    return pasajeroRepository.save(pasajero);
                });
    }
}
