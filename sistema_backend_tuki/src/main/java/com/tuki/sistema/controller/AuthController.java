package com.tuki.sistema.controller;

import com.tuki.sistema.dto.LoginDTO;
import com.tuki.sistema.service.AuthService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/auth")
public class AuthController {

    @Autowired
    private AuthService authService;

    @PostMapping("/login")
    public ResponseEntity<?> login(@RequestBody LoginDTO loginDto) {
        return ResponseEntity.ok(authService.autenticar(loginDto));
    }
}