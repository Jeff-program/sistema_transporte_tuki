package com.tuki.sistema.service;

import com.tuki.sistema.dto.MensajeResponse;
import com.tuki.sistema.dto.PerfilUpdateRequest;
import com.tuki.sistema.dto.UsuarioRegistroRequest;
import com.tuki.sistema.dto.UsuarioUpdateRequest;
import com.tuki.sistema.entity.Usuario;
import com.tuki.sistema.repository.AgenciaRepository;
import com.tuki.sistema.repository.UsuarioRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.util.StringUtils;
import org.springframework.web.multipart.MultipartFile;

import javax.imageio.ImageIO;
import java.awt.image.BufferedImage;
import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.nio.file.StandardCopyOption;
import java.util.Arrays;
import java.util.List;
import java.util.UUID;

@Service
public class UsuarioService {

    @Autowired private UsuarioRepository usuarioRepository;
    @Autowired private AgenciaRepository agenciaRepository;
    @Autowired private PasswordEncoder passwordEncoder;

    public List<Usuario> listar() {
        return usuarioRepository.findAll();
    }

    public Usuario registrar(UsuarioRegistroRequest request, boolean esSuperAdminActual) {
        if (request == null) {
            throw new RuntimeException("Datos de usuario obligatorios.");
        }

        String email = limpiarEmail(request.getEmail());
        validarPassword(request.getPassword(), "La contraseña debe tener al menos 6 caracteres");
        liberarEmailInactivoSiExiste(email, null);

        Usuario usuario = new Usuario();
        usuario.setNombreCompleto(request.getNombreCompleto());
        usuario.setEmail(email);
        usuario.setPassword(passwordEncoder.encode(request.getPassword()));
        usuario.setRol(validarRol(request.getRol(), esSuperAdminActual));
        asignarAgencia(usuario, request.getIdAgencia());

        return usuarioRepository.save(usuario);
    }

    public Usuario actualizar(Long id, UsuarioUpdateRequest request, boolean esSuperAdminActual) {
        if (request == null) {
            throw new RuntimeException("Datos de usuario obligatorios.");
        }

        Usuario usuario = buscarUsuario(id);
        validarPermisoSuperAdmin(usuario, esSuperAdminActual, "Solo un SUPER_ADMIN puede modificar otro SUPER_ADMIN");

        if (tieneTexto(request.getNombreCompleto())) {
            usuario.setNombreCompleto(request.getNombreCompleto().trim());
        }

        if (tieneTexto(request.getEmail())) {
            String nuevoEmail = limpiarEmail(request.getEmail());
            liberarEmailInactivoSiExiste(nuevoEmail, id);
            usuario.setEmail(nuevoEmail);
        }

        if (request.getRol() != null) {
            usuario.setRol(validarRol(request.getRol(), esSuperAdminActual));
        }

        if (request.isIdAgenciaPresente()) {
            asignarAgencia(usuario, request.getIdAgencia());
        }

        actualizarPasswordAdministrativa(usuario, request);

        return usuarioRepository.save(usuario);
    }

    public Usuario actualizarPerfil(Long id, PerfilUpdateRequest request, String emailAutenticado) {
        if (request == null) {
            throw new RuntimeException("Datos de perfil obligatorios.");
        }

        Usuario usuario = buscarUsuario(id);
        validarPropietario(usuario, emailAutenticado);

        if (tieneTexto(request.getNombreCompleto())) {
            usuario.setNombreCompleto(request.getNombreCompleto().trim());
        }

        if (tieneTexto(request.getEmail())) {
            String nuevoEmail = limpiarEmail(request.getEmail());
            liberarEmailInactivoSiExiste(nuevoEmail, id);
            usuario.setEmail(nuevoEmail);
        }

        if (tieneTexto(request.getNuevaPassword())) {
            if (!tieneTexto(request.getPasswordActual())) {
                throw new RuntimeException("Debe enviar su contraseña actual para realizar el cambio");
            }
            if (!passwordEncoder.matches(request.getPasswordActual(), usuario.getPassword())) {
                throw new RuntimeException("La contraseña actual es incorrecta");
            }
            validarPassword(request.getNuevaPassword(), "La contraseña nueva debe tener al menos 6 caracteres");
            usuario.setPassword(passwordEncoder.encode(request.getNuevaPassword()));
        }

        return usuarioRepository.save(usuario);
    }

