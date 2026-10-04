package com.safepay.backend.service;

import jakarta.servlet.http.HttpServletRequest;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.stereotype.Service;

import java.util.UUID;

@Service
public class AuditContextService {

    private final HttpServletRequest request;

    public AuditContextService(HttpServletRequest request) {
        this.request = request;
    }

    public Long getActorUserId() {

        Authentication authentication =
                SecurityContextHolder
                        .getContext()
                        .getAuthentication();

        if (authentication == null
                || !authentication.isAuthenticated()) {
            return null;
        }

        Object principal = authentication.getPrincipal();

        if (principal instanceof Jwt jwt) {

            String subject = jwt.getSubject();

            if (subject != null && !subject.isBlank()) {
                return Long.valueOf(subject);
            }
        }

        return null;
    }

    public String getHttpMethod() {
        return request.getMethod();
    }

    public String getEndpoint() {
        return request.getRequestURI();
    }

    public String getIpAddress() {

        String forwardedFor =
                request.getHeader("X-Forwarded-For");

        if (forwardedFor != null
                && !forwardedFor.isBlank()) {

            return forwardedFor
                    .split(",")[0]
                    .trim();
        }

        return request.getRemoteAddr();
    }

    public String getUserAgent() {
        return request.getHeader("User-Agent");
    }

    public String getRequestId() {

        String requestId =
                request.getHeader("X-Request-ID");

        if (requestId == null || requestId.isBlank()) {
            requestId = UUID.randomUUID().toString();
        }

        return requestId;
    }
}