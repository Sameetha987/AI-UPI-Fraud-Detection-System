package com.safepay.backend.dto;

import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

import java.math.BigDecimal;

public record MerchantPaymentRequest(

        @NotNull(message = "Amount is required")
        @DecimalMin(
                value = "0.01",
                message = "Amount must be greater than zero"
        )
        BigDecimal amount,

        @NotBlank(message = "Currency is required")
        @Size(
                min = 3,
                max = 3,
                message = "Currency must be 3 characters"
        )
        String currency,

        @Size(
                max = 255,
                message = "Description cannot exceed 255 characters"
        )
        String description
) {
}