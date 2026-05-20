package com.paymentservice.mapper;

import com.paymentservice.dto.response.PaymentMethodResponse;
import com.paymentservice.entity.PaymentMethod;
import javax.annotation.processing.Generated;
import org.springframework.stereotype.Component;

@Generated(
    value = "org.mapstruct.ap.MappingProcessor",
    comments = "version: 1.5.5.Final, compiler: javac, environment: Java 21.0.7 (Oracle Corporation)"
)
@Component
public class PaymentMethodMapperImpl implements PaymentMethodMapper {

    @Override
    public PaymentMethodResponse toResponse(PaymentMethod paymentMethod) {
        if ( paymentMethod == null ) {
            return null;
        }

        PaymentMethodResponse.PaymentMethodResponseBuilder paymentMethodResponse = PaymentMethodResponse.builder();

        paymentMethodResponse.paymentMethodId( paymentMethod.getPaymentMethodId() );
        paymentMethodResponse.userId( paymentMethod.getUserId() );
        paymentMethodResponse.methodType( paymentMethod.getMethodType() );
        paymentMethodResponse.provider( paymentMethod.getProvider() );
        paymentMethodResponse.lastFourDigits( paymentMethod.getLastFourDigits() );
        paymentMethodResponse.cardBrand( paymentMethod.getCardBrand() );
        paymentMethodResponse.expiryMonth( paymentMethod.getExpiryMonth() );
        paymentMethodResponse.expiryYear( paymentMethod.getExpiryYear() );
        paymentMethodResponse.cardholderName( paymentMethod.getCardholderName() );
        paymentMethodResponse.isDefault( paymentMethod.getIsDefault() );
        paymentMethodResponse.isVerified( paymentMethod.getIsVerified() );
        paymentMethodResponse.createdAt( paymentMethod.getCreatedAt() );
        paymentMethodResponse.updatedAt( paymentMethod.getUpdatedAt() );

        return paymentMethodResponse.build();
    }

    @Override
    public PaymentMethod toEntity(PaymentMethodResponse response) {
        if ( response == null ) {
            return null;
        }

        PaymentMethod.PaymentMethodBuilder paymentMethod = PaymentMethod.builder();

        paymentMethod.paymentMethodId( response.getPaymentMethodId() );
        paymentMethod.userId( response.getUserId() );
        paymentMethod.methodType( response.getMethodType() );
        paymentMethod.provider( response.getProvider() );
        paymentMethod.lastFourDigits( response.getLastFourDigits() );
        paymentMethod.cardBrand( response.getCardBrand() );
        paymentMethod.expiryMonth( response.getExpiryMonth() );
        paymentMethod.expiryYear( response.getExpiryYear() );
        paymentMethod.cardholderName( response.getCardholderName() );
        paymentMethod.isDefault( response.getIsDefault() );
        paymentMethod.isVerified( response.getIsVerified() );
        paymentMethod.createdAt( response.getCreatedAt() );
        paymentMethod.updatedAt( response.getUpdatedAt() );

        return paymentMethod.build();
    }
}
