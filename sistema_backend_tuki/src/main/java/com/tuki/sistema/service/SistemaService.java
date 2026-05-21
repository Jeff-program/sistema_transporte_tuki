package com.tuki.sistema.service;

import org.springframework.stereotype.Service;

@Service
public class SistemaService {
    private boolean enMantenimiento = false;

    public boolean isEnMantenimiento() {
        return enMantenimiento;
    }

    public void setEnMantenimiento(boolean estado) {
        this.enMantenimiento = estado;
    }
}
