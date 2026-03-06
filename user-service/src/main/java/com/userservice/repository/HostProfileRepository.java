package com.userservice.repository;

import com.userservice.entity.HostProfile;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Repository
public interface HostProfileRepository extends JpaRepository<HostProfile, UUID> {
  Optional<HostProfile> findByUserId(UUID userId);
  List<HostProfile> findByIsSuperhostTrue(); // Lấy danh sách các Superhost
}
