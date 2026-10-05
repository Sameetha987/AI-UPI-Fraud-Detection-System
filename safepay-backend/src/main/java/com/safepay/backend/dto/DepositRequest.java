package com.safepay.backend.dto;

import jakarta.validation.constraints.*;

import java.math.BigDecimal;

public record DepositRequest(

        @NotNull(message = "Amount is required")
        @DecimalMin(
                value = "0.01",
                message = "Deposit amount must be greater than zero"
        )
        BigDecimal amount,

        @NotBlank(message = "Currency is required")
        @Pattern(
                regexp = "^[A-Za-z]{3}$",
                message = "Currency must contain exactly 3 letters"
        )
        @Size(
                min = 3,
                max = 3,
                message = "Currency must be 3 characters"
        )
        String currency
) {
}