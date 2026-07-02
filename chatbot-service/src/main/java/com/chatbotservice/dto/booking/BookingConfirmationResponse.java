package com.chatbotservice.dto.booking;

import java.math.BigDecimal;
import java.time.LocalDate;

/**
 * Payload co cau truc de frontend render card xac nhan dat phong trong chatbot.
 * Day chi la booking intent/preview, chua tao Booking va chua tao Stripe PaymentIntent.
 */
public record BookingConfirmationResponse(
        String listingId,
        String title,
        String imageUrl,
        String location,
        String city,
        String country,
        Integer maxGuests,
        String roomType,
        String propertyType,
        LocalDate checkInDate,
        LocalDate checkOutDate,
        long totalNights,
        Integer numberOfAdults,
        Integer numberOfChildren,
        Integer numberOfInfants,
        Integer numberOfPets,
        String guestNotes,
        String currency,
        BigDecimal nightlyPrice,
        BigDecimal accommodationSubtotal,
        BigDecimal cleaningFee,
        BigDecimal serviceFee,
        BigDecimal taxes,
        long estimatedTotalAmount,
        String cancellationPolicyCode
) {
}
