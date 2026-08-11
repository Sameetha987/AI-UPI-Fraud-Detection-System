package com.safepay.backend.service;

import com.safepay.backend.dto.RegisterRequest;
import com.safepay.backend.dto.RegisterResponse;
import com.safepay.backend.entity.Account;
import com.safepay.backend.entity.User;
import com.safepay.backend.repository.AccountRepository;
import com.safepay.backend.repository.UserRepository;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.security.SecureRandom;

@Service
public class AuthService {

    private final UserRepository userRepository;
    private final AccountRepository accountRepository;
    private final PasswordEncoder passwordEncoder;

    private final SecureRandom secureRandom = new SecureRandom();

    public AuthService(
            UserRepository userRepository,
            AccountRepository accountRepository,
            PasswordEncoder passwordEncoder
    ) {
        this.userRepository = userRepository;
        this.accountRepository = accountRepository;
        this.passwordEncoder = passwordEncoder;
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
}