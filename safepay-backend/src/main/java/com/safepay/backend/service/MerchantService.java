package com.safepay.backend.service;

import com.safepay.backend.dto.*;
import com.safepay.backend.entity.Merchant;
import com.safepay.backend.entity.PaymentRequest;
import com.safepay.backend.entity.User;
import com.safepay.backend.exception.ResourceNotFoundException;
import com.safepay.backend.repository.MerchantRepository;
import com.safepay.backend.repository.PaymentRequestRepository;
import com.safepay.backend.repository.UserRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import com.safepay.backend.entity.Account;
import com.safepay.backend.entity.Transaction;
import com.safepay.backend.repository.AccountRepository;
import com.safepay.backend.repository.TransactionRepository;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import com.safepay.backend.dto.TransactionResponse;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.math.BigDecimal;
import java.util.List;
import java.util.UUID;

import com.safepay.backend.dto.PaymentRequestPayRequest;


@Service
public class MerchantService {

    private final MerchantRepository merchantRepository;
    private final UserRepository userRepository;
    private final PaymentRequestRepository paymentRequestRepository;
    private final AccountRepository accountRepository;
    private final TransactionRepository transactionRepository;
    private final AuditLogService auditLogService;
    public MerchantService(
            MerchantRepository merchantRepository,
            UserRepository userRepository,
            PaymentRequestRepository paymentRequestRepository, AccountRepository accountRepository, TransactionRepository transactionRepository, AuditLogService auditLogService
    ) {
        this.merchantRepository = merchantRepository;
        this.userRepository = userRepository;
        this.paymentRequestRepository = paymentRequestRepository;
        this.accountRepository = accountRepository;
        this.transactionRepository = transactionRepository;
        this.auditLogService = auditLogService;
    }

    // =========================================================
    // CREATE MERCHANT PROFILE
    // =========================================================

    @Transactional
    public MerchantResponse createMerchant(
            Long userId,
            MerchantRegistrationRequest request
    ) {

        User user = userRepository.findById(userId)
                .orElseThrow(() ->
                        new ResourceNotFoundException(
                                "User not found"
                        )
                );

        if (user.getStatus() != User.Status.ACTIVE) {
            throw new IllegalArgumentException(
                    "User account is not active"
            );
        }

        if (user.getRole() != User.Role.USER) {
            throw new IllegalArgumentException(
                    "Only normal users can create a merchant profile"
            );
        }

        if (merchantRepository.existsByUserId(userId)) {
            throw new IllegalArgumentException(
                    "Merchant profile already exists"
            );
        }

        String businessName =
                request.businessName().trim();

        if (merchantRepository.existsByBusinessName(
                businessName
        )) {
            throw new IllegalArgumentException(
                    "Business name already exists"
            );
        }

        Merchant merchant = new Merchant();

        merchant.setUser(user);
        merchant.setBusinessName(businessName);
        merchant.setBusinessType(
                request.businessType().trim()
        );
        merchant.setStatus(
                Merchant.Status.ACTIVE
        );

        Merchant savedMerchant =
                merchantRepository.save(merchant);

        // Promote user to MERCHANT
        user.setRole(User.Role.MERCHANT);
        userRepository.save(user);

        auditLogService.recordBusinessEvent(
                userId,
                "MERCHANT_CREATED",
                "MERCHANT",
                String.valueOf(savedMerchant.getId()),
                null,
                String.format(
                        "{\"businessName\":\"%s\",\"businessType\":\"%s\",\"status\":\"%s\"}",
                        savedMerchant.getBusinessName(),
                        savedMerchant.getBusinessType(),
                        savedMerchant.getStatus()
                ),
                "Merchant profile created for business "
                        + savedMerchant.getBusinessName()
        );

        return MerchantResponse.from(savedMerchant);
    }

    // =========================================================
    // GET MY MERCHANT PROFILE
    // =========================================================

    @Transactional(readOnly = true)
    public MerchantResponse getMyMerchantProfile(
            Long userId
    ) {

        Merchant merchant =
                merchantRepository.findByUserId(userId)
                        .orElseThrow(() ->
                                new ResourceNotFoundException(
                                        "Merchant profile not found"
                                )
                        );

        return MerchantResponse.from(merchant);
    }

    // =========================================================
    // CREATE PAYMENT REQUEST
    // =========================================================

