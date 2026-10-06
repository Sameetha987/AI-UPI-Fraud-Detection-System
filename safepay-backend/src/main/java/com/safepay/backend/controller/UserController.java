package com.safepay.backend.controller;

import com.safepay.backend.dto.ChangePasswordRequest;
import com.safepay.backend.dto.UpdateProfileRequest;
import com.safepay.backend.dto.UserProfileResponse;
import com.safepay.backend.entity.User;
import com.safepay.backend.repository.UserRepository;
import com.safepay.backend.service.UserService;
import jakarta.validation.Valid;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

@RestController
@RequestMapping("/api/users")
public class UserController {

    private final UserRepository userRepository;
    private final UserService userService;

    public UserController(
            UserRepository userRepository,
            UserService userService
    ) {
        this.userRepository = userRepository;
        this.userService = userService;
    }

    // =========================================================
    // GET CURRENT USER PROFILE
    // GET /api/users/me
    // =========================================================

    @GetMapping("/me")
    public ResponseEntity<UserProfileResponse> getCurrentUser(
            @AuthenticationPrincipal Jwt jwt
    ) {

        Long userId = Long.valueOf(jwt.getSubject());

        User user = userRepository.findById(userId)
                .orElseThrow(() ->
                        new RuntimeException("User not found")
                );

        UserProfileResponse response =
                new UserProfileResponse(
                        user.getId(),
                        user.getFullName(),
                        user.getEmail(),
                        user.getPhone(),
                        user.getRole().name(),
                        user.getStatus().name(),
                        user.getCreatedAt().toString()
                );

        return ResponseEntity.ok(response);
    }


    // =========================================================
    // UPDATE CURRENT USER PROFILE
    // PUT /api/users/me
    // =========================================================

    @PutMapping("/me")
    public ResponseEntity<UserProfileResponse> updateCurrentUser(
            @AuthenticationPrincipal Jwt jwt,
            @Valid @RequestBody UpdateProfileRequest request
    ) {

        Long userId = Long.valueOf(jwt.getSubject());

        User user = userRepository.findById(userId)
                .orElseThrow(() ->
                        new RuntimeException("User not found")
                );

        String newFullName =
                request.fullName().trim();

        String newPhone =
                request.phone().trim();

        // Check whether the new phone number belongs
        // to another user.
        userRepository.findByPhone(newPhone)
                .ifPresent(existingUser -> {

                    if (!existingUser.getId().equals(userId)) {
                        throw new IllegalArgumentException(
                                "Phone number is already registered"
                        );
                    }
                });

        user.setFullName(newFullName);
        user.setPhone(newPhone);

        User updatedUser =
                userRepository.save(user);

        UserProfileResponse response =
                new UserProfileResponse(
                        updatedUser.getId(),
                        updatedUser.getFullName(),
                        updatedUser.getEmail(),
                        updatedUser.getPhone(),
                        updatedUser.getRole().name(),
                        updatedUser.getStatus().name(),
                        updatedUser.getCreatedAt().toString()
                );

        return ResponseEntity.ok(response);
    }


    // =========================================================
    // CHANGE PASSWORD
    // PUT /api/users/me/password
    // =========================================================

    @PutMapping("/me/password")
    public ResponseEntity<Map<String, String>> changePassword(
            @AuthenticationPrincipal Jwt jwt,
            @Valid @RequestBody ChangePasswordRequest request
    ) {

        Long userId = Long.valueOf(jwt.getSubject());

        userService.changePassword(
                userId,
                request
        );

        return ResponseEntity.ok(
                Map.of(
                        "message",
                        "Password changed successfully"
                )
        );
    }
}