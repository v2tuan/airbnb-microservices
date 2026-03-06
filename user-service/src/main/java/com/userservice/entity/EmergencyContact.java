package com.userservice.entity;

import jakarta.persistence.*;
import lombok.Data;
import org.hibernate.annotations.CreationTimestamp;

import java.time.LocalDateTime;
import java.util.UUID;

@Entity
@Table(name = "emergency_contacts", indexes = {
    @Index(name = "idx_emergency_contacts_user", columnList = "user_id")
})
@Data
public class EmergencyContact {
  @Id
  @GeneratedValue(strategy = GenerationType.UUID)
  private UUID contactId;

  @ManyToOne(fetch = FetchType.LAZY)
  @JoinColumn(name = "user_id", nullable = false)
  private User user;

  @Column(nullable = false, length = 200)
  private String contactName;

  @Column(length = 50)
  private String relationship;

  @Column(nullable = false, length = 20)
  private String phoneNumber;

  @Column(length = 255)
  private String email;

  @CreationTimestamp
  private LocalDateTime createdAt;
}
