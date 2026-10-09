package com.safepay.backend.dto;

public record ReceiverLookupResponse(
        String fullName,
        String maskedPhone,
        String maskedAccountNumber
) {
}