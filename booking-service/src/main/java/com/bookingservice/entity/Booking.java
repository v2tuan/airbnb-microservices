package com.bookingservice.entity;

import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.GenericGenerator;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.UUID;

@Entity
@Table(
        name = "bookings",
        indexes = {
                // Index phục vụ query theo listing (check availability)
//                @Index(name = "idx_bookings_listing", columnList = "listing_id"),

                // Index phục vụ query lịch sử booking của guest
                @Index(name = "idx_bookings_guest", columnList = "guest_id"),

                // Index phục vụ host xem booking của mình
//                @Index(name = "idx_bookings_host", columnList = "host_id"),

                // Index theo status (filter booking)
                @Index(name = "idx_bookings_status", columnList = "status"),

                // Index quan trọng cho check availability
//                @Index(
//                        name = "idx_bookings_dates",
//                        columnList = "listing_id, check_in_date, check_out_date"
//                )
        }
)
@Getter
@Setter
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class Booking {
    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    @Column(name = "booking_id")
    private UUID bookingId;

    /**
     * Stripe PaymentIntent ID - lưu để đối chiếu payment
     */
    @Column(name = "payment_intent_id")
    private String paymentIntentId;

    /**
     * ID của listing (thuộc Listing Service)
     * Không join DB → chỉ lưu reference
     */
    @Column(name = "listing_id", nullable = false)
    private UUID listingId;

//    @Column(name = "room_id", nullable = false)
//    private UUID roomId;

    /**
     * ID của guest (User Service)
     */
    @Column(name = "guest_id", nullable = false)
    private UUID guestId;

    /**
     * ID của host (User Service)
     */
    @Column(name = "host_id")
    private UUID hostId;

    /**
     * Ngày check-in
     */
    @Column(name = "check_in_date", nullable = false)
    private LocalDate checkInDate;

    /**
     * Ngày check-out
     */
    @Column(name = "check_out_date", nullable = false)
    private LocalDate checkOutDate;

    /**
     * Thời điểm booking hết hạn (createdAt + 15 phút)
     */
    @Column(name = "expires_at", nullable = false)
    private LocalDateTime expiresAt;

    /**
     * Số đêm ở
     */
    @Column(name = "total_nights")
    private Integer totalNights;

    /**
     * Tổng số khách
     */
//    @Column(name = "num_guests", nullable = false)
//    private Integer numGuests;

    /**
     * Số người lớn
     */
    @Column(name = "num_adults")
    private Integer numAdults;

    /**
     * Số trẻ em (default = 0)
     */
    @Column(name = "num_children")
    private Integer numChildren = 0;

    /**
     * Số em bé (default = 0)
     */
    @Column(name = "num_infants")
    private Integer numInfants = 0;

    @Column(name = "num_pets")
    private Integer numPets = 0;

    /**
     * Trạng thái booking
     * Lưu dưới dạng STRING trong DB (dễ đọc, dễ debug)
     */
    @Enumerated(EnumType.STRING)
    @Column(name = "status", nullable = false)
    @Builder.Default
    private BookingStatus status = BookingStatus.PENDING_PAYMENT;

    /**
     * Tổng tiền (bao gồm tất cả phí)
     */
    @Column(name = "total_price", nullable = false, precision = 10, scale = 2)
    private long totalPrice;

    /**
     * Giá phòng cơ bản
     */
//    @Column(name = "base_price", nullable = false, precision = 10, scale = 2)
//    private BigDecimal basePrice;

    /**
     * Phí dọn dẹp
     */
    @Column(name = "cleaning_fee", precision = 10, scale = 2)
    private BigDecimal cleaningFee = BigDecimal.ZERO;

    /**
     * Phí dịch vụ (platform fee)
     */
    @Column(name = "service_fee", precision = 10, scale = 2)
    private BigDecimal serviceFee = BigDecimal.ZERO;

    /**
     * Loại tiền tệ (VD: VND, USD)
     */
    @Column(name = "currency", length = 3)
    private String currency = "VND";

//    /**
//     * Yêu cầu đặc biệt của khách
//     */
//    @Column(name = "special_requests", columnDefinition = "TEXT")
//    private String specialRequests;

    /**
     * Ghi chú thêm của khách
     */
    @Column(name = "guest_notes", length = 500)
    private String guestNotes;

//    /**
//     * Chính sách hủy (flexible, strict, ...)
//     */
//    @Column(name = "cancellation_policy", nullable = false)
//    private String cancellationPolicy;
//
//    /**
//     * Thời điểm booking được xác nhận
//     */
//    @Column(name = "confirmed_at")
//    private LocalDateTime confirmedAt;
//
//    /**
//     * Thời điểm bị hủy
//     */
//    @Column(name = "cancelled_at")
//    private LocalDateTime cancelledAt;
//
//    /**
//     * Thời điểm hoàn thành (sau checkout)
//     */
//    @Column(name = "completed_at")
//    private LocalDateTime completedAt;

    /**
     * Thời điểm thanh toán thành công
     */
    @Column(name = "paid_at")
    private LocalDateTime paidAt;

    /**
     * Thời điểm tạo record
     */
    @Column(name = "created_at", nullable = false, updatable = false)
    private LocalDateTime createdAt;

    /**
     * Thời điểm update gần nhất
     */
    @Column(name = "updated_at", nullable = false)
    private LocalDateTime updatedAt;

    // =========================
    // Lifecycle hooks
    // =========================

    /**
     * Hàm này chạy trước khi insert vào DB
     */
    @PrePersist
    protected void onCreate() {
        LocalDateTime now = LocalDateTime.now();

        this.createdAt = now;
        this.updatedAt = now;
        // Booking hết hạn sau 15 phút nếu không thanh toán
        this.expiresAt = this.createdAt.plusMinutes(15);

        // Set default nếu null (tránh null pointer)
        if (this.currency == null) this.currency = "VND";
        if (this.numChildren == null) this.numChildren = 0;
        if (this.numInfants == null) this.numInfants = 0;
        if (this.cleaningFee == null) this.cleaningFee = BigDecimal.ZERO;
        if (this.serviceFee == null) this.serviceFee = BigDecimal.ZERO;
    }

    /**
     * Hàm này chạy trước khi update
     */
    @PreUpdate
    protected void onUpdate() {
        this.updatedAt = LocalDateTime.now();
    }
}
