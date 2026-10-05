package com.safepay.backend.repository;

import com.safepay.backend.entity.AuditLog;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.time.LocalDateTime;

public interface AuditLogRepository
        extends JpaRepository<AuditLog, Long> {

    @Query("""
            SELECT a
            FROM AuditLog a
            WHERE
                (:action IS NULL OR :action = '' OR a.action = :action)
            AND (:entityType IS NULL OR :entityType = '' OR a.entityType = :entityType)
            AND (:status IS NULL OR a.status = :status)
            AND (:actorUserId IS NULL OR a.actorUserId = :actorUserId)
            AND (:fromDate IS NULL OR a.createdAt >= :fromDate)
            AND (:toDate IS NULL OR a.createdAt < :toDate)
            AND (
                :search IS NULL
                OR :search = ''
                OR LOWER(a.action) LIKE LOWER(CONCAT('%', :search, '%'))
                OR LOWER(a.entityType) LIKE LOWER(CONCAT('%', :search, '%'))
                OR LOWER(a.entityId) LIKE LOWER(CONCAT('%', :search, '%'))
                OR LOWER(a.description) LIKE LOWER(CONCAT('%', :search, '%'))
                OR LOWER(a.errorMessage) LIKE LOWER(CONCAT('%', :search, '%'))
            )
            """)
    Page<AuditLog> searchAuditLogs(
            @Param("search") String search,
            @Param("action") String action,
            @Param("entityType") String entityType,
            @Param("status") AuditLog.Status status,
            @Param("actorUserId") Long actorUserId,
            @Param("fromDate") LocalDateTime fromDate,
            @Param("toDate") LocalDateTime toDate,
            Pageable pageable
    );
}