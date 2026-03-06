package com.userservice.entity;

import jakarta.persistence.*;
import lombok.Data;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.UpdateTimestamp;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.UUID;

//fectType.lazy: Mình sử dụng LAZY để tránh việc mỗi khi load User là Hibernate tự động kéo theo tất cả địa chỉ, preferences... gây chậm hệ thống (vấn đề N+1).
@Entity
@Data
@Table(name = "host_profiles", indexes = {
    @Index(name = "idx_host_profiles_user", columnList = "user_id"),
    @Index(name = "idx_host_profiles_superhost", columnList = "is_superhost")
})
public class HostProfile {
  @Id
  @GeneratedValue(strategy = GenerationType.UUID)
  private UUID hostProfileId;

  @OneToOne(fetch = FetchType.LAZY)
  @JoinColumn(name = "user_id", unique = true)
  private User user;

  private Boolean isSuperhost = false;

  @Column(precision = 5, scale = 2)
  private BigDecimal responseRate;

  private Integer responseTime; //tinh bang phut

  @Column(length = 50)
  private String verificationStatus;

  private Boolean governmentIdVerified = false; //cccd

  @Column(nullable = false)
  private LocalDateTime joinedAsHostAt;

  @CreationTimestamp
  private LocalDateTime createdAt;

  @UpdateTimestamp
  private LocalDateTime updatedAt;
}