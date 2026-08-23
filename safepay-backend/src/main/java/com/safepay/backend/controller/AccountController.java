package com.safepay.backend.controller;

import com.safepay.backend.dto.AccountResponse;
import com.safepay.backend.dto.DepositRequest;
import com.safepay.backend.dto.DepositResponse;
import com.safepay.backend.entity.Account;
import com.safepay.backend.repository.AccountRepository;
import com.safepay.backend.service.AccountService;
import jakarta.validation.Valid;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/accounts")
public class AccountController {

    private final AccountRepository accountRepository;
    private final AccountService accountService;

    public AccountController(
            AccountRepository accountRepository,
            AccountService accountService
    ) {
        this.accountRepository = accountRepository;
        this.accountService = accountService;
    }

    // =========================================================
    // GET CURRENT USER ACCOUNT
    // GET /api/accounts/me
    // =========================================================

    @GetMapping("/me")
    public ResponseEntity<AccountResponse> getMyAccount(
            @AuthenticationPrincipal Jwt jwt
    ) {

        Long userId = Long.valueOf(jwt.getSubject());

        Account account = accountRepository
                .findByUserId(userId)
                .orElseThrow(() ->
                        new RuntimeException("Account not found")
                );

        AccountResponse response =
                AccountResponse.from(account);

        return ResponseEntity.ok(response);
    }


    // =========================================================
    // DEPOSIT MONEY
    // POST /api/accounts/deposit
    // =========================================================

    @PostMapping("/deposit")
    public ResponseEntity<DepositResponse> deposit(
            @AuthenticationPrincipal Jwt jwt,
            @Valid @RequestBody DepositRequest request
    ) {

        Long userId = Long.valueOf(jwt.getSubject());

        DepositResponse response =
                accountService.deposit(
                        userId,
                        request
                );

        return ResponseEntity.ok(response);
    }
}