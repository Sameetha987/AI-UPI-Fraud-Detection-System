package com.safepay.backend.service;

import com.safepay.backend.dto.AdminUserResponse;
import com.safepay.backend.entity.User;
import com.safepay.backend.repository.UserRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

@Service
public class AdminService {

    private final UserRepository userRepository;

    public AdminService(UserRepository userRepository) {
        this.userRepository = userRepository;
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
}