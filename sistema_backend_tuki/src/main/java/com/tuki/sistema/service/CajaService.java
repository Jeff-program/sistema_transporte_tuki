package com.tuki.sistema.service;

import com.tuki.sistema.entity.CajaTurno;
import com.tuki.sistema.entity.Pago;
import com.tuki.sistema.entity.Usuario;
import com.tuki.sistema.repository.CajaTurnoRepository;
import com.tuki.sistema.repository.PagoRepository;
import com.tuki.sistema.repository.UsuarioRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.List;

@Service
public class CajaService {

    @Autowired private CajaTurnoRepository cajaTurnoRepository;
    @Autowired private PagoRepository pagoRepository;
    @Autowired private UsuarioRepository usuarioRepository;

    public CajaTurno obtenerCajaActiva(Long idUsuario) {
        return cajaTurnoRepository.findByUsuario_IdUsuarioAndEstado(idUsuario, "ABIERTO").orElse(null);
    }

    @Transactional
    public CajaTurno abrirCaja(Long idUsuario, BigDecimal montoInicial) {
        if (obtenerCajaActiva(idUsuario) != null) {
            throw new RuntimeException("Ya tienes un turno de caja abierto. Cierra el anterior primero.");
        }

        Usuario usuario = usuarioRepository.findById(idUsuario)
                .orElseThrow(() -> new RuntimeException("Usuario no encontrado en la base de datos."));


        CajaTurno nuevaCaja = new CajaTurno();
        nuevaCaja.setUsuario(usuario);
        
        nuevaCaja.setAgencia(usuario.getAgencia()); 
        
        nuevaCaja.setSaldoInicial(montoInicial != null ? montoInicial : BigDecimal.ZERO);
        nuevaCaja.setEstado("ABIERTO");
        nuevaCaja.setFechaApertura(LocalDateTime.now());

        return cajaTurnoRepository.save(nuevaCaja);
    }

    @Transactional
    public CajaTurno cerrarCaja(Long idUsuario, BigDecimal montoDeclaradoEfectivo) {
        
        CajaTurno turno = cajaTurnoRepository.findByUsuario_IdUsuarioAndEstado(idUsuario, "ABIERTO")
                .orElseThrow(() -> new RuntimeException("No hay ninguna caja abierta para este usuario."));

        turno.setFechaCierre(LocalDateTime.now());

        List<Pago> pagos = pagoRepository.findPagosParaCaja(idUsuario, turno.getFechaApertura(), turno.getFechaCierre());
        BigDecimal totalEfectivoVentas = BigDecimal.ZERO;

        for (Pago p : pagos) {
            if ("EFECTIVO".equalsIgnoreCase(p.getMetodoPago())) {
                totalEfectivoVentas = totalEfectivoVentas.add(p.getMonto());
            }
        }

        BigDecimal efectivoEnSistema = turno.getSaldoInicial().add(totalEfectivoVentas);
        
        turno.setSaldoFinal(efectivoEnSistema); 
        turno.setDiferencia(montoDeclaradoEfectivo.subtract(efectivoEnSistema));
        
        turno.setEstado("CERRADO"); 

        return cajaTurnoRepository.save(turno);
    }
}