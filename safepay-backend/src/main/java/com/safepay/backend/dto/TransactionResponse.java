package com.safepay.backend.dto;

import com.safepay.backend.entity.Transaction;

import java.math.BigDecimal;
import java.time.LocalDateTime;

public record TransactionResponse(

        Long id,

        String transactionReference,

        String senderAccountNumber,

        String receiverAccountNumber,

        BigDecimal amount,

        String currency,

        String description,

        String status,

        LocalDateTime createdAt,

        LocalDateTime completedAt

) {

    public static TransactionResponse from(Transaction transaction) {

        return new TransactionResponse(
                transaction.getId(),
                transaction.getTransactionReference(),
                transaction.getSenderAccount().getAccountNumber(),
                transaction.getReceiverAccount().getAccountNumber(),
                transaction.getAmount(),
                transaction.getCurrency(),
                transaction.getDescription(),
                transaction.getStatus().name(),
                transaction.getCreatedAt(),
                transaction.getCompletedAt()
        );
    }
}