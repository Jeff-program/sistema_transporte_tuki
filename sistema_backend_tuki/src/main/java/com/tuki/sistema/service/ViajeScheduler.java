package com.tuki.sistema.service;

import com.tuki.sistema.entity.Viaje;
import com.tuki.sistema.repository.ViajeRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;
import jakarta.transaction.Transactional;

import java.time.LocalDateTime;
import java.util.List;

@Component
public class ViajeScheduler {

    @Autowired
    private ViajeRepository viajeRepository;

    @Scheduled(fixedRate = 60000)
    @Transactional
    public void actualizarEstadosDeViajes() {
        List<Viaje> viajesActivos = viajeRepository.findByEstado("PROGRAMADO");
        LocalDateTime ahora = LocalDateTime.now();

        for (Viaje v : viajesActivos) {
            LocalDateTime fechaHoraSalida = LocalDateTime.of(v.getFechaSalida(), v.getHoraZarpe());

            if (fechaHoraSalida.isBefore(ahora)) {
                v.setEstado("FINALIZADO"); 
                viajeRepository.save(v);
                System.out.println("Viaje " + v.getIdViaje() + " ha finalizado automáticamente.");
            }
        }
    }
}