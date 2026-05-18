package com.paymentservice.mapper;

import com.paymentservice.dto.response.RefundResponse;
import com.paymentservice.entity.Refund;
import javax.annotation.processing.Generated;
import org.springframework.stereotype.Component;

@Generated(
    value = "org.mapstruct.ap.MappingProcessor",
    comments = "version: 1.5.5.Final, compiler: javac, environment: Java 21.0.5 (Oracle Corporation)"
)
@Component
public class RefundMapperImpl implements RefundMapper {

    @Override
    public RefundResponse toResponse(Refund refund) {
        if ( refund == null ) {
            return null;
        }

        RefundResponse.RefundResponseBuilder refundResponse = RefundResponse.builder();

        refundResponse.refundId( refund.getRefundId() );
        refundResponse.refundAmount( refund.getRefundAmount() );
        refundResponse.refundType( refund.getRefundType() );
        refundResponse.refundReason( refund.getRefundReason() );
        refundResponse.refundDetails( refund.getRefundDetails() );
        refundResponse.status( refund.getStatus() );
        refundResponse.processedBy( refund.getProcessedBy() );
        refundResponse.gatewayRefundId( refund.getGatewayRefundId() );
        refundResponse.initiatedAt( refund.getInitiatedAt() );
        refundResponse.completedAt( refund.getCompletedAt() );

        return refundResponse.build();
    }

    @Override
    public Refund toEntity(RefundResponse response) {
        if ( response == null ) {
            return null;
        }

        Refund.RefundBuilder refund = Refund.builder();

        refund.refundId( response.getRefundId() );
        refund.refundAmount( response.getRefundAmount() );
        refund.refundType( response.getRefundType() );
        refund.refundReason( response.getRefundReason() );
        refund.refundDetails( response.getRefundDetails() );
        refund.status( response.getStatus() );
        refund.processedBy( response.getProcessedBy() );
        refund.gatewayRefundId( response.getGatewayRefundId() );
        refund.initiatedAt( response.getInitiatedAt() );
        refund.completedAt( response.getCompletedAt() );

        return refund.build();
    }
}
