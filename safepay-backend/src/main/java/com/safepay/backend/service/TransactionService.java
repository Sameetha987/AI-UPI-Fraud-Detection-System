package com.safepay.backend.service;

import com.safepay.backend.dto.TransactionResponse;
import com.safepay.backend.dto.TransferRequest;
import com.safepay.backend.entity.Account;
import com.safepay.backend.entity.Transaction;
import com.safepay.backend.repository.AccountRepository;
import com.safepay.backend.repository.TransactionRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.UUID;

@Service
public class TransactionService {

    private final AccountRepository accountRepository;
    private final TransactionRepository transactionRepository;

    public TransactionService(
            AccountRepository accountRepository,
            TransactionRepository transactionRepository
    ) {
        this.accountRepository = accountRepository;
        this.transactionRepository = transactionRepository;
    }

    @Transactional
    public TransactionResponse transfer(
            Long senderUserId,
            TransferRequest request
    ) {

        // =====================================================
        // 1. CHECK IDEMPOTENCY
        // =====================================================

        if (request.idempotencyKey() != null
                && !request.idempotencyKey().isBlank()) {

            var existingTransaction =
                    transactionRepository.findByIdempotencyKey(
                            request.idempotencyKey()
                    );

            if (existingTransaction.isPresent()) {
                return TransactionResponse.from(
                        existingTransaction.get()
                );
            }
        }


        // =====================================================
        // 2. FIND SENDER ACCOUNT
        // =====================================================

        Account senderAccount =
                accountRepository.findByUserId(senderUserId)
                        .orElseThrow(() ->
                                new RuntimeException(
                                        "Sender account not found"
                                )
                        );


        // =====================================================
        // 3. FIND RECEIVER ACCOUNT
        // =====================================================

        Account receiverAccount =
                accountRepository.findByAccountNumber(
                                request.receiverAccountNumber().trim()
                        )
                        .orElseThrow(() ->
                                new RuntimeException(
                                        "Receiver account not found"
                                )
                        );


        // =====================================================
        // 4. PREVENT SELF TRANSFER
        // =====================================================

        if (senderAccount.getId()
                .equals(receiverAccount.getId())) {

            throw new RuntimeException(
                    "Cannot transfer money to your own account"
            );
        }


        // =====================================================
        // 5. CHECK ACCOUNT STATUS
        // =====================================================

        if (senderAccount.getStatus()
                != Account.Status.ACTIVE) {

            throw new RuntimeException(
                    "Sender account is not active"
            );
        }

        if (receiverAccount.getStatus()
                != Account.Status.ACTIVE) {

            throw new RuntimeException(
                    "Receiver account is not active"
            );
        }


        // =====================================================
        // 6. VALIDATE CURRENCY
        // =====================================================

        if (!senderAccount.getCurrency()
                .equalsIgnoreCase(request.currency())) {

            throw new RuntimeException(
                    "Sender account currency mismatch"
            );
        }

        if (!receiverAccount.getCurrency()
                .equalsIgnoreCase(request.currency())) {

            throw new RuntimeException(
                    "Receiver account currency mismatch"
            );
        }


        // =====================================================
        // 7. VALIDATE AMOUNT
        // =====================================================

        BigDecimal amount = request.amount();

        if (amount == null
                || amount.compareTo(BigDecimal.ZERO) <= 0) {

            throw new RuntimeException(
                    "Transfer amount must be greater than zero"
            );
        }


        // =====================================================
        // 8. CHECK BALANCE
        // =====================================================

        if (senderAccount.getBalance()
                .compareTo(amount) < 0) {

            throw new RuntimeException(
                    "Insufficient balance"
            );
        }


        // =====================================================
        // 9. CREATE TRANSACTION
        // =====================================================

        Transaction transaction = new Transaction();

        transaction.setSenderAccount(senderAccount);
        transaction.setReceiverAccount(receiverAccount);
        transaction.setAmount(amount);
        transaction.setCurrency(
                request.currency().toUpperCase()
        );
        transaction.setDescription(
                request.description()
        );
        transaction.setIdempotencyKey(
                request.idempotencyKey()
        );

        transaction.setTransactionReference(
                generateTransactionReference()
        );

        transaction.setStatus(
                Transaction.Status.PENDING
        );


        // =====================================================
        // 10. DEBIT SENDER
        // =====================================================

        senderAccount.setBalance(
                senderAccount.getBalance()
                        .subtract(amount)
        );


        // =====================================================
        // 11. CREDIT RECEIVER
        // =====================================================

        receiverAccount.setBalance(
                receiverAccount.getBalance()
                        .add(amount)
        );


        // =====================================================
        // 12. MARK TRANSACTION SUCCESS
        // =====================================================

        transaction.setStatus(
                Transaction.Status.SUCCESS
        );

        transaction.setCompletedAt(
                LocalDateTime.now()
        );


        // =====================================================
        // 13. SAVE ACCOUNTS
        // =====================================================

        accountRepository.save(senderAccount);
        accountRepository.save(receiverAccount);


        // =====================================================
        // 14. SAVE TRANSACTION
        // =====================================================

        Transaction savedTransaction =
                transactionRepository.save(transaction);


        // =====================================================
        // 15. RETURN RESPONSE
        // =====================================================

        return TransactionResponse.from(
                savedTransaction
        );
    }


    // =========================================================
    // TRANSACTION REFERENCE GENERATOR
    // =========================================================

    private String generateTransactionReference() {

        return "TXN-" +
                UUID.randomUUID()
                        .toString()
                        .replace("-", "")
                        .substring(0, 20)
                        .toUpperCase();
    }
}