package com.tuki.sistema.controller;

import com.tuki.sistema.dto.PerfilUpdateRequest;
import com.tuki.sistema.dto.UsuarioRegistroRequest;
import com.tuki.sistema.dto.UsuarioUpdateRequest;
import com.tuki.sistema.entity.Usuario;
import com.tuki.sistema.service.UsuarioService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.util.List;

@RestController
@RequestMapping("/api/usuarios")
public class UsuarioController {

    @Autowired private UsuarioService usuarioService;

    @GetMapping
    public List<Usuario> listar() {
        return usuarioService.listar();
    }

    @PostMapping("/registro")
    public ResponseEntity<?> registrarUsuario(@RequestBody UsuarioRegistroRequest request) {
        return ResponseEntity.ok(usuarioService.registrar(request, usuarioService.esSuperAdminActual()));
    }

    @PutMapping("/{id}")
    public ResponseEntity<?> actualizar(@PathVariable Long id, @RequestBody UsuarioUpdateRequest request) {
        return ResponseEntity.ok(usuarioService.actualizar(id, request, usuarioService.esSuperAdminActual()));
    }

    @PostMapping("/{id}/foto")
    public ResponseEntity<?> subirFoto(@PathVariable Long id, @RequestParam("archivo") MultipartFile archivo) throws IOException {
        return ResponseEntity.ok(usuarioService.subirFotoPerfil(id, archivo, usuarioService.obtenerEmailAutenticado()));
    }

    @PutMapping("/perfil/{id}")
    public ResponseEntity<?> actualizarPerfil(@PathVariable Long id, @RequestBody PerfilUpdateRequest request) {
        return ResponseEntity.ok(usuarioService.actualizarPerfilConMensaje(id, request, usuarioService.obtenerEmailAutenticado()));
    }

    @PutMapping("/{id}/estado")
    public ResponseEntity<?> cambiarEstado(@PathVariable Long id) {
        return ResponseEntity.ok(usuarioService.cambiarEstado(id, usuarioService.esSuperAdminActual()));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<?> eliminarUsuario(@PathVariable Long id) {
        return ResponseEntity.ok(usuarioService.eliminarUsuarioConMensaje(id, usuarioService.esSuperAdminActual()));
    }
}
