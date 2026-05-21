package com.tuki.sistema;

import com.tuki.sistema.entity.Usuario;
import com.tuki.sistema.repository.UsuarioRepository;
import org.springframework.boot.CommandLineRunner;
import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.context.annotation.Bean;
import org.springframework.scheduling.annotation.EnableScheduling;
import org.springframework.security.crypto.password.PasswordEncoder;
import jakarta.annotation.PostConstruct;
import java.util.TimeZone;

@SpringBootApplication
@EnableScheduling
public class SistemaApplication {

    public static void main(String[] args) {
        SpringApplication.run(SistemaApplication.class, args);
    }

    @Bean
    public CommandLineRunner initAdmin(UsuarioRepository usuarioRepository, PasswordEncoder passwordEncoder) {
        return args -> {
            // 1. Crear el Administrador General (Si no existe)
            if (usuarioRepository.findByEmail("admin@tuki.com").isEmpty()) {
                Usuario admin = new Usuario();
                admin.setNombreCompleto("Administrador General");
                admin.setEmail("admin@tuki.com");
                admin.setPassword(passwordEncoder.encode("admin123"));
                admin.setRol("ADMIN");
                admin.setEstado("ACTIVO");
                usuarioRepository.save(admin);
                
                System.out.println("======================================================");
                System.out.println("✅ USUARIO ADMINISTRADOR CREADO CON ÉXITO");
                System.out.println("✉️ Correo: admin@tuki.com");
                System.out.println("🔑 Clave: admin123");
                System.out.println("======================================================");
            }

            // 2. Crear el SUPER ADMINISTRADOR (El dueño del sistema)
            if (usuarioRepository.findByEmail("super@tuki.com").isEmpty()) {
                Usuario superAdmin = new Usuario();
                superAdmin.setNombreCompleto("Súper Administrador del Sistema");
                superAdmin.setEmail("super@tuki.com");
                superAdmin.setPassword(passwordEncoder.encode("superadmin2024")); // Clave más fuerte
                superAdmin.setRol("SUPER_ADMIN");
                superAdmin.setEstado("ACTIVO");
                usuarioRepository.save(superAdmin);
                
                System.out.println("======================================================");
                System.out.println("🛡️ SUPER ADMINISTRADOR CREADO CON ÉXITO");
                System.out.println("✉️ Correo: super@tuki.com");
                System.out.println("🔑 Clave: superadmin2024");
                System.out.println("======================================================");
            }
        };
    }

    @PostConstruct
    public void init() {
        TimeZone.setDefault(TimeZone.getTimeZone("America/Lima"));
    }
}