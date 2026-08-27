package com.safepay.backend.controller;

import com.safepay.backend.dto.TransactionResponse;
import com.safepay.backend.dto.TransferRequest;
import com.safepay.backend.entity.Transaction;
import com.safepay.backend.service.TransactionService;
import jakarta.validation.Valid;
import org.springframework.data.domain.Page;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.web.bind.annotation.*;
import java.time.LocalDate;

@RestController
@RequestMapping("/api/transactions")
public class TransactionController {

    private final TransactionService transactionService;

    public TransactionController(
            TransactionService transactionService
    ) {
        this.transactionService = transactionService;
    }

    // =========================================================
    // TRANSFER MONEY
    // POST /api/transactions/transfer
    // =========================================================

    @PostMapping("/transfer")
    public ResponseEntity<TransactionResponse> transfer(
            @AuthenticationPrincipal Jwt jwt,
            @Valid @RequestBody TransferRequest request
    ) {

        // The JWT subject contains the logged-in user's ID.
        Long senderUserId =
                Long.valueOf(jwt.getSubject());

        TransactionResponse response =
                transactionService.transfer(
                        senderUserId,
                        request
                );

        return ResponseEntity.ok(response);
    }
    @GetMapping("/{transactionReference}")
    public ResponseEntity<TransactionResponse> getTransactionByReference(
            @AuthenticationPrincipal Jwt jwt,
            @PathVariable String transactionReference
    ) {

        Long userId = Long.valueOf(jwt.getSubject());

        TransactionResponse response =
                transactionService.getTransactionByReference(
                        userId,
                        transactionReference
                );

        return ResponseEntity.ok(response);
    }

    @GetMapping
    public ResponseEntity<Page<TransactionResponse>> getMyTransactions(
            @AuthenticationPrincipal Jwt jwt,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "10") int size,
            @RequestParam(required = false) String status,
            @RequestParam(required = false) String type,
            @RequestParam(required = false) LocalDate fromDate,
            @RequestParam(required = false) LocalDate toDate
    ) {

        Long userId = Long.valueOf(jwt.getSubject());

        if (page < 0) {
            throw new IllegalArgumentException(
                    "Page number cannot be negative"
            );
        }

        if (size < 1 || size > 50) {
            throw new IllegalArgumentException(
                    "Page size must be between 1 and 50"
            );
        }

        Transaction.Status transactionStatus = null;

        if (status != null && !status.isBlank()) {

            String normalizedStatus =
                    status.trim().toUpperCase();

            try {
                transactionStatus =
                        Transaction.Status.valueOf(normalizedStatus);
            } catch (IllegalArgumentException exception) {
                throw new IllegalArgumentException(
                        "Invalid transaction status. Allowed values: PENDING, SUCCESS, FAILED, CANCELLED"
                );
            }
        }

        String transactionType = null;

        if (type != null && !type.isBlank()) {

            transactionType =
                    type.trim().toUpperCase();

            if (!transactionType.equals("SENT")
                    && !transactionType.equals("RECEIVED")) {

                throw new IllegalArgumentException(
                        "Invalid transaction type. Allowed values: SENT, RECEIVED"
                );
            }
        }

        if (fromDate != null
                && toDate != null
                && fromDate.isAfter(toDate)) {

            throw new IllegalArgumentException(
                    "fromDate cannot be after toDate"
            );
        }

        return ResponseEntity.ok(
                transactionService.getMyTransactions(
                        userId,
                        page,
                        size,
                        transactionType,
                        transactionStatus,
                        fromDate,
                        toDate
                )
        );
    }
}