    @Transactional
    public MerchantPaymentResponse createPaymentRequest(
            Long userId,
            MerchantPaymentRequest request
    ) {

        Merchant merchant =
                merchantRepository.findByUserId(userId)
                        .orElseThrow(() ->
                                new ResourceNotFoundException(
                                        "Merchant profile not found"
                                )
                        );

        // Merchant must be active
        if (merchant.getStatus()
                != Merchant.Status.ACTIVE) {

            throw new IllegalArgumentException(
                    "Merchant account is not active"
            );
        }

        // Validate amount
        BigDecimal amount = request.amount();

        if (amount == null) {
            throw new IllegalArgumentException(
                    "Amount is required"
            );
        }

        if (amount.compareTo(BigDecimal.ZERO) <= 0) {
            throw new IllegalArgumentException(
                    "Amount must be greater than zero"
            );
        }

        if (amount.scale() > 2) {
            throw new IllegalArgumentException(
                    "Amount cannot have more than 2 decimal places"
            );
        }

        // Validate currency
        String currency =
                request.currency()
                        .trim()
                        .toUpperCase();

        if (!currency.equals("INR")) {
            throw new IllegalArgumentException(
                    "Only INR is supported"
            );
        }

        // Create payment request
        PaymentRequest paymentRequest =
                new PaymentRequest();

        paymentRequest.setMerchant(merchant);
        paymentRequest.setAmount(amount);
        paymentRequest.setCurrency(currency);
        paymentRequest.setDescription(
                request.description()
        );

        paymentRequest.setPaymentReference(
                generatePaymentReference()
        );

        paymentRequest.setStatus(
                PaymentRequest.Status.PENDING
        );

        // Save
        PaymentRequest saved =
                paymentRequestRepository.save(
                        paymentRequest
                );

        auditLogService.recordBusinessEvent(
                userId,
                "PAYMENT_REQUEST_CREATED",
                "PAYMENT_REQUEST",
                saved.getPaymentReference(),
                null,
                String.format(
                        "{\"amount\":\"%s\",\"currency\":\"%s\",\"status\":\"%s\"}",
                        saved.getAmount(),
                        saved.getCurrency(),
                        saved.getStatus()
                ),
                "Payment request created with reference "
                        + saved.getPaymentReference()
        );
        return MerchantPaymentResponse.from(saved);
    }

    // =========================================================
    // PAY MERCHANT PAYMENT REQUEST
    // =========================================================

