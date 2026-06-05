package com.listingservice.service.Impl;

import com.listingservice.dto.request.AvailabilityRequest;
import com.listingservice.dto.response.AvailabilityResponse;
import com.listingservice.entity.AvailabilityCalendar;
import com.listingservice.entity.Listing;
import com.listingservice.exception.AppException;
import com.listingservice.exception.ErrorCode;
import com.listingservice.mapper.IAvailabilityCalendarMapper;
import com.listingservice.repository.AvailabilityCalendarRepository;
import com.listingservice.repository.ListingRepository;
import com.listingservice.service.IAvailabilityCalendarService;
import lombok.AccessLevel;
import lombok.RequiredArgsConstructor;
import lombok.experimental.FieldDefaults;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.util.List;
import java.util.UUID;

@Service
@RequiredArgsConstructor
@FieldDefaults(level = AccessLevel.PRIVATE, makeFinal = true)
@Slf4j
public class AvailabilityCalendarService implements IAvailabilityCalendarService {
    
    AvailabilityCalendarRepository availabilityCalendarRepository;
    ListingRepository listingRepository;
    IAvailabilityCalendarMapper availabilityCalendarMapper;
    
    @Override
    @Transactional
    public AvailabilityResponse setAvailability(UUID listingId, AvailabilityRequest request) {
        log.info("Setting availability for listing: {} on date: {}", listingId, request.getDate());
        
        Listing listing = listingRepository.findById(listingId)
                .orElseThrow(() -> new AppException(ErrorCode.LISTING_NOT_FOUND));
        
        AvailabilityCalendar availability = availabilityCalendarRepository
                .findByListingListingIdAndDate(listingId, request.getDate())
                .orElse(AvailabilityCalendar.builder()
                        .listing(listing)
                        .date(request.getDate())
                        .build());
        
        availabilityCalendarMapper.updateEntity(availability, request);
        
        AvailabilityCalendar savedAvailability = availabilityCalendarRepository.save(availability);
        log.info("Availability set for listing: {} on date: {}", listingId, request.getDate());
        
        return availabilityCalendarMapper.toResponse(savedAvailability);
    }
    
    @Override
    public List<AvailabilityResponse> getAvailability(UUID listingId, LocalDate startDate, LocalDate endDate) {
        log.info("Getting availability for listing: {} between {} and {}", listingId, startDate, endDate);
        
        if (!listingRepository.existsById(listingId)) {
            throw new AppException(ErrorCode.LISTING_NOT_FOUND);
        }
        
        return availabilityCalendarRepository.findByListingListingIdAndDateBetween(listingId, startDate, endDate)
                .stream()
                .map(availabilityCalendarMapper::toResponse)
                .toList();
    }
    
    @Override
    public boolean checkAvailability(UUID listingId, LocalDate startDate, LocalDate endDate) {
        log.info("Checking availability for listing: {} between {} and {}", listingId, startDate, endDate);
        
        if (!listingRepository.existsById(listingId)) {
            throw new AppException(ErrorCode.LISTING_NOT_FOUND);
        }
        
        boolean isAvailable = !availabilityCalendarRepository.hasBlockedDateInRange(
                listingId, startDate, endDate
        );
        
        log.info("Availability check result: {}", isAvailable);
        return isAvailable;
    }
    
    @Override
    @Transactional
    public void blockDates(UUID listingId, LocalDate startDate, LocalDate endDate) {
        log.info("Blocking dates for listing: {} from {} to {}", listingId, startDate, endDate);
        
        Listing listing = listingRepository.findById(listingId)
                .orElseThrow(() -> new AppException(ErrorCode.LISTING_NOT_FOUND));
        
        LocalDate currentDate = startDate;
        while (!currentDate.isAfter(endDate)) {
            final LocalDate dateToBlock = currentDate;
            
            AvailabilityCalendar availability = availabilityCalendarRepository
                    .findByListingListingIdAndDate(listingId, dateToBlock)
                    .orElse(AvailabilityCalendar.builder()
                            .listing(listing)
                            .date(dateToBlock)
                            .build());
            
            availability.setIsAvailable(false);
            availabilityCalendarRepository.save(availability);
            
            currentDate = currentDate.plusDays(1);
        }
        
        log.info("Dates blocked successfully");
    }
    
    @Override
    @Transactional
    public void unblockDates(UUID listingId, LocalDate startDate, LocalDate endDate) {
        log.info("Unblocking dates for listing: {} from {} to {}", listingId, startDate, endDate);
        
        Listing listing = listingRepository.findById(listingId)
                .orElseThrow(() -> new AppException(ErrorCode.LISTING_NOT_FOUND));
        
        LocalDate currentDate = startDate;
        while (!currentDate.isAfter(endDate)) {
            final LocalDate dateToUnblock = currentDate;
            
            AvailabilityCalendar availability = availabilityCalendarRepository
                    .findByListingListingIdAndDate(listingId, dateToUnblock)
                    .orElse(AvailabilityCalendar.builder()
                            .listing(listing)
                            .date(dateToUnblock)
                            .build());
            
            availability.setIsAvailable(true);
            availabilityCalendarRepository.save(availability);
            
            currentDate = currentDate.plusDays(1);
        }
        
        log.info("Dates unblocked successfully");
    }
}
