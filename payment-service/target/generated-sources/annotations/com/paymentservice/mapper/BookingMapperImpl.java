package com.paymentservice.mapper;

import com.paymentservice.dto.request.CheckoutRequest;
import com.paymentservice.dto.request.CreateBookingRequest;
import javax.annotation.processing.Generated;
import org.springframework.stereotype.Component;

@Generated(
    value = "org.mapstruct.ap.MappingProcessor",
    comments = "version: 1.5.5.Final, compiler: javac, environment: Java 21.0.7 (Oracle Corporation)"
)
@Component
public class BookingMapperImpl implements BookingMapper {

    @Override
    public CreateBookingRequest toCreateBookingRequest(CheckoutRequest request) {
        if ( request == null ) {
            return null;
        }

        CreateBookingRequest.CreateBookingRequestBuilder createBookingRequest = CreateBookingRequest.builder();

        createBookingRequest.roomId( request.getRoomId() );
        createBookingRequest.checkInDate( request.getCheckInDate() );
        createBookingRequest.checkOutDate( request.getCheckOutDate() );
        createBookingRequest.currency( request.getCurrency() );
        createBookingRequest.numberOfAdults( request.getNumberOfAdults() );
        createBookingRequest.numberOfChildren( request.getNumberOfChildren() );
        createBookingRequest.numberOfInfants( request.getNumberOfInfants() );
        createBookingRequest.numberOfPets( request.getNumberOfPets() );
        createBookingRequest.guestNotes( request.getGuestNotes() );

        return createBookingRequest.build();
    }
}
