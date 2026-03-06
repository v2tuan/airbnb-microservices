package com.identityservice.entity;

import jakarta.persistence.*;
import lombok.*;
import lombok.experimental.FieldDefaults;

import java.util.List;
import java.util.Set;

@Data
@EqualsAndHashCode(callSuper = true)
@Builder // Dùng builder cần có các constructor phù hợp để tạo object
@AllArgsConstructor
@NoArgsConstructor
@FieldDefaults(level = AccessLevel.PRIVATE)
@Entity(name = "accounts") // database không để tên là user vi trùng syntax
public class Account extends BaseEntity {
    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    String id;

    String email;
    String phoneNumber;
    String password;
    Boolean isActive;
    Boolean isVerified;
    boolean enabled = true;

    @ManyToMany
    @JoinTable(name = "user_roles",
            joinColumns = @JoinColumn(name = "user_id"),
            inverseJoinColumns = @JoinColumn(name = "role_id"))
    Set<Role> roles;
}
