package com.bookingservice.scheduler;

import com.bookingservice.service.BookingService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;

@Component
@RequiredArgsConstructor
@Slf4j
public class BookingExpirationScheduler {
    private final BookingService bookingService;

    @Scheduled(fixedDelayString = "${booking.expiration-scheduler-delay-ms:60000}")
    public void expirePendingBookings() {
        int expired = bookingService.expirePendingBookings();
        if (expired > 0) {
            log.info("Expired {} pending bookings", expired);
        }
    }
}
