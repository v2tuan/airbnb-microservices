package com.userservice.entity;

import jakarta.persistence.*;
import lombok.Data;
import org.hibernate.annotations.CreationTimestamp;

import java.time.LocalDate;
import java.util.UUID;

@Entity
@Data
@Table(name="user_addresses", indexes = {
    @Index(name="idx_user_addresses_user", columnList = "user_id")
})
public class UserAddress {
  @Id
  @GeneratedValue(strategy= GenerationType.UUID)
  private UUID addressId;

  @ManyToOne(fetch = FetchType.LAZY)
  @JoinColumn(name="user_id", nullable = false)
  private User user; //FK -> users(user_id)

  @Column(nullable = false, length= 50)
  private String addressType; //home, work

  @Column(nullable = false, length = 255)
  private String streetAddress;

  @Column(nullable = false, length = 100)
  private String city;

  @Column(length =100)
  private String state;

  @Column(nullable = false, length=100)
  private String country;

  @Column(length=20)
  private String postalCode;

  private Boolean isDefault = false;

  @CreationTimestamp
  @Column(nullable = false, updatable=false)
  private LocalDate createdAt;
}
