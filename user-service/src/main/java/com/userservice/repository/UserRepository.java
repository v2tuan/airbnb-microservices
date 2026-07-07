package com.userservice.repository;

import com.userservice.entity.User;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Repository
public interface UserRepository extends JpaRepository<User, UUID> {
  @Query("Select u from User u LEFT JOIN FETCH u.addresses WHERE u.userId = :id ")
  Optional<User> findByIdWithAddresses(UUID id);

  Optional<User> findByKeycloakUserId(String keycloakUserId);

  List<User> findByKeycloakUserIdIn(List<String> keycloakUserIds);

  Page<User> findByKeycloakUserIdIn(List<String> keycloakUserIds, Pageable pageable);

  Page<User> findByKeycloakUserIdNotIn(List<String> keycloakUserIds, Pageable pageable);
}
