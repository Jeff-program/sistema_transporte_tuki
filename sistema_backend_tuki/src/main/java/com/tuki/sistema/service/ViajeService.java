package com.tuki.sistema.service;

import com.tuki.sistema.dto.ViajeDTO;
import com.tuki.sistema.entity.RutaEscala;
import com.tuki.sistema.entity.Viaje;
import com.tuki.sistema.entity.ViajeEscala;
import com.tuki.sistema.repository.EmbarcacionRepository;
import com.tuki.sistema.repository.RutaEscalaRepository;
import com.tuki.sistema.repository.ViajeEscalaRepository;
import com.tuki.sistema.repository.ViajeRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

import java.util.List;
import java.util.stream.Collectors;

@Service
public class ViajeService {

    @Autowired private ViajeRepository viajeRepository;
    @Autowired private EmbarcacionRepository embarcacionRepository;
    @Autowired private RutaEscalaRepository rutaEscalaRepository; 
    @Autowired private ViajeEscalaRepository viajeEscalaRepository;

    public List<ViajeDTO> listarTodos() {
        return viajeRepository.findAll().stream()
                .sorted((v1, v2) -> v2.getFechaSalida().compareTo(v1.getFechaSalida()))
                .map(this::convertirADTO)
                .collect(Collectors.toList());
    }

    public List<ViajeDTO> listarProgramados() {
        return viajeRepository.findByEstado("PROGRAMADO").stream()
                .map(this::convertirADTO)
                .collect(Collectors.toList());
    }

    public Viaje guardar(Viaje viaje) {
        boolean esNuevo = (viaje.getIdViaje() == null);
        if (esNuevo) {
            boolean naveOcupada = viajeRepository.existsByEmbarcacion_IdEmbarcacionAndFechaSalidaAndEstadoNot(
                    viaje.getEmbarcacion().getIdEmbarcacion(), viaje.getFechaSalida(), "CANCELADO"
            );
            if (naveOcupada) throw new RuntimeException("La embarcación ya tiene un viaje programado para esa fecha.");

            Integer capacidad = embarcacionRepository.findById(viaje.getEmbarcacion().getIdEmbarcacion())
                    .orElseThrow().getCapacidad();
            viaje.setCuposDisponibles(capacidad); 
            viaje.setEstado("PROGRAMADO");
        }
        Viaje viajeGuardado = viajeRepository.save(viaje);

        if (esNuevo) {
            List<RutaEscala> escalasRuta = rutaEscalaRepository.findByRuta_IdRutaOrderByOrdenAsc(viajeGuardado.getRuta().getIdRuta());
            for (RutaEscala re : escalasRuta) {
                ViajeEscala ve = new ViajeEscala();
                ve.setViaje(viajeGuardado);
                ve.setPuerto(re.getPuerto());
                ve.setOrden(re.getOrden());
                ve.setEstado("PENDIENTE");
                viajeEscalaRepository.save(ve); 
            }
        }
        return viajeGuardado;
    }

    public void cancelarViaje(Long id) {
        Viaje v = viajeRepository.findById(id).orElseThrow();
        v.setEstado("CANCELADO");
        viajeRepository.save(v);
    }

    private ViajeDTO convertirADTO(Viaje v) {
        ViajeDTO dto = new ViajeDTO();
        dto.setIdViaje(v.getIdViaje());
        if (v.getRuta() != null) {
            dto.setNombreRuta(v.getRuta().getNombreRuta());
            dto.setIdRuta(v.getRuta().getIdRuta());
        }
        if (v.getEmbarcacion() != null) {
            dto.setNombreEmbarcacion(v.getEmbarcacion().getNombre());
            dto.setMatriculaEmbarcacion(v.getEmbarcacion().getMatricula());
            dto.setIdEmbarcacion(v.getEmbarcacion().getIdEmbarcacion());
            dto.setCapacidadTotal(v.getEmbarcacion().getCapacidad());
        }
        dto.setFechaSalida(v.getFechaSalida());
        
        dto.setHoraZarpe(v.getHoraZarpe()); 
        
        dto.setCuposDisponibles(v.getCuposDisponibles());
        dto.setEstado(v.getEstado());
        return dto;
    }
}