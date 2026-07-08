package com.userservice.entity;

import jakarta.persistence.*;
import lombok.Data;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.UpdateTimestamp;

import java.time.LocalDateTime;
import java.util.List;
import java.util.UUID;

@Entity
@Table(name = "users", indexes = {
    @Index(name = "idx_users_created_at", columnList = "created_at"),
    @Index(name = "idx_users_account_role_created_at", columnList = "account_role, created_at")
})
@Data
public class User {
    @Id
    @GeneratedValue(strategy= GenerationType.UUID)
    private UUID userId;

    @Column(name = "keycloak_user_id", nullable = false, unique = true)
    private String keycloakUserId;

    @Column(nullable=false)
    private String firstName;

    @Column(nullable = false)
    private String lastName;

    private LocalDateTime dateOfBirth;
    private String gender;
    private String avatarUrl;
    private String bio;

    @Column(name = "stripe_account_id", unique = true)
    private String stripeAccountId;

    @Enumerated(EnumType.STRING)
    @Column(name = "stripe_account_status")
    private StripeAccountStatus stripeAccountStatus = StripeAccountStatus.NONE;

    @Enumerated(EnumType.STRING)
    @Column(name = "account_role", length = 20)
    private UserRole accountRole = UserRole.USER;

    @Column(name = "account_enabled")
    private Boolean accountEnabled = true;

    //library for postgre text[]
//    @Type(ListArrayType.class)
//    @Column(columnDefinition = "text[]")
//    private List<String> languages;

    public String getFullName() {
        return (firstName != null ? firstName : "") + " " + (lastName != null ? lastName : "");
    }

    @OneToMany(mappedBy = "user", cascade = CascadeType.ALL)
    private List<UserAddress> addresses;

    @OneToOne(mappedBy="user", cascade = CascadeType.ALL)
    private UserPreference preferences;

    @OneToOne(mappedBy = "user")
    private HostProfile hostProfile;

    @CreationTimestamp
    private LocalDateTime createdAt;

    @UpdateTimestamp
    private LocalDateTime updatedAt;
}
