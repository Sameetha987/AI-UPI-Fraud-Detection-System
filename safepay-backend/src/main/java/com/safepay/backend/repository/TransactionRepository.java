package com.safepay.backend.repository;

import com.safepay.backend.entity.Transaction;
import jakarta.persistence.LockModeType;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import java.time.LocalDateTime;
import java.util.Optional;

public interface TransactionRepository
        extends JpaRepository<Transaction, Long> {

    Optional<Transaction> findByTransactionReference(
            String transactionReference
    );

    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("""
        SELECT t
        FROM Transaction t
        WHERE t.idempotencyKey = :idempotencyKey
        """)
    Optional<Transaction> findByIdempotencyKeyForUpdate(
            @Param("idempotencyKey") String idempotencyKey
    );

    boolean existsByIdempotencyKey(
            String idempotencyKey
    );

    Optional<Transaction> findByTransactionReferenceAndSenderAccountIdOrTransactionReferenceAndReceiverAccountId(
            String transactionReference1,
            Long senderAccountId,
            String transactionReference2,
            Long receiverAccountId
    );

    @Query("""
        SELECT t
        FROM Transaction t
        WHERE (
            (:type = 'SENT' AND t.senderAccount.id = :accountId)
            OR
            (:type = 'RECEIVED' AND t.receiverAccount.id = :accountId)
            OR
            (:type IS NULL AND
                (t.senderAccount.id = :accountId
                 OR t.receiverAccount.id = :accountId)
            )
        )
        AND (:status IS NULL OR t.status = :status)
        AND (:fromDate IS NULL OR t.createdAt >= :fromDate)
        AND (:toDate IS NULL OR t.createdAt < :toDate)
        ORDER BY t.createdAt DESC
        """)
    Page<Transaction> findUserTransactions(
            @Param("accountId") Long accountId,
            @Param("type") String type,
            @Param("status") Transaction.Status status,
            @Param("fromDate") LocalDateTime fromDate,
            @Param("toDate") LocalDateTime toDate,
            Pageable pageable
    );
    @Query("""
    SELECT t
    FROM Transaction t
    WHERE (:status IS NULL OR t.status = :status)
      AND (:fromDate IS NULL OR t.createdAt >= :fromDate)
      AND (:toDate IS NULL OR t.createdAt < :toDate)
    ORDER BY t.createdAt DESC
    """)
    Page<Transaction> findAllTransactions(
            @Param("status") Transaction.Status status,
            @Param("fromDate") LocalDateTime fromDate,
            @Param("toDate") LocalDateTime toDate,
            Pageable pageable
    );
}