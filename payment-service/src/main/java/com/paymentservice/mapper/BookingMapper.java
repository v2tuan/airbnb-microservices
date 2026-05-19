package com.paymentservice.mapper;

import com.paymentservice.dto.request.CheckoutRequest;
import com.paymentservice.dto.request.CreateBookingRequest;
import org.mapstruct.Mapper;

@Mapper(componentModel = "spring")
public interface BookingMapper {
    CreateBookingRequest toCreateBookingRequest(CheckoutRequest request);
}
