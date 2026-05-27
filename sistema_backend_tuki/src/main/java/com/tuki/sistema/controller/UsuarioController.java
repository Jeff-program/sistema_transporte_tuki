package com.tuki.sistema.controller;

import com.tuki.sistema.entity.Usuario;
import com.tuki.sistema.repository.UsuarioRepository;
import com.tuki.sistema.repository.AgenciaRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.util.StringUtils;
import java.util.UUID;
import java.util.Arrays;

import java.nio.file.*;
import java.awt.image.BufferedImage;
import java.io.IOException;
import javax.imageio.ImageIO;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/usuarios")
public class UsuarioController {

    @Autowired private UsuarioRepository usuarioRepository;
    @Autowired private PasswordEncoder passwordEncoder;
    @Autowired private AgenciaRepository agenciaRepository;

    private boolean esSuperAdminActual() {
        return SecurityContextHolder.getContext().getAuthentication().getAuthorities().stream()
                .anyMatch(a -> "ROLE_SUPER_ADMIN".equals(a.getAuthority()));
    }

    private boolean esUsuarioSuperAdmin(Usuario usuario) {
        return usuario != null && "SUPER_ADMIN".equalsIgnoreCase(usuario.getRol());
    }

    @GetMapping
    public List<Usuario> listar() {
        return usuarioRepository.findAll();
    }

    @PostMapping("/registro")
    public ResponseEntity<?> registrarUsuario(@RequestBody Map<String, Object> payload) {
        String email = payload.get("email").toString().trim();
        String password = payload.get("password") != null ? payload.get("password").toString() : "";
        if (password.length() < 6) {
            return ResponseEntity.badRequest().body("La contraseña debe tener al menos 6 caracteres");
        }

        if (usuarioRepository.findByEmail(email).isPresent()) {
            Usuario fantasma = usuarioRepository.findByEmail(email).get();

            if ("INACTIVO".equals(fantasma.getEstado()) || "ELIMINADO".equals(fantasma.getEstado())) {
                fantasma.setEmail(fantasma.getEmail() + "_del_auto_" + System.currentTimeMillis());
                usuarioRepository.save(fantasma);
            } else {
                return ResponseEntity.badRequest().body("El email ya existe y pertenece a un usuario ACTIVO");
            }
        }

        Usuario u = new Usuario();
        u.setNombreCompleto((String) payload.get("nombreCompleto"));
        u.setEmail(email);
        u.setPassword(passwordEncoder.encode(password));

        String rol = (String) payload.get("rol");
        String rolNormalizado = rol != null ? rol.toUpperCase() : "ASESOR";
        if ("SUPER_ADMIN".equals(rolNormalizado) && !esSuperAdminActual()) {
            return ResponseEntity.status(403).body("Solo un SUPER_ADMIN puede crear otro SUPER_ADMIN");
        }
        u.setRol(rolNormalizado);

        // 🔥 MEJORA: ASIGNACIÓN DIRECTA DE AGENCIA A ASESORES
        if (payload.get("idAgencia") != null && !payload.get("idAgencia").toString().trim().isEmpty()) {
            Long idAgencia = Long.valueOf(payload.get("idAgencia").toString());
            u.setAgencia(agenciaRepository.findById(idAgencia).orElse(null));
        }

        return ResponseEntity.ok(usuarioRepository.save(u));
    }

