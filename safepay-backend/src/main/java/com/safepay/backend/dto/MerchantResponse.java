package com.safepay.backend.dto;

import com.safepay.backend.entity.Merchant;

import java.time.LocalDateTime;

public record MerchantResponse(
        Long id,
        Long userId,
        String businessName,
        String businessType,
        String email,
        String phone,
        String status,
        LocalDateTime createdAt,
        LocalDateTime updatedAt
) {

    public static MerchantResponse from(Merchant merchant) {

        return new MerchantResponse(
                merchant.getId(),
                merchant.getUser().getId(),
                merchant.getBusinessName(),
                merchant.getBusinessType(),
                merchant.getUser().getEmail(),
                merchant.getUser().getPhone(),
                merchant.getStatus().name(),
                merchant.getCreatedAt(),
                merchant.getUpdatedAt()
        );
    }
}