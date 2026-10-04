package com.safepay.backend.security;

import com.safepay.backend.entity.AuditLog;
import com.safepay.backend.service.AuditLogService;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.security.web.access.AccessDeniedHandler;
import org.springframework.stereotype.Component;

import java.io.IOException;
import java.util.UUID;

@Component
public class AuditAccessDeniedHandler
        implements AccessDeniedHandler {

    private final AuditLogService auditLogService;

    public AuditAccessDeniedHandler(
            AuditLogService auditLogService
    ) {
        this.auditLogService = auditLogService;
    }

    @Override
    public void handle(
            HttpServletRequest request,
            HttpServletResponse response,
            AccessDeniedException exception
    ) throws IOException {

        Long actorUserId = getActorUserId();

        String requestId =
                request.getHeader("X-Request-ID");

        if (requestId == null || requestId.isBlank()) {
            requestId = UUID.randomUUID().toString();
        }

        auditLogService.record(
                actorUserId,
                "AUTHORIZATION_FAILURE",
                "AUTHORIZATION",
                request.getRequestURI(),
                null,
                null,
                "User is not authorized to access this resource",
                request.getMethod(),
                request.getRequestURI(),
                getClientIp(request),
                request.getHeader("User-Agent"),
                requestId,
                AuditLog.Status.FAILURE,
                exception.getMessage()
        );

        response.setStatus(
                HttpServletResponse.SC_FORBIDDEN
        );

        response.setContentType("application/json");

        response.getWriter().write(
                """
                {
                    "error": "Access denied"
                }
                """
        );
    }

    private Long getActorUserId() {

        Authentication authentication =
                SecurityContextHolder
                        .getContext()
                        .getAuthentication();

        if (authentication == null
                || !authentication.isAuthenticated()) {
            return null;
        }

        Object principal =
                authentication.getPrincipal();

        if (principal instanceof Jwt jwt) {

            String subject = jwt.getSubject();

            if (subject != null && !subject.isBlank()) {
                return Long.valueOf(subject);
            }
        }

        return null;
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