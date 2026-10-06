package com.safepay.backend.security;

import com.safepay.backend.entity.User;
import com.safepay.backend.repository.UserRepository;
import org.springframework.core.convert.converter.Converter;
import org.springframework.security.authentication.AbstractAuthenticationToken;
import org.springframework.security.authentication.AuthenticationServiceException;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.security.oauth2.server.resource.authentication.JwtAuthenticationToken;
import org.springframework.stereotype.Component;

import java.util.List;

@Component
public class DatabaseUserStatusJwtAuthenticationConverter
        implements Converter<Jwt, AbstractAuthenticationToken> {

    private final UserRepository userRepository;

    public DatabaseUserStatusJwtAuthenticationConverter(
            UserRepository userRepository
    ) {
        this.userRepository = userRepository;
    }

    @Override
    public AbstractAuthenticationToken convert(Jwt jwt) {

        // =========================================================
        // GET USER ID FROM JWT
        // =========================================================

        String subject = jwt.getSubject();

        if (subject == null || subject.isBlank()) {
            throw new AuthenticationServiceException(
                    "JWT subject is missing"
            );
        }

        Long userId;

        try {
            userId = Long.parseLong(subject);
        } catch (NumberFormatException ex) {
            throw new AuthenticationServiceException(
                    "Invalid user ID in JWT"
            );
        }

        // =========================================================
        // LOAD CURRENT USER FROM DATABASE
        // =========================================================

        User user = userRepository.findById(userId)
                .orElseThrow(() ->
                        new AuthenticationServiceException(
                                "User no longer exists"
                        )
                );

        // =========================================================
        // CHECK CURRENT ACCOUNT STATUS
        // =========================================================

        if (user.getStatus() != User.Status.ACTIVE) {
            throw new AuthenticationServiceException(
                    "User account is not active"
            );
        }

        // =========================================================
        // CHECK TOKEN VERSION
        // =========================================================

        Number tokenVersionClaim =
                jwt.getClaim("tokenVersion");

        if (tokenVersionClaim == null ||
                tokenVersionClaim.intValue()
                        != user.getTokenVersion()) {

            throw new AuthenticationServiceException(
                    "Token is no longer valid"
            );
        }

        // =========================================================
        // GET ROLE FROM DATABASE
        // NEVER TRUST ROLE FROM JWT
        // =========================================================

        String role = user.getRole().name();

        List<org.springframework.security.core.GrantedAuthority> authorities =
                List.of(
                        new org.springframework.security.core.authority.SimpleGrantedAuthority(
                                "ROLE_" + role
                        )
                );

        // =========================================================
        // CREATE AUTHENTICATION
        // =========================================================

        return new JwtAuthenticationToken(
                jwt,
                authorities,
                userId.toString()
        );
    }
}