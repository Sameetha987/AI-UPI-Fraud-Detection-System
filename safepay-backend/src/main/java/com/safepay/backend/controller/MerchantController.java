package com.safepay.backend.controller;

import com.safepay.backend.dto.*;
import com.safepay.backend.service.MerchantService;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.web.bind.annotation.*;
import com.safepay.backend.entity.Transaction;
import org.springframework.data.domain.Page;
import java.time.LocalDate;
import com.safepay.backend.dto.PaymentRequestPayRequest;
@RestController
@RequestMapping("/api/merchant")
public class MerchantController {

    private final MerchantService merchantService;

    public MerchantController(
            MerchantService merchantService
    ) {
        this.merchantService = merchantService;
    }

    // =========================================================
    // CREATE MERCHANT PROFILE
    // POST /api/merchant/profile
    // =========================================================

    @PostMapping("/profile")
    public ResponseEntity<MerchantResponse> createMerchantProfile(
            @AuthenticationPrincipal Jwt jwt,
            @Valid @RequestBody MerchantRegistrationRequest request
    ) {

        Long userId =
                Long.valueOf(jwt.getSubject());

        MerchantResponse response =
                merchantService.createMerchant(
                        userId,
                        request
                );

        return ResponseEntity
                .status(HttpStatus.CREATED)
                .body(response);
    }

    // =========================================================
    // GET MY MERCHANT PROFILE
    // GET /api/merchant/profile
    // =========================================================

    @GetMapping("/profile")
    public ResponseEntity<MerchantResponse> getMyMerchantProfile(
            @AuthenticationPrincipal Jwt jwt
    ) {

        Long userId =
                Long.valueOf(jwt.getSubject());

        MerchantResponse response =
                merchantService.getMyMerchantProfile(
                        userId
                );

        return ResponseEntity.ok(response);
    }

    // =========================================================
    // CREATE MERCHANT PAYMENT REQUEST
    // POST /api/merchant/payments
    // =========================================================

    @PostMapping("/payments")
    public ResponseEntity<MerchantPaymentResponse> createPaymentRequest(
            @AuthenticationPrincipal Jwt jwt,
            @Valid @RequestBody MerchantPaymentRequest request
    ) {

        Long userId =
                Long.valueOf(jwt.getSubject());

        MerchantPaymentResponse response =
                merchantService.createPaymentRequest(
                        userId,
                        request
                );

        return ResponseEntity
                .status(HttpStatus.CREATED)
                .body(response);
    }

    // =========================================================
    // PAY MERCHANT PAYMENT REQUEST
    // POST /api/merchant/payments/pay
    // =========================================================

    @PostMapping("/payments/pay")
    public ResponseEntity<MerchantPaymentResponse> payPaymentRequest(
            @AuthenticationPrincipal Jwt jwt,
            @Valid @RequestBody PaymentRequestPayRequest request
    ) {

        Long userId =
                Long.valueOf(jwt.getSubject());

        MerchantPaymentResponse response =
                merchantService.payPaymentRequest(
                        userId,
                        request
                );

        return ResponseEntity.ok(response);
    }

    // =========================================================
    // GET MERCHANT TRANSACTIONS
    // GET /api/merchant/transactions
    // =========================================================

    @GetMapping("/transactions")
    public ResponseEntity<Page<TransactionResponse>> getMerchantTransactions(
            @AuthenticationPrincipal Jwt jwt,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "10") int size,
            @RequestParam(required = false) String type,
            @RequestParam(required = false) String status,
            @RequestParam(required = false) LocalDate fromDate,
            @RequestParam(required = false) LocalDate toDate
    ) {

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
        if (fromDate != null
                && toDate != null
                && fromDate.isAfter(toDate)) {

            throw new IllegalArgumentException(
                    "fromDate cannot be after toDate"
            );
        }
        Long userId =
                Long.valueOf(jwt.getSubject());

        Transaction.Status transactionStatus = null;

        if (status != null && !status.isBlank()) {

            String normalizedStatus =
                    status.trim().toUpperCase();

            try {

                transactionStatus =
                        Transaction.Status.valueOf(
                                normalizedStatus
                        );

            } catch (IllegalArgumentException exception) {

                throw new IllegalArgumentException(
                        "Invalid transaction status. Allowed values: PENDING, SUCCESS, FAILED, CANCELLED"
                );
            }
        }


        return ResponseEntity.ok(
                merchantService.getMerchantTransactions(
                        userId,
                        page,
                        size,
                        type,
                        transactionStatus,
                        fromDate,
                        toDate
                )
        );
    }
}