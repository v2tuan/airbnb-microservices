package com.wishlistservice.exception;

import lombok.Getter;
import org.springframework.http.HttpStatus;
import org.springframework.http.HttpStatusCode;

@Getter
public enum ErrorCode {
    UNCATEGORIZED_EXCEPTION(9999, "Uncategorized error", HttpStatus.INTERNAL_SERVER_ERROR),
    INVALID_KEY(1001, "Invalid message key", HttpStatus.BAD_REQUEST),

    CATEGORY_NOT_FOUND(2701, "Wishlist collection not found", HttpStatus.NOT_FOUND),
    ITEM_NOT_FOUND(2702, "Wishlist item not found", HttpStatus.NOT_FOUND),
    DUPLICATE_COLLECTION_NAME(2703, "Wishlist collection name already exists", HttpStatus.BAD_REQUEST),
    ITEM_ALREADY_EXISTS_IN_COLLECTION(2704, "Item already exists in this collection", HttpStatus.BAD_REQUEST),
    UNAUTHORIZED_WISHLIST_ACCESS(2705, "You do not have permission to access this wishlist resource", HttpStatus.FORBIDDEN),

    CATEGORY_NAME_REQUIRED(2710, "Collection name is required", HttpStatus.BAD_REQUEST),
    CATEGORY_NAME_TOO_LONG(2711, "Collection name is too long", HttpStatus.BAD_REQUEST),
    DESCRIPTION_TOO_LONG(2712, "Description is too long", HttpStatus.BAD_REQUEST),
    LISTING_ID_REQUIRED(2713, "Listing ID is required", HttpStatus.BAD_REQUEST),
    NOTE_TOO_LONG(2714, "Note is too long", HttpStatus.BAD_REQUEST),
    CATEGORY_ID_REQUIRED(2715, "Target category ID is required", HttpStatus.BAD_REQUEST);

    ErrorCode(int code, String message, HttpStatusCode statusCode) {
        this.code = code;
        this.message = message;
        this.statusCode = statusCode;
    }

    private final int code;
    private final String message;
    private final HttpStatusCode statusCode;
}