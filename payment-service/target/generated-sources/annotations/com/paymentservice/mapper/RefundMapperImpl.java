package com.paymentservice.mapper;

import com.paymentservice.dto.response.RefundResponse;
import com.paymentservice.entity.Refund;
import javax.annotation.processing.Generated;
import org.springframework.stereotype.Component;

@Generated(
    value = "org.mapstruct.ap.MappingProcessor",
    comments = "version: 1.5.5.Final, compiler: Eclipse JDT (IDE) 3.46.0.v20260407-0427, environment: Java 21.0.10 (Eclipse Adoptium)"
)
@Component
public class RefundMapperImpl implements RefundMapper {

    @Override
    public RefundResponse toResponse(Refund refund) {
        if ( refund == null ) {
            return null;
        }

        RefundResponse.RefundResponseBuilder refundResponse = RefundResponse.builder();

        refundResponse.completedAt( refund.getCompletedAt() );
        refundResponse.gatewayRefundId( refund.getGatewayRefundId() );
        refundResponse.initiatedAt( refund.getInitiatedAt() );
        refundResponse.processedBy( refund.getProcessedBy() );
        refundResponse.refundAmount( refund.getRefundAmount() );
        refundResponse.refundDetails( refund.getRefundDetails() );
        refundResponse.refundId( refund.getRefundId() );
        refundResponse.refundReason( refund.getRefundReason() );
        refundResponse.refundType( refund.getRefundType() );
        refundResponse.status( refund.getStatus() );

        return refundResponse.build();
    }

    @Override
    public Refund toEntity(RefundResponse response) {
        if ( response == null ) {
            return null;
        }

        Refund.RefundBuilder refund = Refund.builder();

        refund.completedAt( response.getCompletedAt() );
        refund.gatewayRefundId( response.getGatewayRefundId() );
        refund.initiatedAt( response.getInitiatedAt() );
        refund.processedBy( response.getProcessedBy() );
        refund.refundAmount( response.getRefundAmount() );
        refund.refundDetails( response.getRefundDetails() );
        refund.refundId( response.getRefundId() );
        refund.refundReason( response.getRefundReason() );
        refund.refundType( response.getRefundType() );
        refund.status( response.getStatus() );

        return refund.build();
    }
}
