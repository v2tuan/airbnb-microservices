package com.paymentservice.mapper;

import com.paymentservice.dto.response.TransactionResponse;
import com.paymentservice.entity.Transaction;
import org.mapstruct.Mapper;

@Mapper(componentModel = "spring")
public interface TransactionMapper {
    TransactionResponse toResponse(Transaction transaction);
    Transaction toEntity(TransactionResponse response);
}
