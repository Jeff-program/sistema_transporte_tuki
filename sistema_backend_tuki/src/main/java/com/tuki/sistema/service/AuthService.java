package com.tuki.sistema.service;

import com.tuki.sistema.dto.LoginDTO;
import com.tuki.sistema.entity.Usuario;
import com.tuki.sistema.repository.UsuarioRepository;
import com.tuki.sistema.security.JwtTokenProvider;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Service;

import java.util.HashMap;
import java.util.Map;

@Service
public class AuthService {

    @Autowired
    private AuthenticationManager authenticationManager;
    @Autowired
    private UsuarioRepository usuarioRepository;
    @Autowired
    private JwtTokenProvider tokenProvider;

    public Map<String, Object> autenticar(LoginDTO loginDto) {
        Usuario usuario = usuarioRepository.findByEmail(loginDto.getEmail())
                .orElseThrow(() -> new RuntimeException("Usuario no encontrado."));

        if (!"ACTIVO".equalsIgnoreCase(usuario.getEstado())) {
            throw new RuntimeException("Acceso denegado: Su cuenta ha sido desactivada. Comuníquese con el administrador.");
        }

        Authentication authentication = authenticationManager.authenticate(
                new UsernamePasswordAuthenticationToken(loginDto.getEmail(), loginDto.getPassword())
        );
        SecurityContextHolder.getContext().setAuthentication(authentication);

        String token = tokenProvider.generarToken(usuario);

        Map<String, Object> response = new HashMap<>();
        response.put("accessToken", token);
        response.put("tokenType", "Bearer");
        response.put("email", usuario.getEmail());
        response.put("nombreCompleto", usuario.getNombreCompleto());
        response.put("rol", usuario.getRol());
        response.put("fotoUrl", usuario.getFotoUrl()); 
        
        return response;
    }
}
