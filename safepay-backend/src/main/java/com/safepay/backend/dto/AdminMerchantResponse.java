package com.safepay.backend.dto;

import com.safepay.backend.entity.Merchant;

import java.time.LocalDateTime;

public record AdminMerchantResponse(
        Long id,
        Long userId,
        String businessName,
        String businessType,
        String ownerName,
        String ownerEmail,
        String ownerPhone,
        String status,
        LocalDateTime createdAt,
        LocalDateTime updatedAt
) {

    public static AdminMerchantResponse from(Merchant merchant) {

        return new AdminMerchantResponse(
                merchant.getId(),
                merchant.getUser().getId(),
                merchant.getBusinessName(),
                merchant.getBusinessType(),
                merchant.getUser().getFullName(),
                merchant.getUser().getEmail(),
                merchant.getUser().getPhone(),
                merchant.getStatus().name(),
                merchant.getCreatedAt(),
                merchant.getUpdatedAt()
        );
    }
}