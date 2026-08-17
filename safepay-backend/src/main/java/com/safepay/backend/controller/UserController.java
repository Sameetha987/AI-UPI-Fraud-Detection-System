package com.safepay.backend.controller;

import com.safepay.backend.dto.UpdateProfileRequest;
import com.safepay.backend.dto.UserProfileResponse;
import com.safepay.backend.entity.User;
import com.safepay.backend.repository.UserRepository;
import jakarta.validation.Valid;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/users")
public class UserController {

    private final UserRepository userRepository;

    public UserController(UserRepository userRepository) {
        this.userRepository = userRepository;
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

        UserProfileResponse response = new UserProfileResponse(
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

        String newFullName = request.fullName().trim();
        String newPhone = request.phone().trim();

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

        User updatedUser = userRepository.save(user);

        UserProfileResponse response = new UserProfileResponse(
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
}