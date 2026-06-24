package com.listingservice.constant;

public enum ActivityEventType {
    VIEW(1.0),
    CLICK(2.0),
    WISHLIST(4.0),
    BOOKING(8.0);

    private final double weight;

    ActivityEventType(double weight) {
        this.weight = weight;
    }

    public double getWeight() {
        return weight;
    }
}
