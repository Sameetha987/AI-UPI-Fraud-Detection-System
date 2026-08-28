package com.safepay.backend.entity;

import jakarta.persistence.*;

import java.math.BigDecimal;
import java.time.LocalDateTime;

@Entity
@Table(
        name = "payment_requests",
        indexes = {
                @Index(
                        name = "idx_payment_request_merchant",
                        columnList = "merchant_id"
                ),
                @Index(
                        name = "idx_payment_request_reference",
                        columnList = "payment_reference"
                ),
                @Index(
                        name = "idx_payment_request_status",
                        columnList = "status"
                )
        }
)
public class PaymentRequest {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(
            name = "merchant_id",
            nullable = false
    )
    private Merchant merchant;

    @Column(
            name = "payment_reference",
            nullable = false,
            unique = true,
            length = 50
    )
    private String paymentReference;

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

    @Column(length = 255)
    private String description;

    @Enumerated(EnumType.STRING)
    @Column(
            nullable = false,
            length = 20
    )
    private Status status = Status.PENDING;

    @Column(name = "created_at", nullable = false)
    private LocalDateTime createdAt;

    @Column(name = "paid_at")
    private LocalDateTime paidAt;

    @PrePersist
    protected void onCreate() {
        createdAt = LocalDateTime.now();

        if (currency == null) {
            currency = "INR";
        }

        if (status == null) {
            status = Status.PENDING;
        }
    }

    public enum Status {
        PENDING,
        PAID,
        EXPIRED,
        CANCELLED
    }

    public Long getId() {
        return id;
    }

    public Merchant getMerchant() {
        return merchant;
    }

    public void setMerchant(Merchant merchant) {
        this.merchant = merchant;
    }

    public String getPaymentReference() {
        return paymentReference;
    }

    public void setPaymentReference(String paymentReference) {
        this.paymentReference = paymentReference;
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

    public String getDescription() {
        return description;
    }

    public void setDescription(String description) {
        this.description = description;
    }

    public Status getStatus() {
        return status;
    }

    public void setStatus(Status status) {
        this.status = status;
    }

    public LocalDateTime getCreatedAt() {
        return createdAt;
    }

    public LocalDateTime getPaidAt() {
        return paidAt;
    }

    public void setPaidAt(LocalDateTime paidAt) {
        this.paidAt = paidAt;
    }
}