    public MensajeResponse actualizarPerfilConMensaje(Long id, PerfilUpdateRequest request, String emailAutenticado) {
        actualizarPerfil(id, request, emailAutenticado);
        return new MensajeResponse("Perfil actualizado correctamente");
    }

    public Usuario cambiarEstado(Long id, boolean esSuperAdminActual) {
        Usuario usuario = buscarUsuario(id);
        validarPermisoSuperAdmin(usuario, esSuperAdminActual, "Solo un SUPER_ADMIN puede cambiar el estado de otro SUPER_ADMIN");
        usuario.setEstado("ACTIVO".equals(usuario.getEstado()) ? "INACTIVO" : "ACTIVO");
        return usuarioRepository.save(usuario);
    }

    public void eliminarUsuario(Long id, boolean esSuperAdminActual) {
        Usuario usuario = buscarUsuario(id);
        validarPermisoSuperAdmin(usuario, esSuperAdminActual, "Solo un SUPER_ADMIN puede eliminar otro SUPER_ADMIN");
        usuario.setEstado("ELIMINADO");

        if (!usuario.getEmail().contains("_del_")) {
            usuario.setEmail(usuario.getEmail() + "_del_" + System.currentTimeMillis());
        }

        usuarioRepository.save(usuario);
    }

    public MensajeResponse eliminarUsuarioConMensaje(Long id, boolean esSuperAdminActual) {
        eliminarUsuario(id, esSuperAdminActual);
        return new MensajeResponse("Usuario eliminado correctamente");
    }

    public Usuario buscarUsuario(Long id) {
        return usuarioRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Usuario no encontrado"));
    }

    public Usuario obtenerUsuarioAutenticado() {
        String email = obtenerEmailAutenticado();
        return usuarioRepository.findByEmail(email)
                .orElseThrow(() -> new RuntimeException("Usuario autenticado no encontrado en el sistema"));
    }

    public String obtenerEmailAutenticado() {
        return SecurityContextHolder.getContext().getAuthentication().getName();
    }

    public Long obtenerIdUsuarioAutenticado() {
        return obtenerUsuarioAutenticado().getIdUsuario();
    }

    public boolean esSuperAdminActual() {
        return SecurityContextHolder.getContext().getAuthentication().getAuthorities().stream()
                .anyMatch(a -> "ROLE_SUPER_ADMIN".equals(a.getAuthority()));
    }

    public Usuario guardarFoto(Usuario usuario) {
        return usuarioRepository.save(usuario);
    }

    public Usuario subirFotoPerfil(Long id, MultipartFile archivo, String emailAutenticado) throws IOException {
        Usuario usuario = buscarUsuario(id);
        validarPropietario(usuario, emailAutenticado);

        if (archivo.isEmpty() || archivo.getSize() > 5 * 1024 * 1024) {
            throw new RuntimeException("La imagen es obligatoria y no debe superar 5MB.");
        }

        String nombreOriginal = StringUtils.cleanPath(archivo.getOriginalFilename());
        String extension = StringUtils.getFilenameExtension(nombreOriginal);
        List<String> permitidas = Arrays.asList("jpg", "jpeg", "png");

        if (extension == null || !permitidas.contains(extension.toLowerCase())) {
            throw new RuntimeException("Formato de archivo no valido. Sube una imagen JPG o PNG.");
        }

        String contentType = archivo.getContentType();
        if (contentType == null || !contentType.toLowerCase().startsWith("image/")) {
            throw new RuntimeException("El archivo no parece ser una imagen valida.");
        }

        BufferedImage imagen = ImageIO.read(archivo.getInputStream());
        if (imagen == null || imagen.getWidth() <= 0 || imagen.getHeight() <= 0) {
            throw new RuntimeException("El contenido del archivo no es una imagen valida.");
        }

        String nombreSeguro = UUID.randomUUID() + "." + extension.toLowerCase();
        Path directorioUploads = Paths.get("uploads").normalize().toAbsolutePath();
        Path ruta = directorioUploads.resolve(nombreSeguro).normalize().toAbsolutePath();
        if (!ruta.startsWith(directorioUploads)) {
            throw new RuntimeException("Nombre de archivo no valido.");
        }

        Files.createDirectories(ruta.getParent());
        Files.copy(archivo.getInputStream(), ruta, StandardCopyOption.REPLACE_EXISTING);

        usuario.setFotoUrl("/uploads/" + nombreSeguro);
        return usuarioRepository.save(usuario);
    }