    @Transactional
    public MerchantPaymentResponse payPaymentRequest(
            Long customerUserId,
            PaymentRequestPayRequest request
    ) {


        // 1. Find and lock  payment request
        PaymentRequest paymentRequest =
                paymentRequestRepository
                        .findByPaymentReferenceForUpdate(
                                request.paymentReference()
                        )
                        .orElseThrow(() -> {

                            String reason = "Payment request not found";

                            recordMerchantPaymentFailure(
                                    customerUserId,
                                    request.paymentReference(),
                                    reason
                            );

                            return new ResourceNotFoundException(reason);
                        });
        //check idempotency key
        String idempotencyKey =
                request.idempotencyKey().trim();

        if (transactionRepository.existsByIdempotencyKey(
                idempotencyKey
        )) {

            String reason = "Idempotency key has already been used";

            recordMerchantPaymentFailure(
                    customerUserId,
                    request.paymentReference(),
                    reason
            );

            throw new IllegalArgumentException(reason);
        }

        // 2. Payment request must still be pending
        if (paymentRequest.getStatus()
                != PaymentRequest.Status.PENDING) {

            String reason =
                    "Payment request is not available for payment";

            recordMerchantPaymentFailure(
                    customerUserId,
                    paymentRequest.getPaymentReference(),
                    reason
            );

            throw new IllegalArgumentException(reason);
        }

        // 3. Find customer account
        Account customerAccount =
                accountRepository.findByUserId(customerUserId)
                        .orElseThrow(() -> {

                            String reason = "Customer account not found";

                            recordMerchantPaymentFailure(
                                    customerUserId,
                                    request.paymentReference(),
                                    reason
                            );

                            return new ResourceNotFoundException(reason);
                        });

        // 4. Find merchant account
        Long merchantUserId =
                paymentRequest.getMerchant()
                        .getUser()
                        .getId();

        Account merchantAccount =
                accountRepository.findByUserId(merchantUserId)
                        .orElseThrow(() -> {

                            String reason = "Merchant account not found";

                            recordMerchantPaymentFailure(
                                    customerUserId,
                                    request.paymentReference(),
                                    reason
                            );

                            return new ResourceNotFoundException(reason);
                        });
        // =========================================================
// LOCK CUSTOMER AND MERCHANT ACCOUNTS
// =========================================================

        List<Long> accountIds = List.of(
                customerAccount.getId(),
                merchantAccount.getId()
        );

        List<Account> lockedAccounts =
                accountRepository.findAllByIdsForUpdate(
                        accountIds
                );

        Account lockedCustomer =
                lockedAccounts.stream()
                        .filter(account ->
                                account.getId()
                                        .equals(customerAccount.getId())
                        )
                        .findFirst()
                        .orElseThrow(() ->
                                new ResourceNotFoundException(
                                        "Customer account not found"
                                )
                        );

        Account lockedMerchant =
                lockedAccounts.stream()
                        .filter(account ->
                                account.getId()
                                        .equals(merchantAccount.getId())
                        )
                        .findFirst()
                        .orElseThrow(() ->
                                new ResourceNotFoundException(
                                        "Merchant account not found"
                                )
                        );

        // 5. Prevent merchant from paying itself
        if (lockedCustomer.getId()
                .equals(lockedMerchant.getId())) {

            String reason =
                    "Merchant cannot pay its own payment request";

            recordMerchantPaymentFailure(
                    customerUserId,
                    paymentRequest.getPaymentReference(),
                    reason
            );

            throw new IllegalArgumentException(reason);
        }

        // 6. Customer account must be active
        if (lockedCustomer.getStatus()
                != Account.Status.ACTIVE) {

            String reason =
                    "Customer account is not active";

            recordMerchantPaymentFailure(
                    customerUserId,
                    paymentRequest.getPaymentReference(),
                    reason
            );

            throw new IllegalArgumentException(reason);
        }

        // 7. Merchant account must be active
        if (lockedMerchant.getStatus()
                != Account.Status.ACTIVE) {

            String reason =
                    "Merchant account is not active";

            recordMerchantPaymentFailure(
                    customerUserId,
                    paymentRequest.getPaymentReference(),
                    reason
            );

            throw new IllegalArgumentException(reason);
        }

        // 8. Currency must match
        if (!lockedCustomer.getCurrency()
                .equalsIgnoreCase(
                        paymentRequest.getCurrency()
                )) {

            String reason =
                    "Customer account currency mismatch";

            recordMerchantPaymentFailure(
                    customerUserId,
                    paymentRequest.getPaymentReference(),
                    reason
            );

            throw new IllegalArgumentException(reason);
        }

        if (!lockedMerchant.getCurrency()
                .equalsIgnoreCase(
                        paymentRequest.getCurrency()
                )) {

            String reason =
                    "Merchant account currency mismatch";

            recordMerchantPaymentFailure(
                    customerUserId,
                    paymentRequest.getPaymentReference(),
                    reason
            );

            throw new IllegalArgumentException(reason);
        }

        // 9. Check customer balance
        if (lockedCustomer.getBalance()
                .compareTo(paymentRequest.getAmount()) < 0) {

            String reason = "Insufficient balance";

            recordMerchantPaymentFailure(
                    customerUserId,
                    paymentRequest.getPaymentReference(),
                    reason
            );

            throw new IllegalArgumentException(reason);
        }
        BigDecimal customerBalanceBefore =
                lockedCustomer.getBalance();

        BigDecimal merchantBalanceBefore =
                lockedMerchant.getBalance();
        // 10. Debit customer
        lockedCustomer.setBalance(
                lockedCustomer.getBalance()
                        .subtract(paymentRequest.getAmount())
        );

        // 11. Credit merchant
        lockedMerchant.setBalance(
                lockedMerchant.getBalance()
                        .add(paymentRequest.getAmount())
        );
        // =========================================================
// FINANCIAL INVARIANTS
// =========================================================

        if (lockedCustomer.getBalance()
                .compareTo(BigDecimal.ZERO) < 0) {

            throw new IllegalStateException(
                    "Customer account balance cannot be negative"
            );
        }

        BigDecimal beforeTotal =
                customerBalanceBefore
                        .add(merchantBalanceBefore);

        BigDecimal afterTotal =
                lockedCustomer.getBalance()
                        .add(lockedMerchant.getBalance());

        if (beforeTotal.compareTo(afterTotal) != 0) {

            throw new IllegalStateException(
                    "Financial invariant violated"
            );
        }

        // 12. Create transaction
        Transaction transaction = new Transaction();

        transaction.setSenderAccount(lockedCustomer);
        transaction.setReceiverAccount(lockedMerchant);
        transaction.setAmount(paymentRequest.getAmount());
        transaction.setCurrency(paymentRequest.getCurrency());
        transaction.setDescription(
                paymentRequest.getDescription()
        );
        transaction.setIdempotencyKey(
                idempotencyKey
        );
        transaction.setTransactionReference(
                generateTransactionReference()
        );
        transaction.setStatus(
                Transaction.Status.SUCCESS
        );
        transaction.setCompletedAt(
                LocalDateTime.now()
        );

        // 13. Mark payment request as paid
        paymentRequest.setStatus(
                PaymentRequest.Status.PAID
        );

        paymentRequest.setPaidAt(
                LocalDateTime.now()
        );

        // 14. Save accounts
        accountRepository.save(lockedCustomer);
        accountRepository.save(lockedMerchant);

        // 15. Save transaction
        transactionRepository.save(transaction);

        // 16. Save payment request
        PaymentRequest savedPaymentRequest =
                paymentRequestRepository.save(
                        paymentRequest
                );
        String oldValue = String.format(
                "{\"customerBalance\":\"%s\",\"merchantBalance\":\"%s\",\"paymentStatus\":\"PENDING\"}",
                customerBalanceBefore,
                merchantBalanceBefore
        );

        String newValue = String.format(
                "{\"customerBalance\":\"%s\",\"merchantBalance\":\"%s\",\"paymentStatus\":\"PAID\"}",
                lockedCustomer.getBalance(),
                lockedMerchant.getBalance()
        );

        auditLogService.recordBusinessEvent(
                customerUserId,
                "MERCHANT_PAYMENT_SUCCESS",
                "PAYMENT_REQUEST",
                savedPaymentRequest.getPaymentReference(),
                oldValue,
                newValue,
                String.format(
                        "Merchant payment of INR %s completed for payment %s",
                        savedPaymentRequest.getAmount(),
                        savedPaymentRequest.getPaymentReference()
                )
        );
        // 17. Return response
        return MerchantPaymentResponse.from(
                savedPaymentRequest
        );
    }

