package com.safepay.backend.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public record MerchantRegistrationRequest(

        @NotBlank(message = "Business name is required")
        @Size(
                max = 150,
                message = "Business name cannot exceed 150 characters"
        )
        String businessName,

        @NotBlank(message = "Business type is required")
        @Size(
                max = 100,
                message = "Business type cannot exceed 100 characters"
        )
        String businessType
) {
}