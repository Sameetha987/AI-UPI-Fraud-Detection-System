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

    public AuthService(
            UserRepository userRepository,
            AccountRepository accountRepository,
            PasswordEncoder passwordEncoder, JwtService jwtService
    ) {
        this.userRepository = userRepository;
        this.accountRepository = accountRepository;
        this.passwordEncoder = passwordEncoder;
        this.jwtService = jwtService;
    }

    @Transactional
    public RegisterResponse register(RegisterRequest request) {

        String email = request.getEmail().trim().toLowerCase();
        String phone = request.getPhone().trim();

        if (userRepository.existsByEmail(email)) {
            throw new IllegalArgumentException("Email is already registered");
        }

        if (userRepository.existsByPhone(phone)) {
            throw new IllegalArgumentException("Phone number is already registered");
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

        User user = userRepository
                .findByEmail(request.email())
                .orElseThrow(() ->
                        new RuntimeException("Invalid email or password")
                );

        if (user.getStatus() != User.Status.ACTIVE) {
            throw new RuntimeException("User account is not active");
        }

        if (!passwordEncoder.matches(
                request.password(),
                user.getPasswordHash()
        )) {
            throw new RuntimeException("Invalid email or password");
        }

        String token = jwtService.generateToken(
                user.getId(),
                user.getEmail(),
                user.getRole().name()
        );

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