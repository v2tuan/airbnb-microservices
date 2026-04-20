package com.paymentservice.repository;

import com.paymentservice.entity.PaymentAuditLog;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.time.LocalDateTime;
import java.util.List;
import java.util.UUID;

@Repository
public interface PaymentAuditLogRepository extends JpaRepository<PaymentAuditLog, UUID> {

    @Query("SELECT p FROM PaymentAuditLog p WHERE p.transaction.transactionId = :transactionId")
    List<PaymentAuditLog> findByTransactionId(@Param("transactionId") UUID transactionId);

    List<PaymentAuditLog> findByAction(String action);
    List<PaymentAuditLog> findByCreatedAtBetween(LocalDateTime start, LocalDateTime end);
}