    @PutMapping("/{id}")
    public ResponseEntity<?> actualizar(@PathVariable Long id, @RequestBody Map<String, Object> payload) {
        Usuario u = usuarioRepository.findById(id).orElseThrow();

        if (esUsuarioSuperAdmin(u) && !esSuperAdminActual()) {
            return ResponseEntity.status(403).body("Solo un SUPER_ADMIN puede modificar otro SUPER_ADMIN");
        }

        if (payload.get("nombreCompleto") != null) {
            u.setNombreCompleto(payload.get("nombreCompleto").toString());
        }

        if (payload.get("email") != null && !payload.get("email").toString().trim().isEmpty()) {
            String nuevoEmail = payload.get("email").toString().trim();
            Usuario existe = usuarioRepository.findByEmail(nuevoEmail).orElse(null);

            if (existe != null && !existe.getIdUsuario().equals(id)) {
                if ("INACTIVO".equals(existe.getEstado()) || "ELIMINADO".equals(existe.getEstado())) {
                    existe.setEmail(existe.getEmail() + "_del_auto_" + System.currentTimeMillis());
                    usuarioRepository.save(existe);
                } else {
                    return ResponseEntity.badRequest().body("El email ya está en uso por otro usuario ACTIVO");
                }
            }
            u.setEmail(nuevoEmail);
        }

        if (payload.get("rol") != null) {
            String rolNormalizado = payload.get("rol").toString().toUpperCase();
            if ("SUPER_ADMIN".equals(rolNormalizado) && !esSuperAdminActual()) {
                return ResponseEntity.status(403).body("Solo un SUPER_ADMIN puede asignar ese rol");
            }
            u.setRol(rolNormalizado);
        }

        // 🔥 MEJORA: ACTUALIZACIÓN DE AGENCIA A ASESORES
        if (payload.get("idAgencia") != null && !payload.get("idAgencia").toString().trim().isEmpty()) {
            Long idAgencia = Long.valueOf(payload.get("idAgencia").toString());
            u.setAgencia(agenciaRepository.findById(idAgencia).orElse(null));
        } else if (payload.containsKey("idAgencia")) {
            u.setAgencia(null); // Permite "desvincular" al asesor dejándolo libre si se envía idAgencia vacío
        }

        if (payload.get("newPassword") != null && !payload.get("newPassword").toString().isEmpty()) {
            if (payload.get("newPassword").toString().length() < 6) {
                return ResponseEntity.badRequest().body("La contraseña nueva debe tener al menos 6 caracteres");
            }
            if (payload.get("currentPassword") == null || !passwordEncoder.matches(payload.get("currentPassword").toString(), u.getPassword())) {
                return ResponseEntity.badRequest().body("La contraseña actual es incorrecta");
            }
            u.setPassword(passwordEncoder.encode(payload.get("newPassword").toString()));
        } else if (payload.get("password") != null && !payload.get("password").toString().isEmpty()) {
            if (payload.get("password").toString().length() < 6) {
                return ResponseEntity.badRequest().body("La contraseña debe tener al menos 6 caracteres");
            }
            u.setPassword(passwordEncoder.encode(payload.get("password").toString()));
        }

        return ResponseEntity.ok(usuarioRepository.save(u));
    }

    @PostMapping("/{id}/foto")
    public ResponseEntity<?> subirFoto(@PathVariable Long id, @RequestParam("archivo") MultipartFile archivo) {
        try {
            Usuario u = usuarioRepository.findById(id).orElseThrow();

            String emailAutenticado = SecurityContextHolder.getContext().getAuthentication().getName();
            if (!u.getEmail().equals(emailAutenticado)) {
                return ResponseEntity.status(403).body(Map.of("error", "Acceso denegado. No puedes modificar el perfil de otro usuario."));
            }

            if (archivo.isEmpty() || archivo.getSize() > 5 * 1024 * 1024) {
                return ResponseEntity.badRequest().body(Map.of("error", "La imagen es obligatoria y no debe superar 5MB."));
            }

            String nombreOriginal = StringUtils.cleanPath(archivo.getOriginalFilename());
            String extension = StringUtils.getFilenameExtension(nombreOriginal);
            List<String> permitidas = Arrays.asList("jpg", "jpeg", "png");

            if (extension == null || !permitidas.contains(extension.toLowerCase())) {
                return ResponseEntity.badRequest().body(Map.of("error", "Formato de archivo no vÃ¡lido. Sube una imagen (JPG, PNG)."));
            }

            // Generamos un nombre inmodificable y aleatorio
            String contentType = archivo.getContentType();
            if (contentType == null || !contentType.toLowerCase().startsWith("image/")) {
                return ResponseEntity.badRequest().body(Map.of("error", "El archivo no parece ser una imagen valida."));
            }

            BufferedImage imagen = ImageIO.read(archivo.getInputStream());
            if (imagen == null || imagen.getWidth() <= 0 || imagen.getHeight() <= 0) {
                return ResponseEntity.badRequest().body(Map.of("error", "El contenido del archivo no es una imagen valida."));
            }

            String nombreSeguro = UUID.randomUUID().toString() + "." + extension;
            Path directorioUploads = Paths.get("uploads").normalize().toAbsolutePath();
            Path ruta = directorioUploads.resolve(nombreSeguro).normalize().toAbsolutePath();
            if (!ruta.startsWith(directorioUploads)) {
                return ResponseEntity.badRequest().body(Map.of("error", "Nombre de archivo no valido."));
            }

            Files.createDirectories(ruta.getParent());
            Files.copy(archivo.getInputStream(), ruta, StandardCopyOption.REPLACE_EXISTING);

            u.setFotoUrl("/uploads/" + nombreSeguro);
            return ResponseEntity.ok(usuarioRepository.save(u));

        } catch (IOException e) {
            return ResponseEntity.status(500).body(Map.of("error", "Error interno al guardar la imagen."));
        }
    }

