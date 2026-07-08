package com.userservice.repository;

import com.userservice.dto.projection.AdminUserRow;
import com.userservice.entity.User;
import com.userservice.entity.UserRole;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
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

  Page<User> findByAccountRole(UserRole accountRole, Pageable pageable);

  @Query("select u from User u where u.accountRole is null or u.accountRole = :role")
  Page<User> findByAccountRoleOrNull(@Param("role") UserRole role, Pageable pageable);

  @Query(
      value = """
          select
            u.userId as userId,
            u.keycloakUserId as keycloakUserId,
            u.firstName as firstName,
            u.lastName as lastName,
            u.avatarUrl as avatarUrl,
            u.gender as gender,
            case when h.hostProfileId is null then false else true end as host,
            h.isSuperhost as superhost,
            u.accountEnabled as accountEnabled,
            u.accountRole as accountRole,
            h.verificationStatus as hostVerificationStatus,
            u.stripeAccountStatus as stripeAccountStatus,
            u.createdAt as createdAt,
            u.updatedAt as updatedAt
          from User u
          left join HostProfile h on h.user = u
          order by u.createdAt desc
          """,
      countQuery = "select count(u) from User u"
  )
  Page<AdminUserRow> findAdminUserRows(Pageable pageable);

  @Query(
      value = """
          select
            u.userId as userId,
            u.keycloakUserId as keycloakUserId,
            u.firstName as firstName,
            u.lastName as lastName,
            u.avatarUrl as avatarUrl,
            u.gender as gender,
            case when h.hostProfileId is null then false else true end as host,
            h.isSuperhost as superhost,
            u.accountEnabled as accountEnabled,
            u.accountRole as accountRole,
            h.verificationStatus as hostVerificationStatus,
            u.stripeAccountStatus as stripeAccountStatus,
            u.createdAt as createdAt,
            u.updatedAt as updatedAt
          from User u
          left join HostProfile h on h.user = u
          where u.accountRole = :role
          order by u.createdAt desc
          """,
      countQuery = "select count(u) from User u where u.accountRole = :role"
  )
  Page<AdminUserRow> findAdminUserRowsByRole(@Param("role") UserRole role, Pageable pageable);

  @Query(
      value = """
          select
            u.userId as userId,
            u.keycloakUserId as keycloakUserId,
            u.firstName as firstName,
            u.lastName as lastName,
            u.avatarUrl as avatarUrl,
            u.gender as gender,
            case when h.hostProfileId is null then false else true end as host,
            h.isSuperhost as superhost,
            u.accountEnabled as accountEnabled,
            u.accountRole as accountRole,
            h.verificationStatus as hostVerificationStatus,
            u.stripeAccountStatus as stripeAccountStatus,
            u.createdAt as createdAt,
            u.updatedAt as updatedAt
          from User u
          left join HostProfile h on h.user = u
          where u.accountRole is null or u.accountRole = :role
          order by u.createdAt desc
          """,
      countQuery = "select count(u) from User u where u.accountRole is null or u.accountRole = :role"
  )
  Page<AdminUserRow> findAdminUserRowsByRoleOrNull(@Param("role") UserRole role, Pageable pageable);
}
