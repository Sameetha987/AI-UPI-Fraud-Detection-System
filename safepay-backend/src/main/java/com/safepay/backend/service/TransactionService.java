package com.safepay.backend.service;

import com.safepay.backend.dto.TransactionResponse;
import com.safepay.backend.dto.TransferRequest;
import com.safepay.backend.entity.Account;
import com.safepay.backend.entity.Transaction;
import com.safepay.backend.repository.AccountRepository;
import com.safepay.backend.repository.TransactionRepository;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import com.safepay.backend.exception.TransactionNotFoundException;
import java.math.BigDecimal;
import java.time.LocalDateTime;
import org.springframework.data.domain.Pageable;
import java.util.UUID;
import java.time.LocalDate;
import com.safepay.backend.exception.ResourceNotFoundException;

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
                                new ResourceNotFoundException(
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
                                new ResourceNotFoundException(
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

        if (request.currency() == null
                || request.currency().isBlank()) {

            throw new IllegalArgumentException(
                    "Currency is required"
            );
        }

        String currency =
                request.currency().trim().toUpperCase();

        if (!currency.equals("INR")) {

            throw new IllegalArgumentException(
                    "Unsupported currency. Only INR is supported"
            );
        }

        if (!senderAccount.getCurrency()
                .equalsIgnoreCase(currency)) {

            throw new IllegalArgumentException(
                    "Sender account currency mismatch"
            );
        }

        if (!receiverAccount.getCurrency()
                .equalsIgnoreCase(currency)) {

            throw new IllegalArgumentException(
                    "Receiver account currency mismatch"
            );
        }


        // =====================================================
        // 7. VALIDATE AMOUNT
        // =====================================================

        BigDecimal amount = request.amount();

        if (amount == null) {
            throw new IllegalArgumentException(
                    "Transfer amount is required"
            );
        }

        if (amount.compareTo(BigDecimal.ZERO) <= 0) {
            throw new IllegalArgumentException(
                    "Transfer amount must be greater than zero"
            );
        }

        if (amount.scale() > 2) {
            throw new IllegalArgumentException(
                    "Transfer amount cannot have more than 2 decimal places"
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
        transaction.setCurrency(currency);
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

    @Transactional(readOnly = true)
    public Page<TransactionResponse> getMyTransactions(
            Long userId,
            int page,
            int size,
            String type,
            Transaction.Status status,
            LocalDate fromDate,
            LocalDate toDate
    ) {

        Account account = accountRepository
                .findByUserId(userId)
                .orElseThrow(() ->
                        new ResourceNotFoundException("Account not found")
                );

        Pageable pageable = PageRequest.of(page, size);

        LocalDateTime fromDateTime = null;
        LocalDateTime toDateTime = null;

        if (fromDate != null) {
            fromDateTime = fromDate.atStartOfDay();
        }

        if (toDate != null) {
            toDateTime = toDate.plusDays(1).atStartOfDay();
        }

        Page<Transaction> transactions =
                transactionRepository.findUserTransactions(
                        account.getId(),
                        type,
                        status,
                        fromDateTime,
                        toDateTime,
                        pageable
                );

        return transactions.map(TransactionResponse::from);
    }

    @Transactional(readOnly = true)
    public TransactionResponse getTransactionByReference(
            Long userId,
            String transactionReference
    ) {

        Account account = accountRepository
                .findByUserId(userId)
                .orElseThrow(() ->
                        new ResourceNotFoundException("Account not found")
                );

        Transaction transaction =
                transactionRepository
                        .findByTransactionReferenceAndSenderAccountIdOrTransactionReferenceAndReceiverAccountId(
                                transactionReference,
                                account.getId(),
                                transactionReference,
                                account.getId()
                        )
                        .orElseThrow(() ->
                                new TransactionNotFoundException(
                                        "Transaction not found"
                                )
                        );

        return TransactionResponse.from(transaction);
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