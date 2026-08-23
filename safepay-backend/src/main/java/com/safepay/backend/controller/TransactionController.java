package com.safepay.backend.controller;

import com.safepay.backend.dto.TransactionResponse;
import com.safepay.backend.dto.TransferRequest;
import com.safepay.backend.service.TransactionService;
import jakarta.validation.Valid;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.web.bind.annotation.*;

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
}