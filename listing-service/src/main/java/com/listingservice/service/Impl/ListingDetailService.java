package com.listingservice.service.Impl;

import com.listingservice.dto.response.CompositeListingResponse;
import com.listingservice.dto.response.CompositeListingResponse.AvailabilityData;
import com.listingservice.dto.response.CompositeListingResponse.BookingRequestData;
import com.listingservice.dto.response.CompositeListingResponse.PriceQuoteData;
import com.listingservice.dto.response.CompositeListingResponse.RatingData;
import com.listingservice.entity.Listing;
import com.listingservice.entity.ListingPhoto;
import com.listingservice.entity.ListingPricing;
import com.listingservice.repository.ListingRepository;
import com.listingservice.service.AvailabilityClient;
import com.listingservice.service.HostProfileClient;
import com.listingservice.service.IListingDetailService;
import com.listingservice.service.RatingClient;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.ZoneOffset;
import java.time.temporal.ChronoUnit;
import java.util.List;
import java.util.Objects;
import java.util.UUID;

@Service
@RequiredArgsConstructor
public class ListingDetailService implements IListingDetailService {

  private final ListingRepository listingRepository;
  private final HostProfileClient hostProfileClient;
  private final AvailabilityClient availabilityClient;
  private final RatingClient ratingClient;

  @Override
  public CompositeListingResponse getDetail(
      UUID listingId,
      LocalDate checkIn,
      LocalDate checkOut,
      Integer adults,
      Integer children,
      Integer infants,
      Integer pets) {
    Listing listing = listingRepository.findById(listingId)
        .orElseThrow(() -> new IllegalArgumentException("Listing not found"));

    int nights = (int) Math.max(ChronoUnit.DAYS.between(checkIn, checkOut), 0);
    boolean available = availabilityClient.isAvailable(listingId, checkIn, checkOut);

    ListingPricing pricing = listing.getPricing();
    BigDecimal nightlyPrice = pricing != null && pricing.getBasePrice() != null
        ? pricing.getBasePrice()
        : BigDecimal.ZERO;
    BigDecimal cleaningFee = pricing != null && pricing.getCleaningFee() != null
        ? pricing.getCleaningFee()
        : BigDecimal.ZERO;
    BigDecimal serviceRate = pricing != null && pricing.getServiceFeePercentage() != null
        ? pricing.getServiceFeePercentage().divide(BigDecimal.valueOf(100))
        : BigDecimal.ZERO;

    BigDecimal basePrice = nightlyPrice.multiply(BigDecimal.valueOf(nights));
    BigDecimal serviceFee = basePrice.multiply(serviceRate);
    BigDecimal totalPrice = basePrice.add(cleaningFee).add(serviceFee);

    CompositeListingResponse res = new CompositeListingResponse();
    res.setListingId(listing.getListingId());
    res.setTitle(listing.getTitle());
    res.setDescription(listing.getDescription());
    res.setPricePerNight(nightlyPrice);
    res.setLocation(String.format("%s, %s, %s", listing.getAddress(), listing.getCity(), listing.getCountry()));
    res.setPhotos(toPhotoUrls(listing));
    res.setCreatedAt(listing.getCreatedAt() == null ? null : listing.getCreatedAt().toInstant(ZoneOffset.UTC));
    res.setHost(hostProfileClient.getHostProfile(listing.getHostId()));

    AvailabilityData availabilityData = new AvailabilityData();
    availabilityData.setAvailable(available);
    availabilityData.setNights(nights);
    res.setAvailability(availabilityData);

    PriceQuoteData priceQuoteData = new PriceQuoteData();
    priceQuoteData.setBasePrice(basePrice);
    priceQuoteData.setCleaningFee(cleaningFee);
    priceQuoteData.setServiceFee(serviceFee);
    priceQuoteData.setTotalPrice(totalPrice);
    res.setPricing(priceQuoteData);

    RatingData ratingData = new RatingData();
    ratingData.setAverage(ratingClient.getAverageRating(listingId));
    res.setRating(ratingData);

    BookingRequestData requestData = new BookingRequestData();
    requestData.setCheckIn(checkIn);
    requestData.setCheckOut(checkOut);
    requestData.setAdults(adults);
    requestData.setChildren(children);
    requestData.setInfants(infants);
    requestData.setPets(pets);
    requestData.setGuests(safeInt(adults) + safeInt(children));
    res.setRequest(requestData);

    return res;
  }

  private List<String> toPhotoUrls(Listing listing) {
    if (listing.getPhotos() == null) {
      return List.of();
    }
    return listing.getPhotos().stream()
        .map(ListingPhoto::getPhotoUrl)
        .filter(Objects::nonNull)
        .toList();
  }

  private int safeInt(Integer value) {
    return value == null ? 0 : value;
  }
}
