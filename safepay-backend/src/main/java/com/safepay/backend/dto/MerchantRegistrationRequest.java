package com.safepay.backend.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public record MerchantRegistrationRequest(

        @NotBlank(message = "Business name is required")
        @Size(
                min = 2,
                max = 150,
                message = "Business name must be between 2 and 150 characters"
        )
        String businessName,

        @NotBlank(message = "Business type is required")
        @Size(
                min = 2,
                max = 100,
                message = "Business type must be between 2 and 100 characters"
        )
        String businessType
) {
}