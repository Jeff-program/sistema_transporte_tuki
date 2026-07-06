package com.tuki.sistema.service;

import com.tuki.sistema.dto.TarifaDTO;
import com.tuki.sistema.entity.Puerto;
import com.tuki.sistema.entity.Ruta;
import com.tuki.sistema.entity.RutaEscala;
import com.tuki.sistema.entity.Tarifa;
import com.tuki.sistema.repository.PuertoRepository;
import com.tuki.sistema.repository.RutaEscalaRepository;
import com.tuki.sistema.repository.RutaRepository;
import com.tuki.sistema.repository.TarifaRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

import java.math.BigDecimal;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.stream.Collectors;

@Service
public class TarifaService {

    @Autowired private TarifaRepository tarifaRepository;
    @Autowired private RutaRepository rutaRepository;
    @Autowired private PuertoRepository puertoRepository;
    @Autowired private RutaEscalaRepository rutaEscalaRepository;

    public List<TarifaDTO> listarPorRuta(Long idRuta) {
        return tarifaRepository.findByRuta_IdRuta(idRuta).stream()
                .map(this::convertirADTO)
                .collect(Collectors.toList());
    }

    public BigDecimal consultarPrecio(Long idRuta, Long idOrigen, Long idDestino) {
        return tarifaRepository.findTopByRuta_IdRutaAndOrigen_IdPuertoAndDestino_IdPuertoOrderByIdTarifaDesc(
                idRuta, idOrigen, idDestino)
                .map(Tarifa::getPrecio)
                .orElse(BigDecimal.ZERO);
    }

    public Map<String, BigDecimal> consultarPrecioRespuesta(Long idRuta, Long idOrigen, Long idDestino) {
        return Map.of("precio", consultarPrecio(idRuta, idOrigen, idDestino));
    }

    public TarifaDTO guardar(TarifaDTO dto) {
        validarTarifa(dto);

        Optional<Tarifa> existente = tarifaRepository.findTopByRuta_IdRutaAndOrigen_IdPuertoAndDestino_IdPuertoOrderByIdTarifaDesc(
                dto.getIdRuta(), dto.getIdPuertoOrigen(), dto.getIdPuertoDestino()
        );

        Tarifa tarifa = existente.orElseGet(Tarifa::new);
        Ruta ruta = rutaRepository.findById(dto.getIdRuta())
                .orElseThrow(() -> new RuntimeException("La ruta seleccionada no existe."));
        Puerto origen = puertoRepository.findById(dto.getIdPuertoOrigen())
                .orElseThrow(() -> new RuntimeException("El puerto de origen no existe."));
        Puerto destino = puertoRepository.findById(dto.getIdPuertoDestino())
                .orElseThrow(() -> new RuntimeException("El puerto de destino no existe."));

        validarRutaYPuertosActivos(ruta, origen, destino);

        if (tarifa.getIdTarifa() == null) {
            tarifa.setRuta(ruta);
            tarifa.setOrigen(origen);
            tarifa.setDestino(destino);
        }

        tarifa.setPrecio(dto.getPrecio());

        return convertirADTO(tarifaRepository.save(tarifa));
    }

    public void eliminar(Long id) {
        tarifaRepository.deleteById(id);
    }

    private void validarTarifa(TarifaDTO dto) {
        if (dto == null) {
            throw new RuntimeException("Los datos de la tarifa son obligatorios.");
        }
        if (dto.getIdRuta() == null) {
            throw new RuntimeException("La ruta es obligatoria para registrar una tarifa.");
        }
        if (dto.getIdPuertoOrigen() == null || dto.getIdPuertoDestino() == null) {
            throw new RuntimeException("El origen y destino de la tarifa son obligatorios.");
        }
        if (dto.getIdPuertoOrigen().equals(dto.getIdPuertoDestino())) {
            throw new RuntimeException("El origen y destino de la tarifa no pueden ser el mismo puerto.");
        }
        if (dto.getPrecio() == null || dto.getPrecio().compareTo(BigDecimal.ZERO) <= 0) {
            throw new RuntimeException("El precio de la tarifa debe ser mayor a cero.");
        }
    }

    private void validarRutaYPuertosActivos(Ruta ruta, Puerto origen, Puerto destino) {
        if (!"ACTIVO".equals(ruta.getEstado())) {
            throw new RuntimeException("No se pueden registrar tarifas para una ruta inactiva o eliminada.");
        }
        if (!"ACTIVO".equals(origen.getEstado()) || !"ACTIVO".equals(destino.getEstado())) {
            throw new RuntimeException("Los puertos de la tarifa deben estar activos.");
        }
        int ordenOrigen = obtenerOrdenEnRuta(ruta, origen);
        int ordenDestino = obtenerOrdenEnRuta(ruta, destino);
        if (ordenOrigen < 0 || ordenDestino < 0 || ordenOrigen >= ordenDestino) {
            throw new RuntimeException("La tarifa debe corresponder a un tramo valido de la ruta.");
        }
    }

    private int obtenerOrdenEnRuta(Ruta ruta, Puerto puerto) {
        if (ruta.getOrigen() != null && ruta.getOrigen().getIdPuerto().equals(puerto.getIdPuerto())) {
            return 0;
        }
        if (ruta.getDestino() != null && ruta.getDestino().getIdPuerto().equals(puerto.getIdPuerto())) {
            return 999;
        }
        for (RutaEscala escala : rutaEscalaRepository.findByRuta_IdRutaOrderByOrdenAsc(ruta.getIdRuta())) {
            if (escala.getPuerto() != null && escala.getPuerto().getIdPuerto().equals(puerto.getIdPuerto())) {
                return escala.getOrden();
            }
        }
        return -1;
    }

    private TarifaDTO convertirADTO(Tarifa t) {
        TarifaDTO dto = new TarifaDTO();
        dto.setIdTarifa(t.getIdTarifa());
        dto.setIdRuta(t.getRuta().getIdRuta());
        dto.setNombreRuta(t.getRuta().getNombreRuta());
        dto.setIdPuertoOrigen(t.getOrigen().getIdPuerto());
        dto.setNombreOrigen(t.getOrigen().getCiudad());
        dto.setIdPuertoDestino(t.getDestino().getIdPuerto());
        dto.setNombreDestino(t.getDestino().getCiudad());
        dto.setPrecio(t.getPrecio());
        return dto;
    }
}
