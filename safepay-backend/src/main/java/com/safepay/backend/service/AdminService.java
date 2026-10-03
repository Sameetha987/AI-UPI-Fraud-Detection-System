package com.safepay.backend.service;
import com.safepay.backend.dto.AdminDashboardResponse;
import com.safepay.backend.entity.Account;
import com.safepay.backend.entity.Merchant;
import com.safepay.backend.entity.Transaction;
import com.safepay.backend.repository.AccountRepository;
import com.safepay.backend.repository.MerchantRepository;
import com.safepay.backend.repository.TransactionRepository;

import java.math.BigDecimal;
import com.safepay.backend.dto.AdminUserResponse;
import com.safepay.backend.entity.User;
import com.safepay.backend.repository.UserRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.safepay.backend.dto.TransactionResponse;
import com.safepay.backend.entity.Transaction;
import com.safepay.backend.repository.TransactionRepository;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;

import java.time.LocalDate;
import java.time.LocalDateTime;

import java.util.List;

@Service
public class AdminService {

    private final UserRepository userRepository;
    private final AccountRepository accountRepository;
    private final MerchantRepository merchantRepository;
    private final TransactionRepository transactionRepository;
    public AdminService(UserRepository userRepository, AccountRepository accountRepository, MerchantRepository merchantRepository, TransactionRepository transactionRepository) {
        this.userRepository = userRepository;
        this.accountRepository = accountRepository;
        this.merchantRepository = merchantRepository;
        this.transactionRepository = transactionRepository;
    }

    // =========================================================
    // GET ALL USERS
    // =========================================================

    public List<AdminUserResponse> getAllUsers() {

        return userRepository.findAll()
                .stream()
                .map(AdminUserResponse::from)
                .toList();
    }

    // =========================================================
    // GET USER BY ID
    // =========================================================

    public AdminUserResponse getUserById(Long id) {

        User user = findUser(id);

        return AdminUserResponse.from(user);
    }

    // =========================================================
    // BLOCK USER
    // =========================================================

    @Transactional
    public AdminUserResponse blockUser(Long id, Long adminId) {

        User user = findUser(id);

        validateAdminAction(user, adminId);

        user.setStatus(User.Status.BLOCKED);

        return AdminUserResponse.from(
                userRepository.save(user)
        );
    }

    // =========================================================
    // SUSPEND USER
    // =========================================================

    @Transactional
    public AdminUserResponse suspendUser(Long id, Long adminId) {

        User user = findUser(id);

        validateAdminAction(user, adminId);

        user.setStatus(User.Status.SUSPENDED);

        return AdminUserResponse.from(
                userRepository.save(user)
        );
    }

    // =========================================================
    // ACTIVATE USER
    // =========================================================

    @Transactional
    public AdminUserResponse activateUser(Long id, Long adminId) {

        User user = findUser(id);

        validateAdminAction(user, adminId);

        user.setStatus(User.Status.ACTIVE);

        return AdminUserResponse.from(
                userRepository.save(user)
        );
    }

    // =========================================================
    // FIND USER
    // =========================================================

    private User findUser(Long id) {

        return userRepository.findById(id)
                .orElseThrow(() ->
                        new RuntimeException("User not found")
                );
    }

    // =========================================================
    // SECURITY VALIDATION
    // =========================================================

    private void validateAdminAction(User targetUser, Long adminId) {

        // Admin cannot modify their own account
        if (targetUser.getId().equals(adminId)) {

            throw new IllegalArgumentException(
                    "Admin cannot modify their own account"
            );
        }

        // Admin cannot modify another ADMIN
        if (targetUser.getRole() == User.Role.ADMIN) {

            throw new IllegalArgumentException(
                    "Admin cannot modify another admin"
            );
        }
    }

    // =========================================================
// ADMIN TRANSACTION MONITORING
// =========================================================

