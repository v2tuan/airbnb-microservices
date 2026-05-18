package com.bookingservice.entity;

import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import org.hibernate.annotations.CreationTimestamp;

import java.time.LocalDateTime;
import java.util.UUID;

/**
 * Transactional Outbox Pattern: thay vì publish Kafka trực tiếp,
 * ta ghi vào bảng này trong cùng DB transaction với booking.
 * Một background job sẽ đọc bảng này và publish lên Kafka.
 * Lý do: nếu app crash sau khi commit DB nhưng trước khi publish Kafka,
 * event sẽ BỊ MẤT. Với outbox, event nằm trong DB và sẽ được retry.
 **/
@Entity
@Table(name = "outbox_events")
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class OutboxEvent {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @Column(name = "saga_id")
    private UUID sagaId;

    // Tên event để outbox poller biết publish lên topic nào
    @Column(name = "event_type", nullable = false)
    private String eventType; // "BOOKING_SAGA_STARTED", "ROOM_RESERVATION_COMMAND"...

    // Payload JSON (serialize từ event object)
    @Column(nullable = false, columnDefinition = "jsonb")
    private String payload;

    // false = chưa publish, true = đã publish lên Kafka thành công
    @Column(nullable = false)
    @Builder.Default
    private Boolean published = false;

    @CreationTimestamp
    @Column(name = "created_at", updatable = false)
    private LocalDateTime createdAt;
}
