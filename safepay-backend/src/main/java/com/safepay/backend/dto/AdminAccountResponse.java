package com.safepay.backend.dto;

import com.safepay.backend.entity.Account;

import java.math.BigDecimal;
import java.time.LocalDateTime;

public record AdminAccountResponse(
        Long id,
        Long userId,
        String accountNumber,
        String ownerName,
        String ownerEmail,
        String ownerPhone,
        BigDecimal balance,
        String currency,
        String status,
        LocalDateTime createdAt
) {

    public static AdminAccountResponse from(Account account) {

        return new AdminAccountResponse(
                account.getId(),
                account.getUser().getId(),
                account.getAccountNumber(),
                account.getUser().getFullName(),
                account.getUser().getEmail(),
                account.getUser().getPhone(),
                account.getBalance(),
                account.getCurrency(),
                account.getStatus().name(),
                account.getCreatedAt()
        );
    }
}