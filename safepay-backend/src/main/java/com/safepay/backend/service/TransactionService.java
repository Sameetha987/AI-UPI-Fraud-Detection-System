package com.safepay.backend.service;

import com.safepay.backend.dto.TransactionResponse;
import com.safepay.backend.dto.TransferRequest;
import com.safepay.backend.entity.Account;
import com.safepay.backend.entity.Transaction;
import com.safepay.backend.entity.User;
import com.safepay.backend.exception.BusinessException;
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

import java.util.List;
import java.util.UUID;
import java.time.LocalDate;
import com.safepay.backend.exception.ResourceNotFoundException;
import com.safepay.backend.repository.UserRepository;

@Service
public class TransactionService {

    private final AccountRepository accountRepository;
    private final TransactionRepository transactionRepository;
    private final AuditLogService auditLogService;
    private final UserRepository userRepository;
    public TransactionService(
            AccountRepository accountRepository,
            TransactionRepository transactionRepository, AuditLogService auditLogService, UserRepository userRepository
    ) {
        this.accountRepository = accountRepository;
        this.transactionRepository = transactionRepository;
        this.auditLogService = auditLogService;
        this.userRepository = userRepository;
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
                    transactionRepository.findByIdempotencyKeyForUpdate(
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
// 3. FIND RECEIVER ACCOUNT USING PHONE NUMBER
// =====================================================

        String receiverPhone = request.receiverPhone().trim();

        if (!receiverPhone.matches("\\d{10}")) {
            throw new IllegalArgumentException(
                    "Receiver phone number must be exactly 10 digits"
            );
        }

        User receiver = userRepository.findByPhone(receiverPhone)
                .filter(user -> user.getStatus() == User.Status.ACTIVE)
                .orElseThrow(() ->
                        new ResourceNotFoundException(
                                "No eligible SafePay receiver found"
                        )
                );

        Account receiverAccount =
                accountRepository.findByUserId(receiver.getId())
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

            throw new BusinessException(
                    "Cannot transfer money to your own account"
            );
        }

        //TO lock accounts for atomicity (race-condition)
        List<Account> lockedAccounts =
                accountRepository.findAllByIdsForUpdate(
                        List.of(
                                senderAccount.getId(),
                                receiverAccount.getId()
                        )
                );

        if (lockedAccounts.size() != 2) {
            throw new ResourceNotFoundException(
                    "Unable to lock transfer accounts"
            );
        }

        Account lockedSender = lockedAccounts.stream()
                .filter(account -> account.getId().equals(senderAccount.getId()))
                .findFirst()
                .orElseThrow(() ->
                        new ResourceNotFoundException("Sender account not found"));

        if (lockedSender.getUser() == null
                || !lockedSender.getUser().getId().equals(senderUserId)) {

            recordTransferFailure(
                    senderUserId,
                    "Sender account ownership validation failed"
            );

            throw new BusinessException(
                    "Unable to process transfer"
            );
        }

        Account lockedReceiver = lockedAccounts.stream()
                .filter(account -> account.getId().equals(receiverAccount.getId()))
                .findFirst()
                .orElseThrow(() ->
                        new ResourceNotFoundException("Receiver account not found"));


        // =====================================================
        // 5. CHECK ACCOUNT STATUS
        // =====================================================

        if (lockedReceiver.getUser().getStatus() != User.Status.ACTIVE) {

            throw new BusinessException(
                    "Receiver user account is not active"
            );
        }

        if (lockedSender.getStatus() != Account.Status.ACTIVE) {
            throw new IllegalArgumentException("Sender account is not active");
        }

        if (lockedReceiver.getStatus() != Account.Status.ACTIVE) {
            throw new IllegalArgumentException("Receiver account is not active");
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

        if (!lockedSender.getCurrency()
                .equalsIgnoreCase(currency)) {

            throw new IllegalArgumentException(
                    "Sender account currency mismatch"
            );
        }

        if (!lockedReceiver.getCurrency()
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

        if (lockedSender.getBalance()
                .compareTo(amount) < 0) {

            String reason = "Insufficient balance";

            recordTransferFailure(
                    senderUserId,
                    reason
            );

            throw new BusinessException(reason);
        }


        // =====================================================
        // 9. CREATE TRANSACTION
        // =====================================================

        Transaction transaction = new Transaction();

        transaction.setSenderAccount(lockedSender);
        transaction.setReceiverAccount(lockedReceiver);
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

        BigDecimal senderBalanceBefore =
                lockedSender.getBalance();

        BigDecimal receiverBalanceBefore =
                lockedReceiver.getBalance();
        // =====================================================
        // 10. DEBIT SENDER
        // =====================================================

        lockedSender.setBalance(
                lockedSender.getBalance()
                        .subtract(amount)
        );
        if (lockedSender.getBalance().compareTo(BigDecimal.ZERO) < 0) {

            String reason =
                    "Financial invariant violated: sender balance became negative";

            recordTransferFailure(senderUserId, reason);

            throw new IllegalStateException(reason);
        }




        // =====================================================
        // 11. CREDIT RECEIVER
        // =====================================================

        lockedReceiver.setBalance(
                lockedReceiver.getBalance()
                        .add(amount)
        );
        if (lockedReceiver.getBalance().compareTo(BigDecimal.ZERO) < 0) {

            String reason =
                    "Financial invariant violated: receiver balance became negative";

            recordTransferFailure(senderUserId, reason);

            throw new IllegalStateException(reason);
        }
        BigDecimal senderBalanceAfter =
                lockedSender.getBalance();

        BigDecimal receiverBalanceAfter =
                lockedReceiver.getBalance();
        BigDecimal totalBefore =
                senderBalanceBefore.add(receiverBalanceBefore);

        BigDecimal totalAfter =
                senderBalanceAfter.add(receiverBalanceAfter);

        if (totalBefore.compareTo(totalAfter) != 0) {

            String reason =
                    "Financial invariant violated: money conservation check failed";

            recordTransferFailure(senderUserId, reason);

            throw new IllegalStateException(reason);
        }

        // =====================================================
        // 12. MARK TRANSACTION SUCCESS
        // =====================================================

        transaction.markSuccess();


        // =====================================================
        // 13. SAVE ACCOUNTS
        // =====================================================

        accountRepository.save(lockedSender);
        accountRepository.save(lockedReceiver);


        // =====================================================
        // 14. SAVE TRANSACTION
        // =====================================================

        Transaction savedTransaction =
                transactionRepository.save(transaction);

        String oldValue = String.format(
                "{\"senderBalance\":\"%s\",\"receiverBalance\":\"%s\"}",
                senderBalanceBefore,
                receiverBalanceBefore
        );

        String newValue = String.format(
                "{\"senderBalance\":\"%s\",\"receiverBalance\":\"%s\"}",
                senderBalanceAfter,
                receiverBalanceAfter
        );

        String description = String.format(
                "Transfer of INR %s from account %s to account %s",
                amount,
                maskAccountNumber(
                        senderAccount.getAccountNumber()
                ),
                maskAccountNumber(
                        receiverAccount.getAccountNumber()
                )
        );

        auditLogService.recordBusinessEvent(
                senderUserId,
                "TRANSFER_SUCCESS",
                "TRANSACTION",
                savedTransaction.getTransactionReference(),
                oldValue,
                newValue,
                description
        );
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

    private String maskAccountNumber(String accountNumber) {

        if (accountNumber == null || accountNumber.length() < 4) {
            return "****";
        }

        return "******" +
                accountNumber.substring(
                        accountNumber.length() - 4
                );
    }
    private void recordTransferFailure(
            Long senderUserId,
            String reason
    ) {
        try {
            auditLogService.recordBusinessFailure(
                    senderUserId,
                    "TRANSFER_FAILED",
                    "TRANSACTION",
                    null,
                    "Transfer failed",
                    reason
            );
        } catch (Exception auditException) {
            // Do not replace the original business failure
            // with an audit persistence failure.
        }
    }
}