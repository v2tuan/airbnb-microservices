package com.paymentservice.mapper;

import com.paymentservice.dto.response.TransactionResponse;
import com.paymentservice.entity.Transaction;
import javax.annotation.processing.Generated;
import org.springframework.stereotype.Component;

@Generated(
    value = "org.mapstruct.ap.MappingProcessor",
    comments = "version: 1.5.5.Final, compiler: javac, environment: Java 21.0.5 (Oracle Corporation)"
)
@Component
public class TransactionMapperImpl implements TransactionMapper {

    @Override
    public TransactionResponse toResponse(Transaction transaction) {
        if ( transaction == null ) {
            return null;
        }

        TransactionResponse.TransactionResponseBuilder transactionResponse = TransactionResponse.builder();

        transactionResponse.transactionId( transaction.getTransactionId() );
        transactionResponse.bookingId( transaction.getBookingId() );
        transactionResponse.payerId( transaction.getPayerId() );
        transactionResponse.payeeId( transaction.getPayeeId() );
        transactionResponse.transactionType( transaction.getTransactionType() );
        transactionResponse.amount( transaction.getAmount() );
        transactionResponse.currency( transaction.getCurrency() );
        transactionResponse.status( transaction.getStatus() );
        transactionResponse.gatewayTransactionId( transaction.getGatewayTransactionId() );
        transactionResponse.failureReason( transaction.getFailureReason() );
        transactionResponse.description( transaction.getDescription() );
        transactionResponse.initiatedAt( transaction.getInitiatedAt() );
        transactionResponse.completedAt( transaction.getCompletedAt() );

        return transactionResponse.build();
    }

    @Override
    public Transaction toEntity(TransactionResponse response) {
        if ( response == null ) {
            return null;
        }

        Transaction.TransactionBuilder transaction = Transaction.builder();

        transaction.transactionId( response.getTransactionId() );
        transaction.bookingId( response.getBookingId() );
        transaction.payerId( response.getPayerId() );
        transaction.payeeId( response.getPayeeId() );
        transaction.transactionType( response.getTransactionType() );
        transaction.amount( response.getAmount() );
        transaction.currency( response.getCurrency() );
        transaction.status( response.getStatus() );
        transaction.gatewayTransactionId( response.getGatewayTransactionId() );
        transaction.failureReason( response.getFailureReason() );
        transaction.description( response.getDescription() );
        transaction.initiatedAt( response.getInitiatedAt() );
        transaction.completedAt( response.getCompletedAt() );

        return transaction.build();
    }
}
