package com.chatbotservice.dto;

public record ChatStreamEvent(String event, String data) {
    public static final String MESSAGE = "message";
    public static final String LISTING_CARDS = "listing_cards";

    public static ChatStreamEvent message(String data) {
        return new ChatStreamEvent(MESSAGE, data);
    }

    public static ChatStreamEvent listingCards(String data) {
        return new ChatStreamEvent(LISTING_CARDS, data);
    }
}
