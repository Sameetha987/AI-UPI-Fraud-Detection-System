package com.safepay.backend.controller;

import com.safepay.backend.entity.AuditLog;
import com.safepay.backend.service.AuditLogService;
import org.springframework.data.domain.Page;
import org.springframework.http.ResponseEntity;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;

import java.nio.charset.StandardCharsets;
import java.time.LocalDate;
import java.time.LocalDateTime;

@RestController
@RequestMapping("/api/admin/audit-logs")
public class AuditLogController {

    private final AuditLogService auditLogService;

    public AuditLogController(
            AuditLogService auditLogService
    ) {
        this.auditLogService = auditLogService;
    }

    @GetMapping
    public ResponseEntity<Page<AuditLog>> searchAuditLogs(

            @RequestParam(required = false)
            String search,

            @RequestParam(required = false)
            String action,

            @RequestParam(required = false)
            String entityType,

            @RequestParam(required = false)
            AuditLog.Status status,

            @RequestParam(required = false)
            Long actorUserId,

            @RequestParam(required = false)
            LocalDate fromDate,

            @RequestParam(required = false)
            LocalDate toDate,

            @RequestParam(defaultValue = "0")
            int page,

            @RequestParam(defaultValue = "20")
            int size,

            @AuthenticationPrincipal Jwt jwt
    ) {

        LocalDateTime fromDateTime = null;
        LocalDateTime toDateTime = null;

        if (fromDate != null) {
            fromDateTime =
                    fromDate.atStartOfDay();
        }

        if (toDate != null) {
            toDateTime =
                    toDate.plusDays(1).atStartOfDay();
        }

        Page<AuditLog> result =
                auditLogService.searchAuditLogs(
                        search,
                        action,
                        entityType,
                        status,
                        actorUserId,
                        fromDateTime,
                        toDateTime,
                        page,
                        size
                );

        return ResponseEntity.ok(result);
    }

    @GetMapping("/export")
    public ResponseEntity<byte[]> exportAuditLogs(

            @RequestParam(required = false)
            String search,

            @RequestParam(required = false)
            String action,

            @RequestParam(required = false)
            String entityType,

            @RequestParam(required = false)
            AuditLog.Status status,

            @RequestParam(required = false)
            Long actorUserId,

            @RequestParam(required = false)
            LocalDate fromDate,

            @RequestParam(required = false)
            LocalDate toDate,

            @AuthenticationPrincipal Jwt jwt
    ) {

        LocalDateTime fromDateTime = null;
        LocalDateTime toDateTime = null;

        if (fromDate != null) {
            fromDateTime = fromDate.atStartOfDay();
        }

        if (toDate != null) {
            toDateTime =
                    toDate.plusDays(1).atStartOfDay();
        }

        java.util.List<AuditLog> logs =
                auditLogService.exportAuditLogs(
                        search,
                        action,
                        entityType,
                        status,
                        actorUserId,
                        fromDateTime,
                        toDateTime
                );

        StringBuilder csv = new StringBuilder();

        csv.append(
                "ID,Actor User ID,Action,Entity Type,Entity ID,"
                        + "Old Value,New Value,Description,"
                        + "HTTP Method,Endpoint,IP Address,User Agent,"
                        + "Request ID,Status,Error Message,Created At\n"
        );

        for (AuditLog log : logs) {

            csv.append(csvValue(log.getId()))
                    .append(",")
                    .append(csvValue(log.getActorUserId()))
                    .append(",")
                    .append(csvValue(log.getAction()))
                    .append(",")
                    .append(csvValue(log.getEntityType()))
                    .append(",")
                    .append(csvValue(log.getEntityId()))
                    .append(",")
                    .append(csvValue(log.getOldValue()))
                    .append(",")
                    .append(csvValue(log.getNewValue()))
                    .append(",")
                    .append(csvValue(log.getDescription()))
                    .append(",")
                    .append(csvValue(log.getHttpMethod()))
                    .append(",")
                    .append(csvValue(log.getEndpoint()))
                    .append(",")
                    .append(csvValue(log.getIpAddress()))
                    .append(",")
                    .append(csvValue(log.getUserAgent()))
                    .append(",")
                    .append(csvValue(log.getRequestId()))
                    .append(",")
                    .append(csvValue(log.getStatus()))
                    .append(",")
                    .append(csvValue(log.getErrorMessage()))
                    .append(",")
                    .append(csvValue(log.getCreatedAt()))
                    .append("\n");
        }

        byte[] csvBytes =
                csv.toString()
                        .getBytes(StandardCharsets.UTF_8);

        return ResponseEntity.ok()
                .header(
                        HttpHeaders.CONTENT_DISPOSITION,
                        "attachment; filename=audit_logs.csv"
                )
                .contentType(
                        MediaType.parseMediaType(
                                "text/csv"
                        )
                )
                .body(csvBytes);
    }
    private String csvValue(Object value) {

        if (value == null) {
            return "";
        }

        String text = String.valueOf(value);

        text = text.replace(
                "\"",
                "\"\""
        );

        return "\"" + text + "\"";
    }
}