package com.paymentservice.repository;

import com.paymentservice.entity.Transaction;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Repository
public interface TransactionRepository extends JpaRepository<Transaction, UUID> {
    List<Transaction> findByBookingId(UUID bookingId);
    List<Transaction> findByPayerId(UUID payerId);
    List<Transaction> findByPayeeId(UUID payeeId);
    List<Transaction> findByStatus(String status);
    Optional<Transaction> findByGatewayTransactionId(String gatewayTransactionId);
    long countByStatus(String status);
}
