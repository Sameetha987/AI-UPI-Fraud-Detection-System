package com.safepay.backend.dto;

public record UserProfileResponse(
        Long id,
        String fullName,
        String email,
        String phone,
        String role,
        String status,
        String createdAt
) {
}