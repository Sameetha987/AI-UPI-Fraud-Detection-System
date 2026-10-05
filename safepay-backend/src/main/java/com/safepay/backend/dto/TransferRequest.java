package com.safepay.backend.dto;

import jakarta.validation.constraints.*;

import java.math.BigDecimal;

public record TransferRequest(

        @NotBlank(message = "Receiver account number is required")
        @Size(
                min = 12,
                max = 12,
                message = "Receiver account number must be 12 digits"
        )
        @Pattern(
                regexp = "^[0-9]{12}$",
                message = "Receiver account number must contain exactly 12 digits"
        )
        String receiverAccountNumber,

        @NotNull(message = "Amount is required")
        @DecimalMin(
                value = "0.01",
                message = "Amount must be greater than zero"
        )
        BigDecimal amount,

        @NotBlank(message = "Currency is required")
        @Pattern(
                regexp = "^[A-Za-z]{3}$",
                message = "Currency must contain exactly 3 letters"
        )
        @NotBlank(message = "Currency is required")
        @Size(min = 3, max = 3, message = "Currency must be 3 characters")
        String currency,

        @Size(max = 255, message = "Description cannot exceed 255 characters")
        String description,

        @NotBlank(message = "Idempotency key is required")
        @Size(max = 100, message = "Idempotency key cannot exceed 100 characters")
        String idempotencyKey
) {
}