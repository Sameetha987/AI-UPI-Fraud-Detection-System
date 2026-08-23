package com.safepay.backend.service;

import com.safepay.backend.dto.DepositRequest;
import com.safepay.backend.dto.DepositResponse;
import com.safepay.backend.entity.Account;
import com.safepay.backend.repository.AccountRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class AccountService {

    private final AccountRepository accountRepository;

    public AccountService(AccountRepository accountRepository) {
        this.accountRepository = accountRepository;
    }

    @Transactional
    public DepositResponse deposit(
            Long userId,
            DepositRequest request
    ) {

        // 1. Find the logged-in user's account
        Account account = accountRepository
                .findByUserId(userId)
                .orElseThrow(() ->
                        new RuntimeException("Account not found")
                );

        // 2. Account must be active
        if (account.getStatus() != Account.Status.ACTIVE) {
            throw new RuntimeException(
                    "Account is not active"
            );
        }

        // 3. Currency must match
        if (!account.getCurrency()
                .equalsIgnoreCase(request.currency())) {

            throw new RuntimeException(
                    "Account currency mismatch"
            );
        }

        // 4. Add money to the balance
        account.setBalance(
                account.getBalance()
                        .add(request.amount())
        );

        // 5. Save updated account
        Account savedAccount =
                accountRepository.save(account);

        // 6. Return safe response
        return DepositResponse.from(
                savedAccount,
                "Deposit successful"
        );
    }
}