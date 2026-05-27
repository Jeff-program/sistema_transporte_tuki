package com.tuki.sistema.security;

import com.tuki.sistema.service.SistemaService;
import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.stereotype.Component;
import org.springframework.util.StringUtils;
import org.springframework.web.filter.OncePerRequestFilter;
import java.io.IOException;

@Component
public class MantenimientoFilter extends OncePerRequestFilter {

    @Autowired
    private SistemaService sistemaService;
    @Autowired
    private JwtTokenProvider tokenProvider;
    @Autowired
    private CustomUserDetailsService userDetailsService;

    @Override
    protected void doFilterInternal(HttpServletRequest request, HttpServletResponse response, FilterChain filterChain)
            throws ServletException, IOException {
        
        String path = request.getRequestURI();
        
        if (sistemaService.isEnMantenimiento() && !path.contains("/api/auth/login") && !path.contains("/api/superadmin")) {
            
            boolean isSuperAdmin = esSuperAdminAutenticado(request);

            if (!isSuperAdmin) {
                response.setStatus(HttpServletResponse.SC_SERVICE_UNAVAILABLE); 
                response.setContentType("application/json");
                response.getWriter().write("{\"error\": \"MANTENIMIENTO\", \"mensaje\": \"El sistema está en mantenimiento. Vuelve más tarde.\"}");
                return; 
            }
        }
        
        filterChain.doFilter(request, response);
    }

    private boolean esSuperAdminAutenticado(HttpServletRequest request) {
        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        if (auth != null && auth.getAuthorities().stream().anyMatch(a -> a.getAuthority().equals("ROLE_SUPER_ADMIN"))) {
            return true;
        }

        String bearerToken = request.getHeader("Authorization");
        if (!StringUtils.hasText(bearerToken) || !bearerToken.startsWith("Bearer ")) {
            return false;
        }

        String token = bearerToken.substring(7);
        if (!tokenProvider.validarToken(token)) {
            return false;
        }

        try {
            String email = tokenProvider.obtenerEmailDelToken(token);
            UserDetails userDetails = userDetailsService.loadUserByUsername(email);
            return userDetails.getAuthorities().stream()
                    .anyMatch(a -> a.getAuthority().equals("ROLE_SUPER_ADMIN"));
        } catch (Exception e) {
            return false;
        }
    }
}
