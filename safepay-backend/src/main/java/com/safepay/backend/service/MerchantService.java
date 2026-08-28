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
import java.util.UUID;

import com.safepay.backend.dto.PaymentRequestPayRequest;


@Service
public class MerchantService {

    private final MerchantRepository merchantRepository;
    private final UserRepository userRepository;
    private final PaymentRequestRepository paymentRequestRepository;
    private final AccountRepository accountRepository;
    private final TransactionRepository transactionRepository;
    public MerchantService(
            MerchantRepository merchantRepository,
            UserRepository userRepository,
            PaymentRequestRepository paymentRequestRepository, AccountRepository accountRepository, TransactionRepository transactionRepository
    ) {
        this.merchantRepository = merchantRepository;
        this.userRepository = userRepository;
        this.paymentRequestRepository = paymentRequestRepository;
        this.accountRepository = accountRepository;
        this.transactionRepository = transactionRepository;
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

        if (user.getRole() != User.Role.MERCHANT) {
            throw new IllegalArgumentException(
                    "User is not a merchant"
            );
        }

        if (user.getStatus() != User.Status.ACTIVE) {
            throw new IllegalArgumentException(
                    "User account is not active"
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


        // 1. Find payment request
        PaymentRequest paymentRequest =
                paymentRequestRepository
                        .findByPaymentReference(
                                request.paymentReference().trim()
                        )
                        .orElseThrow(() ->
                                new ResourceNotFoundException(
                                        "Payment request not found"
                                )
                        );
        //check idempotency key
        String idempotencyKey =
                request.idempotencyKey().trim();

        if (transactionRepository.existsByIdempotencyKey(
                idempotencyKey
        )) {
            throw new IllegalArgumentException(
                    "Idempotency key has already been used"
            );
        }

        // 2. Payment request must still be pending
        if (paymentRequest.getStatus()
                != PaymentRequest.Status.PENDING) {

            throw new IllegalArgumentException(
                    "Payment request is not available for payment"
            );
        }

        // 3. Find customer account
        Account customerAccount =
                accountRepository.findByUserId(customerUserId)
                        .orElseThrow(() ->
                                new ResourceNotFoundException(
                                        "Customer account not found"
                                )
                        );

        // 4. Find merchant account
        Long merchantUserId =
                paymentRequest.getMerchant()
                        .getUser()
                        .getId();

        Account merchantAccount =
                accountRepository.findByUserId(merchantUserId)
                        .orElseThrow(() ->
                                new ResourceNotFoundException(
                                        "Merchant account not found"
                                )
                        );

        // 5. Prevent merchant from paying itself
        if (customerAccount.getId()
                .equals(merchantAccount.getId())) {

            throw new IllegalArgumentException(
                    "Merchant cannot pay its own payment request"
            );
        }

        // 6. Customer account must be active
        if (customerAccount.getStatus()
                != Account.Status.ACTIVE) {

            throw new IllegalArgumentException(
                    "Customer account is not active"
            );
        }

        // 7. Merchant account must be active
        if (merchantAccount.getStatus()
                != Account.Status.ACTIVE) {

            throw new IllegalArgumentException(
                    "Merchant account is not active"
            );
        }

        // 8. Currency must match
        if (!customerAccount.getCurrency()
                .equalsIgnoreCase(
                        paymentRequest.getCurrency()
                )) {

            throw new IllegalArgumentException(
                    "Customer account currency mismatch"
            );
        }

        if (!merchantAccount.getCurrency()
                .equalsIgnoreCase(
                        paymentRequest.getCurrency()
                )) {

            throw new IllegalArgumentException(
                    "Merchant account currency mismatch"
            );
        }

        // 9. Check customer balance
        if (customerAccount.getBalance()
                .compareTo(paymentRequest.getAmount()) < 0) {

            throw new IllegalArgumentException(
                    "Insufficient balance"
            );
        }

        // 10. Debit customer
        customerAccount.setBalance(
                customerAccount.getBalance()
                        .subtract(paymentRequest.getAmount())
        );

        // 11. Credit merchant
        merchantAccount.setBalance(
                merchantAccount.getBalance()
                        .add(paymentRequest.getAmount())
        );

        // 12. Create transaction
        Transaction transaction = new Transaction();

        transaction.setSenderAccount(customerAccount);
        transaction.setReceiverAccount(merchantAccount);
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
        accountRepository.save(customerAccount);
        accountRepository.save(merchantAccount);

        // 15. Save transaction
        transactionRepository.save(transaction);

        // 16. Save payment request
        PaymentRequest savedPaymentRequest =
                paymentRequestRepository.save(
                        paymentRequest
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
}