package com.paymentservice.mapper;

import com.paymentservice.dto.response.TransactionResponse;
import com.paymentservice.entity.Transaction;
import javax.annotation.processing.Generated;
import org.springframework.stereotype.Component;

@Generated(
    value = "org.mapstruct.ap.MappingProcessor",
    comments = "version: 1.5.5.Final, compiler: Eclipse JDT (IDE) 3.46.0.v20260407-0427, environment: Java 21.0.10 (Eclipse Adoptium)"
)
@Component
public class TransactionMapperImpl implements TransactionMapper {

    @Override
    public TransactionResponse toResponse(Transaction transaction) {
        if ( transaction == null ) {
            return null;
        }

        TransactionResponse.TransactionResponseBuilder transactionResponse = TransactionResponse.builder();

        transactionResponse.amount( transaction.getAmount() );
        transactionResponse.bookingId( transaction.getBookingId() );
        transactionResponse.completedAt( transaction.getCompletedAt() );
        transactionResponse.currency( transaction.getCurrency() );
        transactionResponse.description( transaction.getDescription() );
        transactionResponse.failureReason( transaction.getFailureReason() );
        transactionResponse.gatewayTransactionId( transaction.getGatewayTransactionId() );
        transactionResponse.initiatedAt( transaction.getInitiatedAt() );
        transactionResponse.payeeId( transaction.getPayeeId() );
        transactionResponse.payerId( transaction.getPayerId() );
        transactionResponse.status( transaction.getStatus() );
        transactionResponse.transactionId( transaction.getTransactionId() );
        transactionResponse.transactionType( transaction.getTransactionType() );

        return transactionResponse.build();
    }

    @Override
    public Transaction toEntity(TransactionResponse response) {
        if ( response == null ) {
            return null;
        }

        Transaction.TransactionBuilder transaction = Transaction.builder();

        transaction.amount( response.getAmount() );
        transaction.bookingId( response.getBookingId() );
        transaction.completedAt( response.getCompletedAt() );
        transaction.currency( response.getCurrency() );
        transaction.description( response.getDescription() );
        transaction.failureReason( response.getFailureReason() );
        transaction.gatewayTransactionId( response.getGatewayTransactionId() );
        transaction.initiatedAt( response.getInitiatedAt() );
        transaction.payeeId( response.getPayeeId() );
        transaction.payerId( response.getPayerId() );
        transaction.status( response.getStatus() );
        transaction.transactionId( response.getTransactionId() );
        transaction.transactionType( response.getTransactionType() );

        return transaction.build();
    }
}
