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

        User user = userRepository.findById(userId)
                .orElseThrow(() ->
                        new AuthenticationServiceException(
                                "User no longer exists"
                        )
                );

        if (user.getStatus() != User.Status.ACTIVE) {
            throw new AuthenticationServiceException(
                    "User account is not active"
            );
        }

        String role = jwt.getClaimAsString("role");

        if (role == null || role.isBlank()) {
            throw new AuthenticationServiceException(
                    "User role is missing"
            );
        }

        List<org.springframework.security.core.GrantedAuthority> authorities =
                List.of(
                        new org.springframework.security.core.authority.SimpleGrantedAuthority(
                                "ROLE_" + role
                        )
                );

        return new JwtAuthenticationToken(
                jwt,
                authorities,
                userId.toString()
        );
    }
}