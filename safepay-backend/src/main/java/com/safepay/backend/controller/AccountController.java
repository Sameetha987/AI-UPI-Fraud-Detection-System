package com.safepay.backend.controller;

import com.safepay.backend.dto.AccountResponse;
import com.safepay.backend.entity.Account;
import com.safepay.backend.repository.AccountRepository;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/accounts")
public class AccountController {

    private final AccountRepository accountRepository;

    public AccountController(AccountRepository accountRepository) {
        this.accountRepository = accountRepository;
    }

    // =========================================================
    // GET CURRENT USER ACCOUNT
    // GET /api/accounts/me
    // =========================================================

    @GetMapping("/me")
    public ResponseEntity<AccountResponse> getMyAccount(
            @AuthenticationPrincipal Jwt jwt
    ) {

        // Get authenticated user's ID from JWT
        Long userId = Long.valueOf(jwt.getSubject());

        // Find account belonging to this user
        Account account = accountRepository
                .findByUserId(userId)
                .orElseThrow(() ->
                        new RuntimeException("Account not found")
                );

        // Convert Entity -> DTO
        AccountResponse response = AccountResponse.from(account);

        return ResponseEntity.ok(response);
    }
}