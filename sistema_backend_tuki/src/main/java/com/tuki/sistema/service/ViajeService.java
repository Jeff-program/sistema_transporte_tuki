package com.tuki.sistema.service;

import com.tuki.sistema.dto.ViajeDTO;
import com.tuki.sistema.entity.Embarcacion;
import com.tuki.sistema.entity.Ruta;
import com.tuki.sistema.entity.RutaEscala;
import com.tuki.sistema.entity.Viaje;
import com.tuki.sistema.entity.ViajeEscala;
import com.tuki.sistema.repository.EmbarcacionRepository;
import com.tuki.sistema.repository.RutaEscalaRepository;
import com.tuki.sistema.repository.RutaRepository;
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
    @Autowired private RutaRepository rutaRepository;
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
                .filter(v -> v.getRuta() != null && "ACTIVO".equals(v.getRuta().getEstado()))
                .filter(v -> v.getEmbarcacion() != null && "OPERATIVO".equals(v.getEmbarcacion().getEstado()))
                .map(this::convertirADTO)
                .collect(Collectors.toList());
    }

    public Viaje guardar(Viaje viaje) {
        validarDatosBasicos(viaje);

        Ruta ruta = rutaRepository.findById(viaje.getRuta().getIdRuta())
                .orElseThrow(() -> new RuntimeException("Ruta no encontrada"));
        if (!"ACTIVO".equals(ruta.getEstado())) {
            throw new RuntimeException("No se puede programar un viaje en una ruta inactiva o eliminada.");
        }

        Embarcacion embarcacion = embarcacionRepository.findById(viaje.getEmbarcacion().getIdEmbarcacion())
                .orElseThrow(() -> new RuntimeException("Embarcacion no encontrada"));
        if (!"OPERATIVO".equals(embarcacion.getEstado())) {
            throw new RuntimeException("Solo se pueden programar viajes con embarcaciones operativas.");
        }

        viaje.setRuta(ruta);
        viaje.setEmbarcacion(embarcacion);

        boolean esNuevo = viaje.getIdViaje() == null;
        if (esNuevo) {
            boolean naveOcupada = viajeRepository.existsByEmbarcacion_IdEmbarcacionAndFechaSalidaAndEstadoNot(
                    embarcacion.getIdEmbarcacion(), viaje.getFechaSalida(), "CANCELADO"
            );
            if (naveOcupada) {
                throw new RuntimeException("La embarcacion ya tiene un viaje programado para esa fecha.");
            }

            viaje.setCuposDisponibles(embarcacion.getCapacidad());
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
        Viaje viaje = viajeRepository.findById(id).orElseThrow(() -> new RuntimeException("Viaje no encontrado"));
        viaje.setEstado("CANCELADO");
        viajeRepository.save(viaje);
    }

    private void validarDatosBasicos(Viaje viaje) {
        if (viaje == null) {
            throw new RuntimeException("Los datos del viaje son obligatorios.");
        }
        if (viaje.getRuta() == null || viaje.getRuta().getIdRuta() == null) {
            throw new RuntimeException("La ruta del viaje es obligatoria.");
        }
        if (viaje.getEmbarcacion() == null || viaje.getEmbarcacion().getIdEmbarcacion() == null) {
            throw new RuntimeException("La embarcacion del viaje es obligatoria.");
        }
        if (viaje.getFechaSalida() == null) {
            throw new RuntimeException("La fecha de salida es obligatoria.");
        }
        if (viaje.getHoraZarpe() == null) {
            throw new RuntimeException("La hora de zarpe es obligatoria.");
        }
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
