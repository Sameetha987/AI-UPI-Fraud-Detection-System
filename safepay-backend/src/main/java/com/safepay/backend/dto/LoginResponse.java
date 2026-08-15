package com.safepay.backend.dto;

public record LoginResponse(

        String token,
        Long userId,
        String fullName,
        String email,
        String role,
        String message

) {
}