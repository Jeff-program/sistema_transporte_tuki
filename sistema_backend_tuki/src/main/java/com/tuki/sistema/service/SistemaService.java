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

    public boolean alternarMantenimiento() {
        this.enMantenimiento = !this.enMantenimiento;
        return this.enMantenimiento;
    }
}
