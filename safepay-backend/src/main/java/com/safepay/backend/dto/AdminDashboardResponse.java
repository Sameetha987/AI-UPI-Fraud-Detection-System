package com.safepay.backend.dto;

import java.math.BigDecimal;

public record AdminDashboardResponse(

        long totalUsers,
        long activeUsers,
        long blockedUsers,
        long suspendedUsers,

        long totalAccounts,
        long activeAccounts,
        long blockedAccounts,

        long totalMerchants,
        long activeMerchants,
        long blockedMerchants,
        long suspendedMerchants,

        long totalTransactions,
        long successfulTransactions,
        long failedTransactions,
        long pendingTransactions,
        long cancelledTransactions,

        BigDecimal totalTransactionVolume
) {
}