package com.paymentservice.mapper;

import com.paymentservice.dto.response.RefundResponse;
import com.paymentservice.entity.Refund;
import org.mapstruct.Mapper;

@Mapper(componentModel = "spring")
public interface RefundMapper {
    RefundResponse toResponse(Refund refund);
    Refund toEntity(RefundResponse response);
}
