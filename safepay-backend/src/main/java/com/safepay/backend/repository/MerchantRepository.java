package com.safepay.backend.repository;

import com.safepay.backend.entity.Merchant;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;

public interface MerchantRepository
        extends JpaRepository<Merchant, Long> {

    Optional<Merchant> findByUserId(Long userId);

    boolean existsByUserId(Long userId);

    boolean existsByBusinessName(String businessName);
}