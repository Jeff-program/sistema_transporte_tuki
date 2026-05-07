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

import java.time.LocalDateTime;
import java.util.Map;
import java.security.SecureRandom;

@RestController
@RequestMapping("/api/auth")
public class RecuperacionPasswordController {

    @Autowired private UsuarioRepository usuarioRepository;
    @Autowired private RecuperacionPasswordRepository recuperacionRepository;
    @Autowired private EmailService emailService;
    @Autowired private PasswordEncoder passwordEncoder;

    @PostMapping("/olvide-password")
    @Transactional
    public ResponseEntity<?> olvidePassword(@RequestBody Map<String, String> payload) {
        String email = payload.get("email");
        Usuario usuario = usuarioRepository.findByEmail(email).orElse(null);
        if (usuario == null) return ResponseEntity.status(404).body(Map.of("mensaje", "Usuario no encontrado"));

        recuperacionRepository.deleteByUsuario(usuario);

        SecureRandom secureRandom = new SecureRandom();
        int codigoNumero = secureRandom.nextInt(900000) + 100000; 
        String codigoLimpo = String.valueOf(codigoNumero);
        RecuperacionPassword recuperacion = new RecuperacionPassword();
        recuperacion.setUsuario(usuario);
        recuperacion.setCodigoHash(passwordEncoder.encode(codigoLimpo));
        recuperacion.setFechaExpiracion(LocalDateTime.now().plusMinutes(2));
        recuperacionRepository.save(recuperacion);

        boolean enviado = emailService.enviarCorreoRecuperacion(usuario.getEmail(), usuario.getNombreCompleto(), codigoLimpo);
        if (!enviado) return ResponseEntity.internalServerError().body(Map.of("mensaje", "Error al enviar correo"));

        return ResponseEntity.ok(Map.of("mensaje", "Código enviado"));
    }

    @PostMapping("/verificar-codigo")
    public ResponseEntity<?> verificarCodigo(@RequestBody Map<String, String> payload) {
        String email = payload.get("email");
        String codigo = payload.get("codigo");

        Usuario usuario = usuarioRepository.findByEmail(email).orElse(null);
        if (usuario == null) return ResponseEntity.status(404).body(Map.of("mensaje", "Usuario no encontrado"));

        RecuperacionPassword recuperacion = recuperacionRepository.findByUsuario(usuario).orElse(null);
        if (recuperacion == null || recuperacion.getFechaExpiracion().isBefore(LocalDateTime.now()) || !passwordEncoder.matches(codigo, recuperacion.getCodigoHash())) {
            return ResponseEntity.badRequest().body(Map.of("mensaje", "Código inválido o expirado"));
        }
        return ResponseEntity.ok(Map.of("mensaje", "Código verificado"));
    }

    @PostMapping("/restablecer-password")
    @Transactional
    public ResponseEntity<?> restablecerPassword(@RequestBody Map<String, String> payload) {
        String email = payload.get("email");
        String codigo = payload.get("codigo");
        String nuevaPassword = payload.get("nuevaPassword");

        Usuario usuario = usuarioRepository.findByEmail(email).orElse(null);
        if (usuario == null) return ResponseEntity.status(404).body(Map.of("mensaje", "Usuario no encontrado"));

        RecuperacionPassword recuperacion = recuperacionRepository.findByUsuario(usuario).orElse(null);
        if (recuperacion == null || recuperacion.getFechaExpiracion().isBefore(LocalDateTime.now()) || !passwordEncoder.matches(codigo, recuperacion.getCodigoHash())) {
            return ResponseEntity.badRequest().body(Map.of("mensaje", "Código inválido"));
        }

        usuario.setPassword(passwordEncoder.encode(nuevaPassword));
        usuarioRepository.save(usuario);
        recuperacionRepository.deleteByUsuario(usuario);

        return ResponseEntity.ok(Map.of("mensaje", "Contraseña actualizada"));
    }
}