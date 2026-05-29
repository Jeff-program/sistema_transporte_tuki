package com.tuki.sistema.service;

import com.tuki.sistema.dto.RecuperacionEmailRequest;
import com.tuki.sistema.dto.RestablecerPasswordRequest;
import com.tuki.sistema.dto.VerificarCodigoRequest;
import com.tuki.sistema.entity.RecuperacionPassword;
import com.tuki.sistema.entity.Usuario;
import com.tuki.sistema.repository.RecuperacionPasswordRepository;
import com.tuki.sistema.repository.UsuarioRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.security.SecureRandom;
import java.time.LocalDateTime;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;

@Service
public class RecuperacionPasswordService {

    @Autowired private UsuarioRepository usuarioRepository;
    @Autowired private RecuperacionPasswordRepository recuperacionRepository;
    @Autowired private EmailService emailService;
    @Autowired private PasswordEncoder passwordEncoder;

    private static final int MAX_INTENTOS_CODIGO = 5;
    private final Map<String, Integer> intentosFallidos = new ConcurrentHashMap<>();
    private final SecureRandom secureRandom = new SecureRandom();

    @Transactional
    public Map<String, String> solicitarCodigo(RecuperacionEmailRequest request) {
        String email = normalizarEmail(request != null ? request.getEmail() : null);
        Usuario usuario = usuarioRepository.findByEmail(email).orElse(null);

        if (usuario == null || !"ACTIVO".equalsIgnoreCase(usuario.getEstado())) {
            return respuestaGenericaRecuperacion();
        }

        recuperacionRepository.deleteByUsuario(usuario);
        intentosFallidos.remove(email);

        String codigoLimpio = String.valueOf(secureRandom.nextInt(900000) + 100000);

        RecuperacionPassword recuperacion = new RecuperacionPassword();
        recuperacion.setUsuario(usuario);
        recuperacion.setCodigoHash(passwordEncoder.encode(codigoLimpio));
        recuperacion.setFechaExpiracion(LocalDateTime.now().plusMinutes(5));
        recuperacionRepository.save(recuperacion);

        boolean enviado = emailService.enviarCorreoRecuperacion(usuario.getEmail(), usuario.getNombreCompleto(), codigoLimpio);
        if (!enviado) {
            throw new RuntimeException("No se pudo enviar el correo en este momento.");
        }

        return respuestaGenericaRecuperacion();
    }

    @Transactional
    public Map<String, String> verificarCodigo(VerificarCodigoRequest request) {
        String email = normalizarEmail(request != null ? request.getEmail() : null);
        String codigo = request != null ? request.getCodigo() : null;
        Usuario usuario = usuarioRepository.findByEmail(email).orElse(null);

        if (!codigoValido(usuario, codigo)) {
            throw new IllegalArgumentException(registrarIntentoFallido(email, usuario, "Codigo invalido o expirado"));
        }

        intentosFallidos.remove(email);
        return Map.of("mensaje", "Codigo verificado");
    }

    @Transactional
    public Map<String, String> restablecerPassword(RestablecerPasswordRequest request) {
        String email = normalizarEmail(request != null ? request.getEmail() : null);
        String codigo = request != null ? request.getCodigo() : null;
        String nuevaPassword = request != null ? request.getNuevaPassword() : null;
        Usuario usuario = usuarioRepository.findByEmail(email).orElse(null);

        if (nuevaPassword == null || nuevaPassword.length() < 6) {
            throw new IllegalArgumentException("La nueva contrasena debe tener al menos 6 caracteres");
        }

        if (!codigoValido(usuario, codigo)) {
            throw new IllegalArgumentException(registrarIntentoFallido(email, usuario, "Codigo invalido"));
        }

        usuario.setPassword(passwordEncoder.encode(nuevaPassword));
        usuarioRepository.save(usuario);
        recuperacionRepository.deleteByUsuario(usuario);
        intentosFallidos.remove(email);

        return Map.of("mensaje", "Contrasena actualizada");
    }

    private String normalizarEmail(String email) {
        return email == null ? "" : email.trim().toLowerCase();
    }

    private Map<String, String> respuestaGenericaRecuperacion() {
        return Map.of("mensaje", "Si el correo existe, enviaremos un codigo de recuperacion.");
    }

    private String registrarIntentoFallido(String email, Usuario usuario, String mensaje) {
        int intentos = intentosFallidos.merge(email, 1, Integer::sum);
        if (intentos >= MAX_INTENTOS_CODIGO && usuario != null) {
            recuperacionRepository.deleteByUsuario(usuario);
            intentosFallidos.remove(email);
            return "Codigo invalido o expirado. Solicita uno nuevo.";
        }
        return mensaje;
    }

    private boolean codigoValido(Usuario usuario, String codigo) {
        if (usuario == null || codigo == null || codigo.trim().isEmpty()) {
            return false;
        }

        RecuperacionPassword recuperacion = recuperacionRepository.findByUsuario(usuario).orElse(null);
        return recuperacion != null
                && !recuperacion.getFechaExpiracion().isBefore(LocalDateTime.now())
                && passwordEncoder.matches(codigo.trim(), recuperacion.getCodigoHash());
    }
}
