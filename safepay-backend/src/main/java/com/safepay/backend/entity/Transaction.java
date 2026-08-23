package com.safepay.backend.entity;

import jakarta.persistence.*;
import java.math.BigDecimal;
import java.time.LocalDateTime;

@Entity
@Table(
        name = "transactions",
        indexes = {
                @Index(name = "idx_transaction_sender", columnList = "sender_account_id"),
                @Index(name = "idx_transaction_receiver", columnList = "receiver_account_id"),
                @Index(name = "idx_transaction_created_at", columnList = "created_at"),
                @Index(name = "idx_transaction_status", columnList = "status")
        }
)
public class Transaction {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    // Account sending the money
    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(
            name = "sender_account_id",
            nullable = false
    )
    private Account senderAccount;

    // Account receiving the money
    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(
            name = "receiver_account_id",
            nullable = false
    )
    private Account receiverAccount;

    @Column(
            nullable = false,
            precision = 19,
            scale = 2
    )
    private BigDecimal amount;

    @Column(
            nullable = false,
            length = 3
    )
    private String currency = "INR";

    @Enumerated(EnumType.STRING)
    @Column(
            nullable = false,
            length = 20
    )
    private Status status = Status.PENDING;

    @Column(
            name = "transaction_reference",
            nullable = false,
            unique = true,
            length = 50
    )
    private String transactionReference;

    @Column(
            name = "idempotency_key",
            unique = true,
            length = 100
    )
    private String idempotencyKey;

    @Column(
            name = "description",
            length = 255
    )
    private String description;

    @Column(
            name = "created_at",
            nullable = false
    )
    private LocalDateTime createdAt;

    @Column(
            name = "completed_at"
    )
    private LocalDateTime completedAt;

    @PrePersist
    protected void onCreate() {
        createdAt = LocalDateTime.now();
    }

    public enum Status {
        PENDING,
        SUCCESS,
        FAILED,
        CANCELLED
    }

    public Long getId() {
        return id;
    }

    public Account getSenderAccount() {
        return senderAccount;
    }

    public void setSenderAccount(Account senderAccount) {
        this.senderAccount = senderAccount;
    }

    public Account getReceiverAccount() {
        return receiverAccount;
    }

    public void setReceiverAccount(Account receiverAccount) {
        this.receiverAccount = receiverAccount;
    }

    public BigDecimal getAmount() {
        return amount;
    }

    public void setAmount(BigDecimal amount) {
        this.amount = amount;
    }

    public String getCurrency() {
        return currency;
    }

    public void setCurrency(String currency) {
        this.currency = currency;
    }

    public Status getStatus() {
        return status;
    }

    public void setStatus(Status status) {
        this.status = status;
    }

    public String getTransactionReference() {
        return transactionReference;
    }

    public void setTransactionReference(String transactionReference) {
        this.transactionReference = transactionReference;
    }

    public String getIdempotencyKey() {
        return idempotencyKey;
    }

    public void setIdempotencyKey(String idempotencyKey) {
        this.idempotencyKey = idempotencyKey;
    }

    public String getDescription() {
        return description;
    }

    public void setDescription(String description) {
        this.description = description;
    }

    public LocalDateTime getCreatedAt() {
        return createdAt;
    }

    public LocalDateTime getCompletedAt() {
        return completedAt;
    }

    public void setCompletedAt(LocalDateTime completedAt) {
        this.completedAt = completedAt;
    }
}