    public void validarPropietario(Usuario usuario, String emailAutenticado) {
        if (usuario == null || !usuario.getEmail().equals(emailAutenticado)) {
            throw new SecurityException("Acceso denegado. No puedes modificar el perfil de otro usuario.");
        }
    }

    private void actualizarPasswordAdministrativa(Usuario usuario, UsuarioUpdateRequest request) {
        if (tieneTexto(request.getNewPassword())) {
            validarPassword(request.getNewPassword(), "La contraseña nueva debe tener al menos 6 caracteres");
            if (!tieneTexto(request.getCurrentPassword())
                    || !passwordEncoder.matches(request.getCurrentPassword(), usuario.getPassword())) {
                throw new RuntimeException("La contraseña actual es incorrecta");
            }
            usuario.setPassword(passwordEncoder.encode(request.getNewPassword()));
            return;
        }

        if (tieneTexto(request.getPassword())) {
            validarPassword(request.getPassword(), "La contraseña debe tener al menos 6 caracteres");
            usuario.setPassword(passwordEncoder.encode(request.getPassword()));
        }
    }

    private void asignarAgencia(Usuario usuario, Long idAgencia) {
        if (idAgencia == null) {
            usuario.setAgencia(null);
            return;
        }

        usuario.setAgencia(agenciaRepository.findById(idAgencia)
                .orElseThrow(() -> new RuntimeException("La agencia seleccionada no existe.")));
    }

    private void liberarEmailInactivoSiExiste(String email, Long idUsuarioActual) {
        Usuario existente = usuarioRepository.findByEmail(email).orElse(null);
        if (existente == null || existente.getIdUsuario().equals(idUsuarioActual)) {
            return;
        }

        if ("INACTIVO".equals(existente.getEstado()) || "ELIMINADO".equals(existente.getEstado())) {
            existente.setEmail(existente.getEmail() + "_del_auto_" + System.currentTimeMillis());
            usuarioRepository.save(existente);
            return;
        }

        throw new RuntimeException("El email ya está en uso por otro usuario ACTIVO");
    }

    private String validarRol(String rol, boolean esSuperAdminActual) {
        String rolNormalizado = rol != null ? rol.toUpperCase() : "ASESOR";
        if ("SUPER_ADMIN".equals(rolNormalizado) && !esSuperAdminActual) {
            throw new SecurityException("Solo un SUPER_ADMIN puede asignar ese rol");
        }
        return rolNormalizado;
    }

    private void validarPermisoSuperAdmin(Usuario usuario, boolean esSuperAdminActual, String mensaje) {
        if (usuario != null && "SUPER_ADMIN".equalsIgnoreCase(usuario.getRol()) && !esSuperAdminActual) {
            throw new SecurityException(mensaje);
        }
    }

    private String limpiarEmail(String email) {
        if (!tieneTexto(email)) {
            throw new RuntimeException("El email es obligatorio.");
        }
        return email.trim();
    }

    private void validarPassword(String password, String mensaje) {
        if (password == null || password.length() < 6) {
            throw new RuntimeException(mensaje);
        }
    }

    private boolean tieneTexto(String valor) {
        return valor != null && !valor.trim().isEmpty();
    }
}
