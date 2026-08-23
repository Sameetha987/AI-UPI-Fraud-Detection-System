package com.safepay.backend.dto;

import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

import java.math.BigDecimal;

public record DepositRequest(

        @NotNull(message = "Amount is required")
        @DecimalMin(
                value = "0.01",
                message = "Deposit amount must be greater than zero"
        )
        BigDecimal amount,

        @Size(
                min = 3,
                max = 3,
                message = "Currency must be 3 characters"
        )
        String currency
) {
}