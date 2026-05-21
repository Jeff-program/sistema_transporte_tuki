package com.tuki.sistema.controller;

import com.tuki.sistema.service.SistemaService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.core.io.InputStreamResource;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.io.File;
import java.io.FileInputStream;

@RestController
@RequestMapping("/api/superadmin")
@PreAuthorize("hasRole('SUPER_ADMIN')") // Solo él puede entrar aquí
public class SuperAdminController {

    @Autowired
    private SistemaService sistemaService;

    // Variables de la base de datos inyectadas desde Railway
    @Value("${spring.datasource.url}") private String dbUrl;
    @Value("${spring.datasource.username}") private String dbUser;
    @Value("${spring.datasource.password}") private String dbPass;

    @PostMapping("/mantenimiento/toggle")
    public ResponseEntity<?> toggleMantenimiento() {
        boolean actual = sistemaService.isEnMantenimiento();
        sistemaService.setEnMantenimiento(!actual);
        return ResponseEntity.ok("Mantenimiento " + (!actual ? "ACTIVADO" : "DESACTIVADO"));
    }

    @GetMapping("/backup")
    public ResponseEntity<?> descargarBackup() {
        try {
            // Extraer host y dbname de la URL de Railway
            String cleanUrl = dbUrl.replace("jdbc:postgresql://", "");
            String host = cleanUrl.split(":")[0];
            String dbName = cleanUrl.split("/")[1];

            // Crear comando de pg_dump
            ProcessBuilder pb = new ProcessBuilder(
                "pg_dump", "-h", host, "-U", dbUser, "-F", "c", "-f", "backup_tuki.dump", dbName
            );
            pb.environment().put("PGPASSWORD", dbPass);
            
            Process process = pb.start();
            process.waitFor();

            File backupFile = new File("backup_tuki.dump");
            InputStreamResource resource = new InputStreamResource(new FileInputStream(backupFile));

            return ResponseEntity.ok()
                    .header(HttpHeaders.CONTENT_DISPOSITION, "attachment;filename=backup_tuki.dump")
                    .contentType(MediaType.APPLICATION_OCTET_STREAM)
                    .contentLength(backupFile.length())
                    .body(resource);

        } catch (Exception e) {
            return ResponseEntity.internalServerError().body("Error al generar backup: " + e.getMessage());
        }
    }
}
