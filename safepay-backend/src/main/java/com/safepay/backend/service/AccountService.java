package com.safepay.backend.service;

import com.safepay.backend.dto.AdminAccountResponse;
import com.safepay.backend.dto.DepositRequest;
import com.safepay.backend.dto.DepositResponse;
import com.safepay.backend.entity.Account;
import com.safepay.backend.exception.ResourceNotFoundException;
import com.safepay.backend.repository.AccountRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

@Service
public class AccountService {

    private final AccountRepository accountRepository;
    private final AuditLogService auditLogService;
    public AccountService(AccountRepository accountRepository, AuditLogService auditLogService) {
        this.accountRepository = accountRepository;
        this.auditLogService = auditLogService;
    }

    @Transactional
    public DepositResponse deposit(
            Long userId,
            DepositRequest request
    ) {

        // 1. Find account
        Account account = accountRepository
                .findByUserId(userId)
                .orElseThrow(() ->
                        new RuntimeException("Account not found")
                );

        // 2. Account must be active
        if (account.getStatus() != Account.Status.ACTIVE) {

            String reason = "Account is not active";

            auditLogService.recordBusinessFailure(
                    userId,
                    "DEPOSIT_FAILED",
                    "ACCOUNT",
                    String.valueOf(account.getId()),
                    "Deposit failed",
                    reason
            );

            throw new RuntimeException(reason);
        }

        // 3. Currency must match
        if (!account.getCurrency()
                .equalsIgnoreCase(request.currency())) {

            String reason = "Account currency mismatch";

            auditLogService.recordBusinessFailure(
                    userId,
                    "DEPOSIT_FAILED",
                    "ACCOUNT",
                    String.valueOf(account.getId()),
                    "Deposit failed",
                    reason
            );

            throw new RuntimeException(reason);
        }
        if (request.amount() == null) {

            String reason = "Deposit amount is required";

            auditLogService.recordBusinessFailure(
                    userId,
                    "DEPOSIT_FAILED",
                    "ACCOUNT",
                    String.valueOf(account.getId()),
                    "Deposit failed",
                    reason
            );

            throw new IllegalArgumentException(reason);
        }

        if (request.amount().compareTo(java.math.BigDecimal.ZERO) <= 0) {

            String reason = "Deposit amount must be greater than zero";

            auditLogService.recordBusinessFailure(
                    userId,
                    "DEPOSIT_FAILED",
                    "ACCOUNT",
                    String.valueOf(account.getId()),
                    "Deposit failed",
                    reason
            );

            throw new IllegalArgumentException(reason);
        }

        if (request.amount().scale() > 2) {

            String reason = "Deposit amount cannot have more than 2 decimal places";

            auditLogService.recordBusinessFailure(
                    userId,
                    "DEPOSIT_FAILED",
                    "ACCOUNT",
                    String.valueOf(account.getId()),
                    "Deposit failed",
                    reason
            );

            throw new IllegalArgumentException(reason);
        }
        // 4. Capture old balance
        java.math.BigDecimal oldBalance =
                account.getBalance();

        // 5. Add money
        account.setBalance(
                account.getBalance()
                        .add(request.amount())
        );

        // 6. Save
        Account savedAccount =
                accountRepository.save(account);

        // 7. Capture new balance
        java.math.BigDecimal newBalance =
                savedAccount.getBalance();

        // 8. Audit successful deposit
        String oldValue = String.format(
                "{\"balance\":\"%s\"}",
                oldBalance
        );

        String newValue = String.format(
                "{\"balance\":\"%s\"}",
                newBalance
        );

        String description = String.format(
                "Deposit of INR %s into account %s",
                request.amount(),
                maskAccountNumber(
                        savedAccount.getAccountNumber()
                )
        );

        auditLogService.recordBusinessEvent(
                userId,
                "DEPOSIT_SUCCESS",
                "ACCOUNT",
                String.valueOf(savedAccount.getId()),
                oldValue,
                newValue,
                description
        );

        // 9. Return response
        return DepositResponse.from(
                savedAccount,
                "Deposit successful"
        );
    }
    @Transactional(readOnly = true)
    public List<AdminAccountResponse> getAllAccounts() {

        return accountRepository.findAllByOrderByCreatedAtDesc()
                .stream()
                .map(AdminAccountResponse::from)
                .toList();
    }
    @Transactional
    public AdminAccountResponse blockAccount(Long accountId) {

        Account account = accountRepository.findById(accountId)
                .orElseThrow(() -> new ResourceNotFoundException("Account not found"));

        if (account.getStatus() == Account.Status.CLOSED) {
            throw new IllegalArgumentException("Closed account cannot be blocked");
        }

        account.setStatus(Account.Status.BLOCKED);

        return AdminAccountResponse.from(accountRepository.save(account));
    }
    @Transactional
    public AdminAccountResponse unblockAccount(Long accountId) {

        Account account = accountRepository.findById(accountId)
                .orElseThrow(() -> new ResourceNotFoundException("Account not found"));

        if (account.getStatus() == Account.Status.CLOSED) {
            throw new IllegalArgumentException("Closed account cannot be unblocked");
        }

        account.setStatus(Account.Status.ACTIVE);

        return AdminAccountResponse.from(accountRepository.save(account));
    }
    private String maskAccountNumber(String accountNumber) {

        if (accountNumber == null || accountNumber.length() < 4) {
            return "****";
        }

        return "******" +
                accountNumber.substring(
                        accountNumber.length() - 4
                );
    }
}