    // =========================================================
    // GET MERCHANT TRANSACTIONS
    // =========================================================

    @Transactional(readOnly = true)
    public Page<TransactionResponse> getMerchantTransactions(
            Long userId,
            int page,
            int size,
            String type,
            Transaction.Status status,
            LocalDate fromDate,
            LocalDate toDate
    ) {

        // 1. Verify merchant profile
        Merchant merchant =
                merchantRepository.findByUserId(userId)
                        .orElseThrow(() ->
                                new ResourceNotFoundException(
                                        "Merchant profile not found"
                                )
                        );

        // 2. Merchant must be active
        if (merchant.getStatus()
                != Merchant.Status.ACTIVE) {

            throw new IllegalArgumentException(
                    "Merchant account is not active"
            );
        }

        // 3. Find merchant account
        Account account =
                accountRepository.findByUserId(userId)
                        .orElseThrow(() ->
                                new ResourceNotFoundException(
                                        "Merchant account not found"
                                )
                        );

        // 4. Create pagination
        Pageable pageable =
                PageRequest.of(page, size);

        // 5. Convert dates
        LocalDateTime fromDateTime = null;
        LocalDateTime toDateTime = null;

        if (fromDate != null) {
            fromDateTime =
                    fromDate.atStartOfDay();
        }

        if (toDate != null) {
            toDateTime =
                    toDate.plusDays(1).atStartOfDay();
        }

        // 6. Find merchant transactions
        Page<Transaction> transactions =
                transactionRepository.findUserTransactions(
                        account.getId(),
                        type,
                        status,
                        fromDateTime,
                        toDateTime,
                        pageable
                );

        // 7. Convert to response
        return transactions.map(
                TransactionResponse::from
        );
    }

    // =========================================================
    // PAYMENT REFERENCE GENERATOR
    // =========================================================

