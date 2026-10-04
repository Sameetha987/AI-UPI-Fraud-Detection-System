package com.safepay.backend.service;

import com.safepay.backend.entity.AuditLog;
import com.safepay.backend.repository.AuditLogRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Propagation;
import org.springframework.transaction.annotation.Transactional;

@Service
public class AuditLogService {

    private final AuditLogRepository auditLogRepository;
    private final AuditContextService auditContextService;
    public AuditLogService(
            AuditLogRepository auditLogRepository, AuditContextService auditContextService
    ) {
        this.auditLogRepository = auditLogRepository;
        this.auditContextService = auditContextService;
    }

    @Transactional(propagation = Propagation.REQUIRES_NEW)
    public AuditLog record(
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
            AuditLog.Status status,
            String errorMessage
    ) {

        AuditLog auditLog = new AuditLog();

        auditLog.setActorUserId(actorUserId);
        auditLog.setAction(action);
        auditLog.setEntityType(entityType);
        auditLog.setEntityId(entityId);

        auditLog.setOldValue(oldValue);
        auditLog.setNewValue(newValue);

        auditLog.setDescription(description);

        auditLog.setHttpMethod(httpMethod);
        auditLog.setEndpoint(endpoint);

        auditLog.setIpAddress(ipAddress);
        auditLog.setUserAgent(userAgent);
        auditLog.setRequestId(requestId);

        auditLog.setStatus(status);
        auditLog.setErrorMessage(errorMessage);

        return auditLogRepository.save(auditLog);
    }
    @Transactional(propagation = Propagation.REQUIRES_NEW)
    public AuditLog recordBusinessEvent(
            Long actorUserId,
            String action,
            String entityType,
            String entityId,
            String oldValue,
            String newValue,
            String description
    ) {

        AuditLog auditLog = new AuditLog();

        auditLog.setActorUserId(actorUserId);
        auditLog.setAction(action);
        auditLog.setEntityType(entityType);
        auditLog.setEntityId(entityId);

        auditLog.setOldValue(oldValue);
        auditLog.setNewValue(newValue);

        auditLog.setDescription(description);

        auditLog.setHttpMethod(
                auditContextService.getHttpMethod()
        );

        auditLog.setEndpoint(
                auditContextService.getEndpoint()
        );

        auditLog.setIpAddress(
                auditContextService.getIpAddress()
        );

        auditLog.setUserAgent(
                auditContextService.getUserAgent()
        );

        auditLog.setRequestId(
                auditContextService.getRequestId()
        );

        auditLog.setStatus(
                AuditLog.Status.SUCCESS
        );

        return auditLogRepository.save(auditLog);
    }
    @Transactional(propagation = Propagation.REQUIRES_NEW)
    public AuditLog recordBusinessFailure(
            Long actorUserId,
            String action,
            String entityType,
            String entityId,
            String description,
            String errorMessage
    ) {

        AuditLog auditLog = new AuditLog();

        auditLog.setActorUserId(actorUserId);
        auditLog.setAction(action);
        auditLog.setEntityType(entityType);
        auditLog.setEntityId(entityId);

        auditLog.setDescription(description);

        auditLog.setHttpMethod(
                auditContextService.getHttpMethod()
        );

        auditLog.setEndpoint(
                auditContextService.getEndpoint()
        );

        auditLog.setIpAddress(
                auditContextService.getIpAddress()
        );

        auditLog.setUserAgent(
                auditContextService.getUserAgent()
        );

        auditLog.setRequestId(
                auditContextService.getRequestId()
        );

        auditLog.setStatus(
                AuditLog.Status.FAILURE
        );

        auditLog.setErrorMessage(errorMessage);

        return auditLogRepository.save(auditLog);
    }
}