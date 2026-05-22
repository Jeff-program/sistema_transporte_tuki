package com.tuki.sistema.security;

import com.tuki.sistema.service.SistemaService;
import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;
import java.io.IOException;

@Component
public class MantenimientoFilter extends OncePerRequestFilter {

    @Autowired
    private SistemaService sistemaService;

    @Override
    protected void doFilterInternal(HttpServletRequest request, HttpServletResponse response, FilterChain filterChain)
            throws ServletException, IOException {
        
        String path = request.getRequestURI();
        
        if (sistemaService.isEnMantenimiento() && !path.contains("/api/auth/login") && !path.contains("/api/superadmin")) {
            
            Authentication auth = SecurityContextHolder.getContext().getAuthentication();
            boolean isSuperAdmin = auth != null && auth.getAuthorities().stream()
                    .anyMatch(a -> a.getAuthority().equals("ROLE_SUPER_ADMIN"));

            if (!isSuperAdmin) {
                response.setStatus(HttpServletResponse.SC_SERVICE_UNAVAILABLE); 
                response.setContentType("application/json");
                response.getWriter().write("{\"error\": \"MANTENIMIENTO\", \"mensaje\": \"El sistema está en mantenimiento. Vuelve más tarde.\"}");
                return; 
            }
        }
        
        filterChain.doFilter(request, response);
    }
}
