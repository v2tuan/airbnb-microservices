package com.paymentservice.mapper;

import com.paymentservice.dto.response.PaymentMethodResponse;
import com.paymentservice.entity.PaymentMethod;
import org.mapstruct.Mapper;

@Mapper(componentModel = "spring")
public interface PaymentMethodMapper {
    PaymentMethodResponse toResponse(PaymentMethod paymentMethod);
    PaymentMethod toEntity(PaymentMethodResponse response);
}
