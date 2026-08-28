package com.safepay.backend.dto;

import com.safepay.backend.entity.PaymentRequest;

import java.math.BigDecimal;
import java.time.LocalDateTime;

public record MerchantPaymentResponse(

        Long id,
        String paymentReference,
        Long merchantId,
        String businessName,
        BigDecimal amount,
        String currency,
        String description,
        String status,
        LocalDateTime createdAt,
        LocalDateTime paidAt
) {

    public static MerchantPaymentResponse from(
            PaymentRequest paymentRequest
    ) {

        return new MerchantPaymentResponse(
                paymentRequest.getId(),
                paymentRequest.getPaymentReference(),
                paymentRequest.getMerchant().getId(),
                paymentRequest.getMerchant().getBusinessName(),
                paymentRequest.getAmount(),
                paymentRequest.getCurrency(),
                paymentRequest.getDescription(),
                paymentRequest.getStatus().name(),
                paymentRequest.getCreatedAt(),
                paymentRequest.getPaidAt()
        );
    }
}