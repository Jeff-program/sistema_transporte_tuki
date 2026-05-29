package com.tuki.sistema.security;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.http.HttpMethod;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.config.annotation.authentication.configuration.AuthenticationConfiguration;
import org.springframework.security.config.annotation.method.configuration.EnableMethodSecurity;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.annotation.web.configuration.EnableWebSecurity;
import org.springframework.security.config.http.SessionCreationPolicy;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.security.web.SecurityFilterChain;
import org.springframework.security.web.authentication.UsernamePasswordAuthenticationFilter;
import org.springframework.web.cors.CorsConfiguration;
import org.springframework.web.cors.CorsConfigurationSource;
import org.springframework.web.cors.UrlBasedCorsConfigurationSource;
import java.util.Arrays;
import java.util.List;

@Configuration
@EnableWebSecurity
@EnableMethodSecurity
public class SecurityConfig {

    @Value("${app.cors.allowed-origins}")
    private String allowedOrigins;

    @Bean
    public JwtAuthenticationFilter jwtAuthenticationFilter() {
        return new JwtAuthenticationFilter();
    }

    @Bean
    public PasswordEncoder passwordEncoder() {
        return new BCryptPasswordEncoder();
    }

    @Bean
    public AuthenticationManager authenticationManager(AuthenticationConfiguration config) throws Exception {
        return config.getAuthenticationManager();
    }

    @Bean
    public SecurityFilterChain filterChain(HttpSecurity http, MantenimientoFilter mantenimientoFilter) throws Exception {
        http
            .cors(cors -> cors.configurationSource(corsConfigurationSource()))
            .csrf(csrf -> csrf.disable())
            .sessionManagement(session -> session.sessionCreationPolicy(SessionCreationPolicy.STATELESS))
            .authorizeHttpRequests(auth -> auth
                .requestMatchers(HttpMethod.OPTIONS, "/**").permitAll()
                .requestMatchers("/api/auth/**").permitAll()
                .requestMatchers("/uploads/**").permitAll()
                .requestMatchers("/api/superadmin/**").hasRole("SUPER_ADMIN")
                .requestMatchers(HttpMethod.POST, "/api/usuarios/*/foto").authenticated()
                .requestMatchers(HttpMethod.PUT, "/api/usuarios/perfil/*").authenticated()
                .requestMatchers("/api/usuarios/**", "/api/reportes/**").hasAnyRole("ADMIN", "ADMINISTRADOR", "SUPER_ADMIN")
                .requestMatchers(HttpMethod.POST, "/api/agencias/**", "/api/rios/**", "/api/puertos/**", "/api/embarcaciones/**", "/api/rutas/**", "/api/escalas/**", "/api/tarifas/**", "/api/viajes/**").hasAnyRole("ADMIN", "ADMINISTRADOR", "SUPER_ADMIN")
                .requestMatchers(HttpMethod.PUT, "/api/agencias/**", "/api/rios/**", "/api/puertos/**", "/api/embarcaciones/**", "/api/rutas/**", "/api/escalas/**", "/api/tarifas/**", "/api/viajes/**").hasAnyRole("ADMIN", "ADMINISTRADOR", "SUPER_ADMIN")
                .requestMatchers(HttpMethod.DELETE, "/api/agencias/**", "/api/rios/**", "/api/puertos/**", "/api/embarcaciones/**", "/api/rutas/**", "/api/escalas/**", "/api/tarifas/**", "/api/viajes/**").hasAnyRole("ADMIN", "ADMINISTRADOR", "SUPER_ADMIN")
                .requestMatchers("/api/caja/**").hasAnyRole("ASESOR", "AGENCIA", "ADMIN", "ADMINISTRADOR", "SUPER_ADMIN")
                .requestMatchers("/api/ventas/**", "/api/pasajeros/**").hasAnyRole("ASESOR", "AGENCIA", "ADMIN", "ADMINISTRADOR", "SUPER_ADMIN")
                .anyRequest().authenticated()
            );

        http.addFilterBefore(jwtAuthenticationFilter(), UsernamePasswordAuthenticationFilter.class);
        http.addFilterAfter(mantenimientoFilter, JwtAuthenticationFilter.class);
        return http.build();
    }

    @Bean
    public CorsConfigurationSource corsConfigurationSource() {
        CorsConfiguration configuration = new CorsConfiguration();
        List<String> origins = Arrays.stream(allowedOrigins.split(","))
                .map(String::trim)
                .filter(origin -> !origin.isEmpty())
                .toList();
        configuration.setAllowedOriginPatterns(origins);
        configuration.setAllowedMethods(Arrays.asList("GET", "POST", "PUT", "DELETE", "OPTIONS", "PATCH"));
        configuration.setAllowedHeaders(Arrays.asList("Authorization", "Content-Type", "X-Requested-With", "Accept"));
        configuration.setAllowCredentials(true);
        configuration.setExposedHeaders(Arrays.asList("Content-Disposition")); 

        UrlBasedCorsConfigurationSource source = new UrlBasedCorsConfigurationSource();
        source.registerCorsConfiguration("/**", configuration);
        return source;
    }
}