    private String generatePaymentReference() {

        return "PAY-" +
                UUID.randomUUID()
                        .toString()
                        .replace("-", "")
                        .substring(0, 20)
                        .toUpperCase();
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
    //get all merchants
    @Transactional(readOnly = true)
    public List<AdminMerchantResponse> getAllMerchants() {

        return merchantRepository.findAllByOrderByCreatedAtDesc()
                .stream()
                .map(AdminMerchantResponse::from)
                .toList();
    }
    //Get merchant by ID
    @Transactional(readOnly = true)
    public AdminMerchantResponse getMerchantById(Long id) {

        Merchant merchant = merchantRepository.findById(id)
                .orElseThrow(() ->
                        new ResourceNotFoundException("Merchant not found")
                );

        return AdminMerchantResponse.from(merchant);
    }
    //block merchant
    @Transactional
    public AdminMerchantResponse blockMerchant(
            Long id,
            Long adminId
    ) {

        Merchant merchant = merchantRepository.findById(id)
                .orElseThrow(() ->
                        new ResourceNotFoundException(
                                "Merchant not found"
                        )
                );

        if (merchant.getStatus() == Merchant.Status.BLOCKED) {
            throw new IllegalArgumentException(
                    "Merchant is already blocked"
            );
        }

        Merchant.Status oldStatus =
                merchant.getStatus();

        merchant.setStatus(Merchant.Status.BLOCKED);

        Merchant savedMerchant =
                merchantRepository.save(merchant);

        auditLogService.recordBusinessEvent(
                adminId,
                "MERCHANT_BLOCKED",
                "MERCHANT",
                String.valueOf(savedMerchant.getId()),
                String.format(
                        "{\"status\":\"%s\"}",
                        oldStatus
                ),
                "{\"status\":\"BLOCKED\"}",
                "Merchant "
                        + savedMerchant.getBusinessName()
                        + " was blocked"
        );

        return AdminMerchantResponse.from(savedMerchant);
    }
    //suspend merchant
    @Transactional
    public AdminMerchantResponse suspendMerchant(
            Long id,
            Long adminId
    ) {

        Merchant merchant = merchantRepository.findById(id)
                .orElseThrow(() ->
                        new ResourceNotFoundException(
                                "Merchant not found"
                        )
                );

        if (merchant.getStatus() == Merchant.Status.SUSPENDED) {
            throw new IllegalArgumentException(
                    "Merchant is already suspended"
            );
        }

        Merchant.Status oldStatus =
                merchant.getStatus();

        merchant.setStatus(Merchant.Status.SUSPENDED);

        Merchant savedMerchant =
                merchantRepository.save(merchant);

        auditLogService.recordBusinessEvent(
                adminId,
                "MERCHANT_SUSPENDED",
                "MERCHANT",
                String.valueOf(savedMerchant.getId()),
                String.format(
                        "{\"status\":\"%s\"}",
                        oldStatus
                ),
                "{\"status\":\"SUSPENDED\"}",
                "Merchant "
                        + savedMerchant.getBusinessName()
                        + " was suspended"
        );

        return AdminMerchantResponse.from(savedMerchant);
    }
    //activate
    @Transactional
    public AdminMerchantResponse activateMerchant(
            Long id,
            Long adminId
    ) {

        Merchant merchant = merchantRepository.findById(id)
                .orElseThrow(() ->
                        new ResourceNotFoundException(
                                "Merchant not found"
                        )
                );

        if (merchant.getStatus() == Merchant.Status.ACTIVE) {
            throw new IllegalArgumentException(
                    "Merchant is already active"
            );
        }

        Merchant.Status oldStatus =
                merchant.getStatus();

        merchant.setStatus(Merchant.Status.ACTIVE);

        Merchant savedMerchant =
                merchantRepository.save(merchant);

        auditLogService.recordBusinessEvent(
                adminId,
                "MERCHANT_ACTIVATED",
                "MERCHANT",
                String.valueOf(savedMerchant.getId()),
                String.format(
                        "{\"status\":\"%s\"}",
                        oldStatus
                ),
                "{\"status\":\"ACTIVE\"}",
                "Merchant "
                        + savedMerchant.getBusinessName()
                        + " was activated"
        );

        return AdminMerchantResponse.from(savedMerchant);
    }
    private void recordMerchantPaymentFailure(
            Long customerUserId,
            String paymentReference,
            String reason
    ) {

        auditLogService.recordBusinessFailure(
                customerUserId,
                "MERCHANT_PAYMENT_FAILED",
                "PAYMENT_REQUEST",
                paymentReference,
                "Merchant payment failed",
                reason
        );
    }
}