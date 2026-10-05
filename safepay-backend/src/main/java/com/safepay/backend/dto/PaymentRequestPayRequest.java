package com.safepay.backend.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public record PaymentRequestPayRequest(

        @NotBlank(message = "Payment reference is required")
        @Size(max = 50, message = "Payment reference cannot exceed 50 characters")
        String paymentReference,

        @NotBlank(message = "Idempotency key is required")
        @Size(max = 100, message = "Idempotency key cannot exceed 100 characters")
        String idempotencyKey
) {
}
