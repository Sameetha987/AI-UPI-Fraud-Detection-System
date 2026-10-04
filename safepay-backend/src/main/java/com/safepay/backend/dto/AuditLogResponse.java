package com.safepay.backend.dto;

import com.safepay.backend.entity.AuditLog;

import java.time.LocalDateTime;

public record AuditLogResponse(

        Long id,

        Long actorUserId,

        String action,

        String entityType,

        String entityId,

        String oldValue,

        String newValue,

        String description,

        String httpMethod,

        String endpoint,

        String ipAddress,

        String userAgent,

        String requestId,

        String status,

        String errorMessage,

        LocalDateTime createdAt
) {

    public static AuditLogResponse from(AuditLog auditLog) {

        return new AuditLogResponse(
                auditLog.getId(),
                auditLog.getActorUserId(),
                auditLog.getAction(),
                auditLog.getEntityType(),
                auditLog.getEntityId(),
                auditLog.getOldValue(),
                auditLog.getNewValue(),
                auditLog.getDescription(),
                auditLog.getHttpMethod(),
                auditLog.getEndpoint(),
                auditLog.getIpAddress(),
                auditLog.getUserAgent(),
                auditLog.getRequestId(),
                auditLog.getStatus().name(),
                auditLog.getErrorMessage(),
                auditLog.getCreatedAt()
        );
    }
}