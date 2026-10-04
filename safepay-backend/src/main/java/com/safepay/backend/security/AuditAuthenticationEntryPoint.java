package com.safepay.backend.security;

import com.safepay.backend.entity.AuditLog;
import com.safepay.backend.service.AuditLogService;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.springframework.security.core.AuthenticationException;
import org.springframework.security.web.AuthenticationEntryPoint;
import org.springframework.stereotype.Component;

import java.io.IOException;
import java.util.UUID;

@Component
public class AuditAuthenticationEntryPoint
        implements AuthenticationEntryPoint {

    private final AuditLogService auditLogService;

    public AuditAuthenticationEntryPoint(
            AuditLogService auditLogService
    ) {
        this.auditLogService = auditLogService;
    }

    @Override
    public void commence(
            HttpServletRequest request,
            HttpServletResponse response,
            AuthenticationException exception
    ) throws IOException {

        String requestId =
                request.getHeader("X-Request-ID");

        if (requestId == null || requestId.isBlank()) {
            requestId = UUID.randomUUID().toString();
        }

        auditLogService.record(
                null,
                "AUTHENTICATION_FAILURE",
                "AUTHENTICATION",
                request.getRequestURI(),
                null,
                null,
                "Authentication failed",
                request.getMethod(),
                request.getRequestURI(),
                getClientIp(request),
                request.getHeader("User-Agent"),
                requestId,
                AuditLog.Status.FAILURE,
                exception.getMessage()
        );

        response.setStatus(
                HttpServletResponse.SC_UNAUTHORIZED
        );

        response.setContentType("application/json");

        response.getWriter().write(
                """
                {
                    "error": "Unauthorized"
                }
                """
        );
    }

    private String getClientIp(
            HttpServletRequest request
    ) {

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
}