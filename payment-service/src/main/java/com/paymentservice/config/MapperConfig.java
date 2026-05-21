package com.paymentservice.config;

import com.paymentservice.mapper.BookingMapper;
import com.paymentservice.mapper.PaymentMethodMapper;
import com.paymentservice.mapper.RefundMapper;
import com.paymentservice.mapper.TransactionMapper;
import org.mapstruct.factory.Mappers;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

@Configuration
public class MapperConfig {

    @Bean
    public PaymentMethodMapper paymentMethodMapper() {
        return Mappers.getMapper(PaymentMethodMapper.class);
    }

    @Bean
    public TransactionMapper transactionMapper() {
        return Mappers.getMapper(TransactionMapper.class);
    }

    @Bean
    public RefundMapper refundMapper() {
        return Mappers.getMapper(RefundMapper.class);
    }

    @Bean
    public BookingMapper bookingMapper() {
        return Mappers.getMapper(BookingMapper.class);
    }
}
