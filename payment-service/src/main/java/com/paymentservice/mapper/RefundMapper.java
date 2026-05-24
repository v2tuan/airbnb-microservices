package com.paymentservice.mapper;

import com.paymentservice.dto.response.RefundResponse;
import com.paymentservice.entity.Refund;
import org.mapstruct.Mapper;
import org.mapstruct.Mapping;

@Mapper(componentModel = "spring")
public interface RefundMapper {
    @Mapping(source = "originalTransaction.transactionId", target = "originalTransactionId")
    @Mapping(source = "refundTransaction.transactionId", target = "refundTransactionId")
    RefundResponse toResponse(Refund refund);
    Refund toEntity(RefundResponse response);
}
