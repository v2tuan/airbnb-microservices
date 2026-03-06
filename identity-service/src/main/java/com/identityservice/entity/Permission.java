package com.identityservice.entity;

import jakarta.persistence.*;
import lombok.Data;

@Entity
@Data
public class Permission {
    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    String id;

    @Column(unique = true, nullable = false)
    private String code; // ví dụ: BOOKING_READ, BOOKING_WRITE
}
