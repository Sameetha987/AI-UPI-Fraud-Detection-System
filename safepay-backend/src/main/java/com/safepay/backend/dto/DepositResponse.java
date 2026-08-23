package com.safepay.backend.dto;

import com.safepay.backend.entity.Account;

import java.math.BigDecimal;

public record DepositResponse(
        Long accountId,
        String accountNumber,
        BigDecimal balance,
        String currency,
        String status,
        String message
) {

    public static DepositResponse from(
            Account account,
            String message
    ) {

        return new DepositResponse(
                account.getId(),
                account.getAccountNumber(),
                account.getBalance(),
                account.getCurrency(),
                account.getStatus().name(),
                message
        );
    }
}