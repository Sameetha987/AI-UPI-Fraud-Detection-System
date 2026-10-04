package com.safepay.backend.security;

import com.safepay.backend.entity.AuditLog;
import com.safepay.backend.service.AuditLogService;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Component;
import org.springframework.web.servlet.HandlerInterceptor;

import java.util.UUID;

@Component
public class AuditLogInterceptor implements HandlerInterceptor {

    private final AuditLogService auditLogService;

    public AuditLogInterceptor(
            AuditLogService auditLogService
    ) {
        this.auditLogService = auditLogService;
    }

    @Override
    public void afterCompletion(
            HttpServletRequest request,
            HttpServletResponse response,
            Object handler,
            Exception exception
    ) {

        // Only audit API requests.
        if (!request.getRequestURI().startsWith("/api/")) {
            return;
        }

        Long actorUserId = getActorUserId();

        String method = request.getMethod();

        String endpoint = request.getRequestURI();

        String requestId = request.getHeader("X-Request-ID");

        if (requestId == null || requestId.isBlank()) {
            requestId = UUID.randomUUID().toString();
        }

        String ipAddress = getClientIp(request);

        String userAgent = request.getHeader("User-Agent");

        int statusCode = response.getStatus();

        AuditLog.Status auditStatus =
                statusCode >= 400
                        ? AuditLog.Status.FAILURE
                        : AuditLog.Status.SUCCESS;

        String action =
                method + "_" + endpoint;

        String description =
                auditStatus == AuditLog.Status.SUCCESS
                        ? "API request completed successfully"
                        : "API request failed";

        String errorMessage =
                (String) request.getAttribute(
                        "auditErrorMessage"
                );

        if (errorMessage == null && exception != null) {
            errorMessage = exception.getMessage();
        }
        auditLogService.record(
                actorUserId,
                action,
                "API_REQUEST",
                endpoint,
                null,
                null,
                description,
                method,
                endpoint,
                ipAddress,
                userAgent,
                requestId,
                auditStatus,
                errorMessage
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

        if (principal instanceof org.springframework.security.oauth2.jwt.Jwt jwt) {

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

            return forwardedFor.split(",")[0].trim();
        }

        return request.getRemoteAddr();
    }
}