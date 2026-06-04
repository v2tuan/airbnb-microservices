package com.bookingservice.dto.response;

import com.bookingservice.entity.AdminComplaintDecision;
import com.bookingservice.entity.ComplaintStatus;
import com.bookingservice.entity.ComplaintType;
import lombok.Builder;
import lombok.Data;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.List;
import java.util.UUID;

@Data
@Builder
public class ComplaintResponse {
    private UUID complaintId;
    private UUID bookingId;
    private UUID guestId;
    private UUID hostId;
    private UUID listingId;
    private ComplaintType type;
    private ComplaintStatus status;
    private String description;
    private List<String> evidenceUrls;
    private String hostResponse;
    private LocalDateTime hostRespondedAt;
    private LocalDateTime hostResponseDeadline;
    private LocalDateTime escalatedAt;
    private String adminNote;
    private AdminComplaintDecision adminDecision;
    private BigDecimal refundAmount;
    private LocalDateTime resolvedAt;
    private LocalDateTime closedAt;
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;
}
