package com.userservice.entity;

import jakarta.persistence.*;
import lombok.Data;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.JdbcTypeCode;
import org.hibernate.annotations.UpdateTimestamp;
import org.hibernate.type.SqlTypes;

import java.time.LocalDate;
import java.util.Map;
import java.util.UUID;

//ca nhan hoa nguoi dung
@Entity
@Data
@Table(name="user_preferences", indexes = {
    @Index(name="idx_user_preferences_user", columnList = "user_id")
})
public class UserPreference {
  @Id
  @GeneratedValue(strategy = GenerationType.UUID)
  private UUID preferenceId;

  @OneToOne(fetch = FetchType.LAZY)
  @JoinColumn(name ="user_id", unique = true)
  private User user; //fk -> users(user_id) unique

  @Column(length=3)
  private String currency = "VND";

  @Column(length=10)
  private String language=  "vi";

  @Column(length = 50)
  private String timezone;

  @JdbcTypeCode(SqlTypes.JSON) //mapping JSONB
  @Column(columnDefinition = "jsonb")
  private Map<String, Object> notificationSettings;

  @CreationTimestamp
  private LocalDate createdAt;

  @UpdateTimestamp
  private LocalDate updatedAt;
}
