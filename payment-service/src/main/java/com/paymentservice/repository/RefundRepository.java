package com.paymentservice.repository;

import com.paymentservice.entity.Refund;
import com.paymentservice.entity.RefundBusinessCause;
import com.paymentservice.entity.RefundStatus;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Repository
public interface RefundRepository extends JpaRepository<Refund, UUID> {

    @Query("SELECT r FROM Refund r WHERE r.originalTransaction.transactionId = :transactionId")
    List<Refund> findByOriginalTransactionId(@Param("transactionId") UUID transactionId);

    List<Refund> findByStatus(RefundStatus status);
    Optional<Refund> findByGatewayRefundId(String gatewayRefundId);
    boolean existsByBusinessCauseAndBusinessCauseId(RefundBusinessCause businessCause, UUID businessCauseId);
}

