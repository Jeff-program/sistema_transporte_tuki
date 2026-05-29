package com.tuki.sistema.service;

import com.tuki.sistema.dto.TarifaDTO;
import com.tuki.sistema.entity.Tarifa;
import com.tuki.sistema.repository.PuertoRepository;
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
        Optional<Tarifa> existente = tarifaRepository.findTopByRuta_IdRutaAndOrigen_IdPuertoAndDestino_IdPuertoOrderByIdTarifaDesc(
                dto.getIdRuta(), dto.getIdPuertoOrigen(), dto.getIdPuertoDestino()
        );

        Tarifa tarifa = existente.orElseGet(Tarifa::new);
        if (tarifa.getIdTarifa() == null) {
            tarifa.setRuta(rutaRepository.findById(dto.getIdRuta()).orElseThrow());
            tarifa.setOrigen(puertoRepository.findById(dto.getIdPuertoOrigen()).orElseThrow());
            tarifa.setDestino(puertoRepository.findById(dto.getIdPuertoDestino()).orElseThrow());
        }

        tarifa.setPrecio(dto.getPrecio());

        return convertirADTO(tarifaRepository.save(tarifa));
    }

    public void eliminar(Long id) {
        tarifaRepository.deleteById(id);
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
