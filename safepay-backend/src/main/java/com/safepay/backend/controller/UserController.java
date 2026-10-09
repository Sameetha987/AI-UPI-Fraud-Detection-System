package com.safepay.backend.controller;

import com.safepay.backend.dto.ChangePasswordRequest;
import com.safepay.backend.dto.UpdateProfileRequest;
import com.safepay.backend.dto.UserProfileResponse;
import com.safepay.backend.entity.User;
import com.safepay.backend.repository.UserRepository;
import com.safepay.backend.service.UserService;
import jakarta.validation.Valid;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.web.bind.annotation.*;

import com.safepay.backend.dto.ReceiverLookupResponse;
import com.safepay.backend.entity.Account;
import com.safepay.backend.repository.AccountRepository;

import java.util.Map;

@RestController
@RequestMapping("/api/users")
public class UserController {

    private final UserRepository userRepository;
    private final UserService userService;
    private final AccountRepository accountRepository;

    public UserController(
            UserRepository userRepository,
            UserService userService, AccountRepository accountRepository
    ) {
        this.userRepository = userRepository;
        this.userService = userService;
        this.accountRepository = accountRepository;
    }

    // =========================================================
    // GET CURRENT USER PROFILE
    // GET /api/users/me
    // =========================================================

    @GetMapping("/me")
    public ResponseEntity<UserProfileResponse> getCurrentUser(
            @AuthenticationPrincipal Jwt jwt
    ) {

        Long userId = Long.valueOf(jwt.getSubject());

        User user = userRepository.findById(userId)
                .orElseThrow(() ->
                        new RuntimeException("User not found")
                );

        UserProfileResponse response =
                new UserProfileResponse(
                        user.getId(),
                        user.getFullName(),
                        user.getEmail(),
                        user.getPhone(),
                        user.getRole().name(),
                        user.getStatus().name(),
                        user.getCreatedAt().toString()
                );

        return ResponseEntity.ok(response);
    }


    // =========================================================
    // UPDATE CURRENT USER PROFILE
    // PUT /api/users/me
    // =========================================================

    @PutMapping("/me")
    public ResponseEntity<UserProfileResponse> updateCurrentUser(
            @AuthenticationPrincipal Jwt jwt,
            @Valid @RequestBody UpdateProfileRequest request
    ) {

        Long userId = Long.valueOf(jwt.getSubject());

        User user = userRepository.findById(userId)
                .orElseThrow(() ->
                        new RuntimeException("User not found")
                );

        String newFullName =
                request.fullName().trim();

        String newPhone =
                request.phone().trim();

        // Check whether the new phone number belongs
        // to another user.
        userRepository.findByPhone(newPhone)
                .ifPresent(existingUser -> {

                    if (!existingUser.getId().equals(userId)) {
                        throw new IllegalArgumentException(
                                "Phone number is already registered"
                        );
                    }
                });

        user.setFullName(newFullName);
        user.setPhone(newPhone);

        User updatedUser =
                userRepository.save(user);

        UserProfileResponse response =
                new UserProfileResponse(
                        updatedUser.getId(),
                        updatedUser.getFullName(),
                        updatedUser.getEmail(),
                        updatedUser.getPhone(),
                        updatedUser.getRole().name(),
                        updatedUser.getStatus().name(),
                        updatedUser.getCreatedAt().toString()
                );

        return ResponseEntity.ok(response);
    }


    // =========================================================
    // CHANGE PASSWORD
    // PUT /api/users/me/password
    // =========================================================

    @PutMapping("/me/password")
    public ResponseEntity<Map<String, String>> changePassword(
            @AuthenticationPrincipal Jwt jwt,
            @Valid @RequestBody ChangePasswordRequest request
    ) {

        Long userId = Long.valueOf(jwt.getSubject());

        userService.changePassword(
                userId,
                request
        );

        return ResponseEntity.ok(
                Map.of(
                        "message",
                        "Password changed successfully"
                )
        );
    }
    // =========================================================
// LOOK UP RECEIVER BY PHONE NUMBER
// GET /api/users/lookup?phone=9876543210
// =========================================================

    @GetMapping("/lookup")
    public ResponseEntity<ReceiverLookupResponse> lookupReceiver(
            @AuthenticationPrincipal Jwt jwt,
            @RequestParam String phone
    ) {
        Long senderId = Long.valueOf(jwt.getSubject());

        String normalizedPhone = phone.trim();

        if (!normalizedPhone.matches("\\d{10}")) {
            throw new IllegalArgumentException(
                    "Enter a valid 10-digit phone number"
            );
        }

        User receiver = userRepository.findByPhone(normalizedPhone)
                .filter(user -> user.getStatus() == User.Status.ACTIVE)
                .orElseThrow(() ->
                        new IllegalArgumentException(
                                "No eligible SafePay user found for this phone number"
                        )
                );

        if (receiver.getId().equals(senderId)) {
            throw new IllegalArgumentException(
                    "You cannot transfer money to your own account"
            );
        }

        Account receiverAccount = accountRepository.findByUserId(receiver.getId())
                .filter(account -> account.getStatus() == Account.Status.ACTIVE)
                .orElseThrow(() ->
                        new IllegalArgumentException(
                                "Receiver account is not available for transfers"
                        )
                );

        String maskedPhone =
                "******" + normalizedPhone.substring(6);

        String accountNumber = receiverAccount.getAccountNumber();

        String maskedAccountNumber =
                "****" + accountNumber.substring(
                        Math.max(0, accountNumber.length() - 4)
                );

        ReceiverLookupResponse response = new ReceiverLookupResponse(
                receiver.getFullName(),
                maskedPhone,
                maskedAccountNumber
        );

        return ResponseEntity.ok(response);
    }
}