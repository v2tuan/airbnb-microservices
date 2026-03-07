package com.userservice.repository;

import com.userservice.entity.UserAddress;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.UUID;

@Repository
public interface UserAddressRepository extends JpaRepository<UserAddress, UUID> {
  List<UserAddress> findByUserUserId(UUID userUserId);

  @Query("UPDATE UserAddress a SET a.isDefault = false WHERE a.user.userId = :userId")
  @Modifying
  void resetDefaultAddress(UUID userId);
}
