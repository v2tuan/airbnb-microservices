package com.identityservice.repository;

import com.identityservice.entity.Account;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.Optional;

@Repository
public interface AccountRepository extends JpaRepository<Account, String> {
    Boolean existsByEmail(String email);
    Optional<Account> findByEmail(String email);
}
