package com.safepay.backend.service;

import com.safepay.backend.dto.ChangePasswordRequest;
import com.safepay.backend.dto.UpdateProfileRequest;
import com.safepay.backend.dto.UserResponse;
import com.safepay.backend.entity.User;
import com.safepay.backend.repository.UserRepository;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class UserService {

    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;

    public UserService(
            UserRepository userRepository,
            PasswordEncoder passwordEncoder
    ) {
        this.userRepository = userRepository;
        this.passwordEncoder = passwordEncoder;
    }

    public UserResponse getCurrentUser(Long userId) {

        User user = findUser(userId);

        return UserResponse.from(user);
    }

    @Transactional
    public UserResponse updateProfile(
            Long userId,
            UpdateProfileRequest request
    ) {

        User user = findUser(userId);

        String newPhone = request.phone().trim();

        if (!newPhone.equals(user.getPhone())
                && userRepository.existsByPhone(newPhone)) {

            throw new IllegalArgumentException(
                    "Phone number is already registered"
            );
        }

        user.setFullName(request.fullName().trim());
        user.setPhone(newPhone);

        User updatedUser = userRepository.save(user);

        return UserResponse.from(updatedUser);
    }

    @Transactional
    public void changePassword(
            Long userId,
            ChangePasswordRequest request
    ) {

        User user = findUser(userId);

        if (!passwordEncoder.matches(
                request.currentPassword(),
                user.getPasswordHash()
        )) {
            throw new IllegalArgumentException(
                    "Current password is incorrect"
            );
        }

        if (passwordEncoder.matches(
                request.newPassword(),
                user.getPasswordHash()
        )) {
            throw new IllegalArgumentException(
                    "New password must be different from current password"
            );
        }

        user.setPasswordHash(
                passwordEncoder.encode(request.newPassword())
        );

        userRepository.save(user);
    }

    private User findUser(Long userId) {

        return userRepository.findById(userId)
                .orElseThrow(() ->
                        new RuntimeException("User not found")
                );
    }
}