    @PutMapping("/perfil/{id}")
    public ResponseEntity<?> actualizarPerfil(@PathVariable Long id, @RequestBody Map<String, Object> payload) {
        try {
            Usuario u = usuarioRepository.findById(id)
                    .orElseThrow(() -> new RuntimeException("Usuario no encontrado"));

            String emailAutenticado = SecurityContextHolder.getContext().getAuthentication().getName();
            if (!u.getEmail().equals(emailAutenticado)) {
                return ResponseEntity.status(403).body(Map.of("error", "Acceso denegado. No puedes modificar el perfil de otro usuario."));
            }

            if (payload.get("nombreCompleto") != null && !payload.get("nombreCompleto").toString().trim().isEmpty()) {
                u.setNombreCompleto(payload.get("nombreCompleto").toString().trim());
            }

            if (payload.get("email") != null && !payload.get("email").toString().trim().isEmpty()) {
                String nuevoEmail = payload.get("email").toString().trim();
                Usuario existe = usuarioRepository.findByEmail(nuevoEmail).orElse(null);

                if (existe != null && !existe.getIdUsuario().equals(id)) {
                    if ("INACTIVO".equals(existe.getEstado()) || "ELIMINADO".equals(existe.getEstado())) {
                        existe.setEmail(existe.getEmail() + "_del_auto_" + System.currentTimeMillis());
                        usuarioRepository.save(existe);
                    } else {
                        return ResponseEntity.status(400).body(Map.of("error", "Ese correo ya estÃ¡ en uso por otro usuario ACTIVO"));
                    }
                }
                u.setEmail(nuevoEmail);
            }

            if (payload.get("nuevaPassword") != null && !payload.get("nuevaPassword").toString().trim().isEmpty()) {
                String passwordActual = payload.get("passwordActual") != null ? payload.get("passwordActual").toString() : null;
                String nuevaPassword = payload.get("nuevaPassword").toString();

                if (passwordActual == null || passwordActual.trim().isEmpty()) {
                    return ResponseEntity.status(400).body(Map.of("error", "Debe enviar su contraseÃ±a actual para realizar el cambio"));
                }

                if (!passwordEncoder.matches(passwordActual, u.getPassword())) {
                    return ResponseEntity.status(400).body(Map.of("error", "La contraseÃ±a actual es incorrecta"));
                }

                u.setPassword(passwordEncoder.encode(nuevaPassword));
            }

            usuarioRepository.save(u);
            return ResponseEntity.ok(Map.of("mensaje", "Perfil actualizado correctamente"));

        } catch (Exception e) {
            e.printStackTrace();
            return ResponseEntity.status(500).body(Map.of("error", "OcurriÃ³ un error al actualizar: " + e.getMessage()));
        }
    }

    @PutMapping("/{id}/estado")
    public ResponseEntity<?> cambiarEstado(@PathVariable Long id) {
        Usuario u = usuarioRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Usuario no encontrado"));

        if (esUsuarioSuperAdmin(u) && !esSuperAdminActual()) {
            return ResponseEntity.status(403).body(Map.of("error", "Solo un SUPER_ADMIN puede cambiar el estado de otro SUPER_ADMIN"));
        }

        u.setEstado("ACTIVO".equals(u.getEstado()) ? "INACTIVO" : "ACTIVO");
        return ResponseEntity.ok(usuarioRepository.save(u));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<?> eliminarUsuario(@PathVariable Long id) {
        try {
            Usuario u = usuarioRepository.findById(id)
                    .orElseThrow(() -> new RuntimeException("Usuario no encontrado"));

            if (esUsuarioSuperAdmin(u) && !esSuperAdminActual()) {
                return ResponseEntity.status(403).body(Map.of("error", "Solo un SUPER_ADMIN puede eliminar otro SUPER_ADMIN"));
            }

            u.setEstado("ELIMINADO");

            if (!u.getEmail().contains("_del_")) {
                u.setEmail(u.getEmail() + "_del_" + System.currentTimeMillis());
            }

            usuarioRepository.save(u);

            return ResponseEntity.ok(Map.of("mensaje", "Usuario eliminado correctamente"));
        } catch (Exception e) {
            return ResponseEntity.status(500).body(Map.of("error", "Error al eliminar el usuario: " + e.getMessage()));
        }
    }
}
