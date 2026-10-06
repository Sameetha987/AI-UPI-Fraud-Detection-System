package com.safepay.backend.service;

import com.safepay.backend.dto.LoginRequest;
import com.safepay.backend.dto.LoginResponse;
import com.safepay.backend.dto.RegisterRequest;
import com.safepay.backend.dto.RegisterResponse;
import com.safepay.backend.entity.Account;
import com.safepay.backend.entity.User;
import com.safepay.backend.repository.AccountRepository;
import com.safepay.backend.repository.UserRepository;
import com.safepay.backend.security.JwtService;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.security.SecureRandom;

@Service
public class AuthService {

    private final UserRepository userRepository;
    private final AccountRepository accountRepository;
    private final PasswordEncoder passwordEncoder;
    private final JwtService jwtService;
    private final SecureRandom secureRandom = new SecureRandom();
    private final AuditLogService auditLogService;
    public AuthService(
            UserRepository userRepository,
            AccountRepository accountRepository,
            PasswordEncoder passwordEncoder, JwtService jwtService, AuditLogService auditLogService
    ) {
        this.userRepository = userRepository;
        this.accountRepository = accountRepository;
        this.passwordEncoder = passwordEncoder;
        this.jwtService = jwtService;
        this.auditLogService = auditLogService;
    }

    @Transactional
    public RegisterResponse register(RegisterRequest request) {

        String email = request.getEmail().trim().toLowerCase();
        String phone = request.getPhone().trim();

        if (userRepository.existsByEmail(email)) {

            String reason = "Email is already registered";

            auditLogService.recordBusinessFailure(
                    null,
                    "REGISTRATION_FAILED",
                    "USER",
                    null,
                    "User registration failed",
                    reason
            );

            throw new IllegalArgumentException(reason);
        }

        if (userRepository.existsByPhone(phone)) {

            String reason = "Phone number is already registered";

            auditLogService.recordBusinessFailure(
                    null,
                    "REGISTRATION_FAILED",
                    "USER",
                    null,
                    "User registration failed",
                    reason
            );

            throw new IllegalArgumentException(reason);
        }

        User user = new User();

        user.setFullName(request.getFullName().trim());
        user.setEmail(email);
        user.setPhone(phone);

        // NEVER store the raw password.
        user.setPasswordHash(
                passwordEncoder.encode(request.getPassword())
        );

        user.setRole(User.Role.USER);
        user.setStatus(User.Status.ACTIVE);

        User savedUser = userRepository.save(user);

        Account account = new Account();

        account.setUser(savedUser);
        account.setAccountNumber(generateAccountNumber());

        // New accounts start with zero balance.
        account.setBalance(java.math.BigDecimal.ZERO);
        account.setCurrency("INR");
        account.setStatus(Account.Status.ACTIVE);

        Account savedAccount = accountRepository.save(account);

        auditLogService.recordBusinessEvent(
                savedUser.getId(),
                "USER_REGISTERED",
                "USER",
                String.valueOf(savedUser.getId()),
                null,
                String.format(
                        "{\"status\":\"%s\",\"role\":\"%s\"}",
                        savedUser.getStatus(),
                        savedUser.getRole()
                ),
                "User registered successfully"
        );

        return new RegisterResponse(
                savedUser.getId(),
                savedUser.getFullName(),
                savedUser.getEmail(),
                savedUser.getPhone(),
                savedAccount.getAccountNumber(),
                "Registration successful"
        );
    }

    private String generateAccountNumber() {

        String accountNumber;

        do {
            StringBuilder builder = new StringBuilder();

            for (int i = 0; i < 12; i++) {
                builder.append(secureRandom.nextInt(10));
            }

            accountNumber = builder.toString();

        } while (accountRepository.existsByAccountNumber(accountNumber));

        return accountNumber;
    }

    public LoginResponse login(LoginRequest request) {

        // =========================================================
        // NORMALIZE EMAIL
        // =========================================================

        String email = request.email()
                .trim()
                .toLowerCase();

        // =========================================================
        // FIND USER
        // =========================================================

        User user = userRepository
                .findByEmail(email)
                .orElseThrow(() -> {

                    String reason = "Invalid email or password";

                    auditLogService.recordBusinessFailure(
                            null,
                            "LOGIN_FAILED",
                            "USER",
                            null,
                            "Login failed",
                            reason
                    );

                    return new IllegalArgumentException(
                            "Invalid email or password"
                    );
                });

        // =========================================================
        // CHECK TEMPORARY LOGIN LOCK
        // =========================================================

        if (user.getLockedUntil() != null) {

            if (user.getLockedUntil()
                    .isAfter(java.time.LocalDateTime.now())) {

                String reason =
                        "Login temporarily locked";

                auditLogService.recordBusinessFailure(
                        user.getId(),
                        "LOGIN_FAILED",
                        "USER",
                        String.valueOf(user.getId()),
                        "Login failed",
                        reason
                );

                // Do NOT reveal whether the account is locked.
                throw new IllegalArgumentException(
                        "Invalid email or password"
                );
            }

            // Lock has expired.
            user.setFailedLoginAttempts(0);
            user.setLockedUntil(null);

            userRepository.save(user);
        }

        // =========================================================
        // CHECK ACCOUNT STATUS
        // =========================================================

        if (user.getStatus() != User.Status.ACTIVE) {

            String reason =
                    "User account is not active";

            auditLogService.recordBusinessFailure(
                    user.getId(),
                    "LOGIN_FAILED",
                    "USER",
                    String.valueOf(user.getId()),
                    "Login failed",
                    reason
            );

            // Do NOT reveal account status.
            throw new IllegalArgumentException(
                    "Invalid email or password"
            );
        }

        // =========================================================
        // CHECK PASSWORD
        // =========================================================

        if (!passwordEncoder.matches(
                request.password(),
                user.getPasswordHash()
        )) {

            int failedAttempts =
                    user.getFailedLoginAttempts() + 1;

            user.setFailedLoginAttempts(
                    failedAttempts
            );

            if (failedAttempts >= 5) {

                user.setLockedUntil(
                        java.time.LocalDateTime.now()
                                .plusMinutes(15)
                );
            }

            userRepository.save(user);

            String reason =
                    "Invalid email or password";

            auditLogService.recordBusinessFailure(
                    user.getId(),
                    "LOGIN_FAILED",
                    "USER",
                    String.valueOf(user.getId()),
                    "Login failed",
                    reason
            );

            throw new IllegalArgumentException(
                    "Invalid email or password"
            );
        }

        // =========================================================
        // SUCCESSFUL LOGIN
        // =========================================================

        user.setFailedLoginAttempts(0);
        user.setLockedUntil(null);

        userRepository.save(user);

        // =========================================================
        // GENERATE JWT
        // =========================================================

        String token = jwtService.generateToken(
                user.getId(),
                user.getEmail(),
                user.getRole().name(),
                user.getTokenVersion()
        );

        // =========================================================
        // AUDIT SUCCESS
        // =========================================================

        auditLogService.recordBusinessEvent(
                user.getId(),
                "LOGIN_SUCCESS",
                "USER",
                String.valueOf(user.getId()),
                null,
                String.format(
                        "{\"status\":\"%s\",\"role\":\"%s\"}",
                        user.getStatus(),
                        user.getRole()
                ),
                "User logged in successfully"
        );

        // =========================================================
        // RESPONSE
        // =========================================================

        return new LoginResponse(
                token,
                user.getId(),
                user.getFullName(),
                user.getEmail(),
                user.getRole().name(),
                "Login successful"
        );
    }
}