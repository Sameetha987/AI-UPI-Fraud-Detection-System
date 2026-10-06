package com.safepay.backend.repository;

import com.safepay.backend.entity.PaymentRequest;
import jakarta.persistence.LockModeType;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;
import java.util.Optional;

public interface PaymentRequestRepository
        extends JpaRepository<PaymentRequest, Long> {

    Optional<PaymentRequest> findByPaymentReference(
            String paymentReference
    );

    List<PaymentRequest> findByMerchantIdOrderByCreatedAtDesc(
            Long merchantId
    );

    boolean existsByPaymentReference(
            String paymentReference
    );

    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("""
    SELECT p
    FROM PaymentRequest p
    WHERE p.paymentReference = :paymentReference
""")
    Optional<PaymentRequest> findByPaymentReferenceForUpdate(
            @Param("paymentReference")
            String paymentReference
    );
}