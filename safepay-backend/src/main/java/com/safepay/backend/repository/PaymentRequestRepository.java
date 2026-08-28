package com.safepay.backend.repository;

import com.safepay.backend.entity.PaymentRequest;
import org.springframework.data.jpa.repository.JpaRepository;

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
}