package com.userservice.entity;

import io.hypersistence.utils.hibernate.type.array.ListArrayType;
import jakarta.persistence.*;
import lombok.Data;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.Type;
import org.hibernate.annotations.UpdateTimestamp;

import java.time.LocalDateTime;
import java.util.List;
import java.util.UUID;

@Entity
@Table(name="users")
@Data
public class User {
    @Id
    @GeneratedValue(strategy= GenerationType.UUID)
    private UUID userId;

    @Column(nullable=false)
    private String firstName;

    @Column(nullable = false)
    private String lastName;

    private LocalDateTime dateOfBirth;
    private String gender;
    private String avatarUrl;
    private String bio;

    //library for postgre text[]
    @Type(ListArrayType.class)
    @Column(columnDefinition = "text[]")
    private List<String> languages;

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