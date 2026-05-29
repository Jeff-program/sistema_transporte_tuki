package com.tuki.sistema.service;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

import java.util.Map;

@Service
public class SuperAdminService {

    @Autowired private SistemaService sistemaService;

    public String alternarMantenimiento() {
        boolean nuevoEstado = sistemaService.alternarMantenimiento();
        return "Mantenimiento " + (nuevoEstado ? "ACTIVADO" : "DESACTIVADO");
    }

    public Map<String, Boolean> obtenerEstadoMantenimiento() {
        return Map.of("mantenimiento", sistemaService.isEnMantenimiento());
    }
}
