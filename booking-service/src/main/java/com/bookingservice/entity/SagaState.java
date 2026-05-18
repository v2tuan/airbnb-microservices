package com.bookingservice.entity;

import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.UpdateTimestamp;

import java.time.LocalDateTime;
import java.util.UUID;

// Bảng này lưu trạng thái của từng saga instance
// Mục đích: biết saga đang ở bước nào, để retry hoặc compensate đúng chỗ
@Entity
@Table(name = "saga_state")
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class SagaState {

    @Id
    @Column(name = "saga_id")
    private UUID sagaId;

    @Column(name = "booking_id", nullable = false)
    private UUID bookingId;

    // Bước hiện tại: "RESERVE_ROOM", "PROCESS_PAYMENT", "SPLIT_PAYOUT"
    @Column(name = "current_step", nullable = false)
    private String currentStep;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private SagaStatus status;

    // Lưu payload JSON để sau này có thể xem lại/debug
    // Ví dụ: {"bookingId": "...", "amount": 150.00, "userId": "..."}
    @Column(columnDefinition = "jsonb")
    private String payload;

    @CreationTimestamp
    @Column(name = "created_at", updatable = false)
    private LocalDateTime createdAt;

    @UpdateTimestamp
    @Column(name = "updated_at")
    private LocalDateTime updatedAt;
}
