package com.safepay.backend.dto;

import jakarta.validation.constraints.NotBlank;

public record PaymentRequestPayRequest(

        @NotBlank(message = "Payment reference is required")
        String paymentReference,

        @NotBlank(message = "Idempotency key is required")
        String idempotencyKey
) {
}
