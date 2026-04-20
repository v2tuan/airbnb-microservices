package com.paymentservice.repository;

import com.paymentservice.entity.PlatformFee;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.time.LocalDate;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Repository
public interface PlatformFeeRepository extends JpaRepository<PlatformFee, UUID> {
    List<PlatformFee> findByFeeType(String feeType);
    Optional<PlatformFee> findByFeeTypeAndIsActiveTrue(String feeType);
    List<PlatformFee> findByEffectiveFromBeforeAndIsActiveTrue(LocalDate date);
}