    @Transactional(readOnly = true)
    public Page<TransactionResponse> getAllTransactions(
            int page,
            int size,
            Transaction.Status status,
            LocalDate fromDate,
            LocalDate toDate
    ) {

        if (page < 0) {
            throw new IllegalArgumentException(
                    "Page number cannot be negative"
            );
        }

        if (size < 1 || size > 50) {
            throw new IllegalArgumentException(
                    "Page size must be between 1 and 50"
            );
        }

        if (fromDate != null
                && toDate != null
                && fromDate.isAfter(toDate)) {

            throw new IllegalArgumentException(
                    "fromDate cannot be after toDate"
            );
        }

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

        PageRequest pageable =
                PageRequest.of(page, size);

        return transactionRepository
                .findAllTransactions(
                        status,
                        fromDateTime,
                        toDateTime,
                        pageable
                )
                .map(TransactionResponse::from);
    }
    @Transactional(readOnly = true)
    public AdminDashboardResponse getDashboard() {

        long totalUsers = userRepository.count();

        long activeUsers = userRepository.findAll()
                .stream()
                .filter(user -> user.getStatus() == User.Status.ACTIVE)
                .count();

        long blockedUsers = userRepository.findAll()
                .stream()
                .filter(user -> user.getStatus() == User.Status.BLOCKED)
                .count();

        long suspendedUsers = userRepository.findAll()
                .stream()
                .filter(user -> user.getStatus() == User.Status.SUSPENDED)
                .count();


        long totalAccounts = accountRepository.count();

        long activeAccounts = accountRepository.findAll()
                .stream()
                .filter(account -> account.getStatus() == Account.Status.ACTIVE)
                .count();

        long blockedAccounts = accountRepository.findAll()
                .stream()
                .filter(account -> account.getStatus() == Account.Status.BLOCKED)
                .count();


        long totalMerchants = merchantRepository.count();

        long activeMerchants = merchantRepository.findAll()
                .stream()
                .filter(merchant -> merchant.getStatus() == Merchant.Status.ACTIVE)
                .count();

        long blockedMerchants = merchantRepository.findAll()
                .stream()
                .filter(merchant -> merchant.getStatus() == Merchant.Status.BLOCKED)
                .count();

        long suspendedMerchants = merchantRepository.findAll()
                .stream()
                .filter(merchant -> merchant.getStatus() == Merchant.Status.SUSPENDED)
                .count();


        long totalTransactions = transactionRepository.count();

        long successfulTransactions = transactionRepository.findAll()
                .stream()
                .filter(transaction ->
                        transaction.getStatus() == Transaction.Status.SUCCESS)
                .count();

        long failedTransactions = transactionRepository.findAll()
                .stream()
                .filter(transaction ->
                        transaction.getStatus() == Transaction.Status.FAILED)
                .count();

        long pendingTransactions = transactionRepository.findAll()
                .stream()
                .filter(transaction ->
                        transaction.getStatus() == Transaction.Status.PENDING)
                .count();

        long cancelledTransactions = transactionRepository.findAll()
                .stream()
                .filter(transaction ->
                        transaction.getStatus() == Transaction.Status.CANCELLED)
                .count();


        BigDecimal totalTransactionVolume =
                transactionRepository.findAll()
                        .stream()
                        .filter(transaction ->
                                transaction.getStatus() == Transaction.Status.SUCCESS)
                        .map(Transaction::getAmount)
                        .reduce(BigDecimal.ZERO, BigDecimal::add);


        return new AdminDashboardResponse(
                totalUsers,
                activeUsers,
                blockedUsers,
                suspendedUsers,

                totalAccounts,
                activeAccounts,
                blockedAccounts,

                totalMerchants,
                activeMerchants,
                blockedMerchants,
                suspendedMerchants,

                totalTransactions,
                successfulTransactions,
                failedTransactions,
                pendingTransactions,
                cancelledTransactions,

                totalTransactionVolume
        );
    }
}