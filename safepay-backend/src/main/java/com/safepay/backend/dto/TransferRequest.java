package com.safepay.backend.dto;

import jakarta.validation.constraints.*;
import java.math.BigDecimal;

public record TransferRequest(

        @NotBlank(message = "Receiver phone number is required")
        @Pattern(
                regexp = "^[0-9]{10}$",
                message = "Receiver phone number must contain exactly 10 digits"
        )
        String receiverPhone,

        @NotNull(message = "Amount is required")
        @DecimalMin(
                value = "0.01",
                message = "Amount must be greater than zero"
        )
        @Digits(
                integer = 17,
                fraction = 2,
                message = "Amount must have at most 2 decimal places"
        )
        BigDecimal amount,

        @NotBlank(message = "Currency is required")
        @Pattern(
                regexp = "^[A-Za-z]{3}$",
                message = "Currency must contain exactly 3 letters"
        )
        String currency,

        @Size(max = 255, message = "Description cannot exceed 255 characters")
        String description,

        @NotBlank(message = "Idempotency key is required")
        @Size(max = 100, message = "Idempotency key cannot exceed 100 characters")
        String idempotencyKey
) {
}