package com.safepay.backend.controller;

import com.safepay.backend.dto.AdminAccountResponse;
import com.safepay.backend.dto.AdminUserResponse;
import com.safepay.backend.service.AdminService;
import org.springframework.http.ResponseEntity;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;
import com.safepay.backend.dto.TransactionResponse;
import com.safepay.backend.entity.Transaction;
import org.springframework.data.domain.Page;
import com.safepay.backend.dto.AccountResponse;
import com.safepay.backend.service.AccountService;
import java.time.LocalDate;
import java.util.List;

@RestController
@RequestMapping("/api/admin")
public class AdminController {

    private final AdminService adminService;
    private final AccountService accountService;
    public AdminController(AdminService adminService, AccountService accountService) {
        this.adminService = adminService;
        this.accountService = accountService;
    }

    // =========================================================
    // GET ALL USERS
    // GET /api/admin/users
    // =========================================================

    @GetMapping("/users")
    public ResponseEntity<List<AdminUserResponse>> getAllUsers() {

        return ResponseEntity.ok(
                adminService.getAllUsers()
        );
    }

    // =========================================================
    // GET USER BY ID
    // GET /api/admin/users/{id}
    // =========================================================

    @GetMapping("/users/{id}")
    public ResponseEntity<AdminUserResponse> getUserById(
            @PathVariable Long id
    ) {

        return ResponseEntity.ok(
                adminService.getUserById(id)
        );
    }

    // =========================================================
    // BLOCK USER
    // PATCH /api/admin/users/{id}/block
    // =========================================================

    @PatchMapping("/users/{id}/block")
    public ResponseEntity<AdminUserResponse> blockUser(
            @PathVariable Long id,
            @AuthenticationPrincipal Jwt jwt
    ) {

        Long adminId = Long.valueOf(jwt.getSubject());

        return ResponseEntity.ok(
                adminService.blockUser(id, adminId)
        );
    }

    // =========================================================
    // SUSPEND USER
    // PATCH /api/admin/users/{id}/suspend
    // =========================================================

    @PatchMapping("/users/{id}/suspend")
    public ResponseEntity<AdminUserResponse> suspendUser(
            @PathVariable Long id,
            @AuthenticationPrincipal Jwt jwt
    ) {

        Long adminId = Long.valueOf(jwt.getSubject());

        return ResponseEntity.ok(
                adminService.suspendUser(id, adminId)
        );
    }

    // =========================================================
    // ACTIVATE USER
    // PATCH /api/admin/users/{id}/activate
    // =========================================================

    @PatchMapping("/users/{id}/activate")
    public ResponseEntity<AdminUserResponse> activateUser(
            @PathVariable Long id,
            @AuthenticationPrincipal Jwt jwt
    ) {

        Long adminId = Long.valueOf(jwt.getSubject());

        return ResponseEntity.ok(
                adminService.activateUser(id, adminId)
        );
    }

    // =========================================================
// GET ALL TRANSACTIONS
// GET /api/admin/transactions
// =========================================================

    @GetMapping("/transactions")
    public ResponseEntity<Page<TransactionResponse>> getAllTransactions(
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "10") int size,
            @RequestParam(required = false) String status,
            @RequestParam(required = false) LocalDate fromDate,
            @RequestParam(required = false) LocalDate toDate
    ) {

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
                adminService.getAllTransactions(
                        page,
                        size,
                        transactionStatus,
                        fromDate,
                        toDate
                )
        );

    }
    // =========================================================
    // GET ALL ACCOUNTS
    // GET /api/admin/accounts
    // =========================================================

    @GetMapping("/accounts")
    public ResponseEntity<List<AdminAccountResponse>> getAllAccounts() {

        return ResponseEntity.ok(
                accountService.getAllAccounts()
        );
    }
    @PatchMapping("/accounts/{id}/block")
    public ResponseEntity<AdminAccountResponse> blockAccount(
            @PathVariable Long id
    ) {

        return ResponseEntity.ok(
                accountService.blockAccount(id)
        );
    }
    @PatchMapping("/accounts/{id}/unblock")
    public ResponseEntity<AdminAccountResponse> unblockAccount(
            @PathVariable Long id
    ) {

        return ResponseEntity.ok(
                accountService.unblockAccount(id)
        );
    }
}