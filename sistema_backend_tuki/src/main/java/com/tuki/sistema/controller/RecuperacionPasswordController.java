package com.tuki.sistema.controller;

import com.tuki.sistema.entity.RecuperacionPassword;
import com.tuki.sistema.entity.Usuario;
import com.tuki.sistema.repository.RecuperacionPasswordRepository;
import com.tuki.sistema.repository.UsuarioRepository;
import com.tuki.sistema.service.EmailService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.*;

import java.security.SecureRandom;
import java.time.LocalDateTime;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;

@RestController
@RequestMapping("/api/auth")
public class RecuperacionPasswordController {

    @Autowired private UsuarioRepository usuarioRepository;
    @Autowired private RecuperacionPasswordRepository recuperacionRepository;
    @Autowired private EmailService emailService;
    @Autowired private PasswordEncoder passwordEncoder;

    private static final int MAX_INTENTOS_CODIGO = 5;
    private final Map<String, Integer> intentosFallidos = new ConcurrentHashMap<>();

    @PostMapping("/olvide-password")
    @Transactional
    public ResponseEntity<?> olvidePassword(@RequestBody Map<String, String> payload) {
        String email = normalizarEmail(payload.get("email"));
        Usuario usuario = usuarioRepository.findByEmail(email).orElse(null);

        if (usuario == null || !"ACTIVO".equalsIgnoreCase(usuario.getEstado())) {
            return respuestaGenericaRecuperacion();
        }

        recuperacionRepository.deleteByUsuario(usuario);
        intentosFallidos.remove(email);

        SecureRandom secureRandom = new SecureRandom();
        String codigoLimpio = String.valueOf(secureRandom.nextInt(900000) + 100000);

        RecuperacionPassword recuperacion = new RecuperacionPassword();
        recuperacion.setUsuario(usuario);
        recuperacion.setCodigoHash(passwordEncoder.encode(codigoLimpio));
        recuperacion.setFechaExpiracion(LocalDateTime.now().plusMinutes(5));
        recuperacionRepository.save(recuperacion);

        boolean enviado = emailService.enviarCorreoRecuperacion(usuario.getEmail(), usuario.getNombreCompleto(), codigoLimpio);
        if (!enviado) {
            return ResponseEntity.internalServerError().body(Map.of("mensaje", "No se pudo enviar el correo en este momento."));
        }

        return respuestaGenericaRecuperacion();
    }

    @PostMapping("/verificar-codigo")
    @Transactional
    public ResponseEntity<?> verificarCodigo(@RequestBody Map<String, String> payload) {
        String email = normalizarEmail(payload.get("email"));
        String codigo = payload.get("codigo");
        Usuario usuario = usuarioRepository.findByEmail(email).orElse(null);

        if (!codigoValido(usuario, codigo)) {
            return respuestaCodigoInvalido(email, usuario, "Codigo invalido o expirado");
        }

        intentosFallidos.remove(email);
        return ResponseEntity.ok(Map.of("mensaje", "Codigo verificado"));
    }

    @PostMapping("/restablecer-password")
    @Transactional
    public ResponseEntity<?> restablecerPassword(@RequestBody Map<String, String> payload) {
        String email = normalizarEmail(payload.get("email"));
        String codigo = payload.get("codigo");
        String nuevaPassword = payload.get("nuevaPassword");
        Usuario usuario = usuarioRepository.findByEmail(email).orElse(null);

        if (nuevaPassword == null || nuevaPassword.length() < 6) {
            return ResponseEntity.badRequest().body(Map.of("mensaje", "La nueva contrasena debe tener al menos 6 caracteres"));
        }

        if (!codigoValido(usuario, codigo)) {
            return respuestaCodigoInvalido(email, usuario, "Codigo invalido");
        }

        usuario.setPassword(passwordEncoder.encode(nuevaPassword));
        usuarioRepository.save(usuario);
        recuperacionRepository.deleteByUsuario(usuario);
        intentosFallidos.remove(email);

        return ResponseEntity.ok(Map.of("mensaje", "Contrasena actualizada"));
    }

    private String normalizarEmail(String email) {
        return email == null ? "" : email.trim().toLowerCase();
    }

    private ResponseEntity<?> respuestaGenericaRecuperacion() {
        return ResponseEntity.ok(Map.of("mensaje", "Si el correo existe, enviaremos un codigo de recuperacion."));
    }

    private ResponseEntity<?> respuestaCodigoInvalido(String email, Usuario usuario, String mensaje) {
        int intentos = intentosFallidos.merge(email, 1, Integer::sum);
        if (intentos >= MAX_INTENTOS_CODIGO && usuario != null) {
            recuperacionRepository.deleteByUsuario(usuario);
            intentosFallidos.remove(email);
            return ResponseEntity.badRequest().body(Map.of("mensaje", "Codigo invalido o expirado. Solicita uno nuevo."));
        }
        return ResponseEntity.badRequest().body(Map.of("mensaje", mensaje));
    }

    private boolean codigoValido(Usuario usuario, String codigo) {
        if (usuario == null || codigo == null || codigo.trim().isEmpty()) return false;

        RecuperacionPassword recuperacion = recuperacionRepository.findByUsuario(usuario).orElse(null);
        return recuperacion != null
                && !recuperacion.getFechaExpiracion().isBefore(LocalDateTime.now())
                && passwordEncoder.matches(codigo.trim(), recuperacion.getCodigoHash());
    }
}
