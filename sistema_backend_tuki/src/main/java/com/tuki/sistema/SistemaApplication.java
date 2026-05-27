package com.tuki.sistema;

import com.tuki.sistema.entity.Usuario;
import com.tuki.sistema.repository.UsuarioRepository;
import org.springframework.beans.factory.annotation.Value;
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

    @Value("${app.bootstrap.admin-email:admin@tuki.com}")
    private String adminEmail;
    @Value("${app.bootstrap.admin-password:}")
    private String adminPassword;
    @Value("${app.bootstrap.superadmin-email:super@tuki.com}")
    private String superAdminEmail;
    @Value("${app.bootstrap.superadmin-password:}")
    private String superAdminPassword;

    public static void main(String[] args) {
        SpringApplication.run(SistemaApplication.class, args);
    }

    @Bean
    public CommandLineRunner initAdmin(UsuarioRepository usuarioRepository, PasswordEncoder passwordEncoder) {
        return args -> {
            if (!adminPassword.isBlank() && usuarioRepository.findByEmail(adminEmail).isEmpty()) {
                Usuario admin = new Usuario();
                admin.setNombreCompleto("Administrador General");
                admin.setEmail(adminEmail);
                admin.setPassword(passwordEncoder.encode(adminPassword));
                admin.setRol("ADMIN");
                admin.setEstado("ACTIVO");
                usuarioRepository.save(admin);
                System.out.println("Usuario administrador inicial creado: " + adminEmail);
            }

            if (!superAdminPassword.isBlank() && usuarioRepository.findByEmail(superAdminEmail).isEmpty()) {
                Usuario superAdmin = new Usuario();
                superAdmin.setNombreCompleto("Super Administrador del Sistema");
                superAdmin.setEmail(superAdminEmail);
                superAdmin.setPassword(passwordEncoder.encode(superAdminPassword));
                superAdmin.setRol("SUPER_ADMIN");
                superAdmin.setEstado("ACTIVO");
                usuarioRepository.save(superAdmin);
                System.out.println("Usuario super administrador inicial creado: " + superAdminEmail);
            }
        };
    }

    @PostConstruct
    public void init() {
        TimeZone.setDefault(TimeZone.getTimeZone("America/Lima"));
    }
}
