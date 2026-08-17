package com.safepay.backend.controller;

import com.safepay.backend.dto.AdminUserResponse;
import com.safepay.backend.security.JwtService;
import com.safepay.backend.service.AdminService;
import org.springframework.http.ResponseEntity;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/admin")
public class AdminController {

    private final AdminService adminService;

    public AdminController(AdminService adminService) {
        this.adminService = adminService;
    }

    // =========================================================
    // GET ALL USERS
    // GET /api/admin/users
    // =========================================================

    @GetMapping("/users")
    public ResponseEntity<List<AdminUserResponse>> getAllUsers() {

        return ResponseEntity.ok(
                adminService.getAllUsers()
        );
    }

    // =========================================================
    // GET USER BY ID
    // GET /api/admin/users/{id}
    // =========================================================

    @GetMapping("/users/{id}")
    public ResponseEntity<AdminUserResponse> getUserById(
            @PathVariable Long id
    ) {

        return ResponseEntity.ok(
                adminService.getUserById(id)
        );
    }

    // =========================================================
    // BLOCK USER
    // PATCH /api/admin/users/{id}/block
    // =========================================================

    @PatchMapping("/users/{id}/block")
    public ResponseEntity<AdminUserResponse> blockUser(
            @PathVariable Long id,
            @AuthenticationPrincipal Jwt jwt
    ) {

        Long adminId = Long.valueOf(jwt.getSubject());

        return ResponseEntity.ok(
                adminService.blockUser(id, adminId)
        );
    }

    // =========================================================
    // SUSPEND USER
    // PATCH /api/admin/users/{id}/suspend
    // =========================================================

    @PatchMapping("/users/{id}/suspend")
    public ResponseEntity<AdminUserResponse> suspendUser(
            @PathVariable Long id,
            @AuthenticationPrincipal Jwt jwt
    ) {

        Long adminId = Long.valueOf(jwt.getSubject());

        return ResponseEntity.ok(
                adminService.suspendUser(id, adminId)
        );
    }

    // =========================================================
    // ACTIVATE USER
    // PATCH /api/admin/users/{id}/activate
    // =========================================================

    @PatchMapping("/users/{id}/activate")
    public ResponseEntity<AdminUserResponse> activateUser(
            @PathVariable Long id,
            @AuthenticationPrincipal Jwt jwt
    ) {

        Long adminId = Long.valueOf(jwt.getSubject());

        return ResponseEntity.ok(
                adminService.activateUser(id, adminId)
        );
    }
}