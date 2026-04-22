package com.paymentservice.repository;

import com.paymentservice.entity.PaymentMethod;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Repository
public interface PaymentMethodRepository extends JpaRepository<PaymentMethod, UUID> {
    List<PaymentMethod> findByUserId(UUID userId);
    Optional<PaymentMethod> findByToken(String token);
    List<PaymentMethod> findByUserIdAndIsDefaultTrue(UUID userId);
    boolean existsByUserIdAndToken(UUID userId, String token);
}
