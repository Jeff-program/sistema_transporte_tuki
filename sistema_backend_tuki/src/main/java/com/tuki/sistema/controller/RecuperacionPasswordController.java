package com.tuki.sistema.controller;

import com.tuki.sistema.dto.RecuperacionEmailRequest;
import com.tuki.sistema.dto.RestablecerPasswordRequest;
import com.tuki.sistema.dto.VerificarCodigoRequest;
import com.tuki.sistema.service.RecuperacionPasswordService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/auth")
public class RecuperacionPasswordController {

    @Autowired private RecuperacionPasswordService recuperacionPasswordService;

    @PostMapping("/olvide-password")
    public ResponseEntity<?> olvidePassword(@RequestBody RecuperacionEmailRequest request) {
        return ResponseEntity.ok(recuperacionPasswordService.solicitarCodigo(request));
    }

    @PostMapping("/verificar-codigo")
    public ResponseEntity<?> verificarCodigo(@RequestBody VerificarCodigoRequest request) {
        return ResponseEntity.ok(recuperacionPasswordService.verificarCodigo(request));
    }

    @PostMapping("/restablecer-password")
    public ResponseEntity<?> restablecerPassword(@RequestBody RestablecerPasswordRequest request) {
        return ResponseEntity.ok(recuperacionPasswordService.restablecerPassword(request));
    }
}
