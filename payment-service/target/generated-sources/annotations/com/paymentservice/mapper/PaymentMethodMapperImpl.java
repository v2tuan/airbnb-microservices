package com.paymentservice.mapper;

import com.paymentservice.dto.response.PaymentMethodResponse;
import com.paymentservice.entity.PaymentMethod;
import javax.annotation.processing.Generated;
import org.springframework.stereotype.Component;

@Generated(
    value = "org.mapstruct.ap.MappingProcessor",
    comments = "version: 1.5.5.Final, compiler: Eclipse JDT (IDE) 3.46.0.v20260407-0427, environment: Java 21.0.10 (Eclipse Adoptium)"
)
@Component
public class PaymentMethodMapperImpl implements PaymentMethodMapper {

    @Override
    public PaymentMethodResponse toResponse(PaymentMethod paymentMethod) {
        if ( paymentMethod == null ) {
            return null;
        }

        PaymentMethodResponse.PaymentMethodResponseBuilder paymentMethodResponse = PaymentMethodResponse.builder();

        paymentMethodResponse.cardBrand( paymentMethod.getCardBrand() );
        paymentMethodResponse.cardholderName( paymentMethod.getCardholderName() );
        paymentMethodResponse.createdAt( paymentMethod.getCreatedAt() );
        paymentMethodResponse.expiryMonth( paymentMethod.getExpiryMonth() );
        paymentMethodResponse.expiryYear( paymentMethod.getExpiryYear() );
        paymentMethodResponse.isDefault( paymentMethod.getIsDefault() );
        paymentMethodResponse.isVerified( paymentMethod.getIsVerified() );
        paymentMethodResponse.lastFourDigits( paymentMethod.getLastFourDigits() );
        paymentMethodResponse.methodType( paymentMethod.getMethodType() );
        paymentMethodResponse.paymentMethodId( paymentMethod.getPaymentMethodId() );
        paymentMethodResponse.provider( paymentMethod.getProvider() );
        paymentMethodResponse.updatedAt( paymentMethod.getUpdatedAt() );
        paymentMethodResponse.userId( paymentMethod.getUserId() );

        return paymentMethodResponse.build();
    }

    @Override
    public PaymentMethod toEntity(PaymentMethodResponse response) {
        if ( response == null ) {
            return null;
        }

        PaymentMethod.PaymentMethodBuilder paymentMethod = PaymentMethod.builder();

        paymentMethod.cardBrand( response.getCardBrand() );
        paymentMethod.cardholderName( response.getCardholderName() );
        paymentMethod.createdAt( response.getCreatedAt() );
        paymentMethod.expiryMonth( response.getExpiryMonth() );
        paymentMethod.expiryYear( response.getExpiryYear() );
        paymentMethod.isDefault( response.getIsDefault() );
        paymentMethod.isVerified( response.getIsVerified() );
        paymentMethod.lastFourDigits( response.getLastFourDigits() );
        paymentMethod.methodType( response.getMethodType() );
        paymentMethod.paymentMethodId( response.getPaymentMethodId() );
        paymentMethod.provider( response.getProvider() );
        paymentMethod.updatedAt( response.getUpdatedAt() );
        paymentMethod.userId( response.getUserId() );

        return paymentMethod.build();
    }
}
