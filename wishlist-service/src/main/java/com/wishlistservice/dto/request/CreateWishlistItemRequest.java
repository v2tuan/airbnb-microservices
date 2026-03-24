package com.wishlistservice.dto.request;

import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import lombok.AccessLevel;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import lombok.experimental.FieldDefaults;

import java.util.UUID;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
@FieldDefaults(level = AccessLevel.PRIVATE)
public class CreateWishlistItemRequest {
  @NotNull(message = "LISTING_ID_REQUIRED")
  UUID listingId;

  @Size(max = 255, message = "NOTE_TOO_LONG")
  String note;
}
