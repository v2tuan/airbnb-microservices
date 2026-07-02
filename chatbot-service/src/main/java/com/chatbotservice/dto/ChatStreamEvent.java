package com.chatbotservice.dto;

public record ChatStreamEvent(String event, String data) {
    public static final String CONVERSATION_ID = "conversation_id";
    public static final String MESSAGE = "message";
    public static final String LISTING_CARDS = "listing_cards";
    public static final String BOOKING_CONFIRMATION = "booking_confirmation";

    public static ChatStreamEvent conversationId(String data) {
        return new ChatStreamEvent(CONVERSATION_ID, data);
    }

    public static ChatStreamEvent message(String data) {
        return new ChatStreamEvent(MESSAGE, data);
    }

    public static ChatStreamEvent listingCards(String data) {
        return new ChatStreamEvent(LISTING_CARDS, data);
    }

    public static ChatStreamEvent bookingConfirmation(String data) {
        return new ChatStreamEvent(BOOKING_CONFIRMATION, data);
    }
}
