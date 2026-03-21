package com.listingservice.dto.response;

import lombok.Data;

import java.math.BigDecimal;
import java.time.Instant;
import java.time.LocalDate;
import java.util.List;
import java.util.UUID;

@Data
public class CompositeListingResponse {
  private UUID listingId;
  private String title;
  private String description;
  private BigDecimal pricePerNight;
  private String location;
  private List<String> photos;
  private Instant createdAt;

  private HostProfileData host;
  private AvailabilityData availability;
  private PriceQuoteData pricing;
  private BookingRequestData request;

  @Data public static class HostProfileData {
    private UUID userId;
    private String fullName;
    private String avatarUrl;
    private Boolean superHost;
    private Instant joinedAt;
  }

  @Data public static class AvailabilityData {
    private Boolean available;
    private Integer nights;
  }

  @Data public static class PriceQuoteData {
    private BigDecimal basePrice;
    private BigDecimal cleaningFee;
    private BigDecimal serviceFee;
    private BigDecimal totalPrice;
  }

  @Data public static class BookingRequestData {
    private LocalDate checkIn;
    private LocalDate checkOut;
    private Integer adults;
    private Integer children;
    private Integer infants;
    private Integer pets;
    private Integer guests;
  }
}
