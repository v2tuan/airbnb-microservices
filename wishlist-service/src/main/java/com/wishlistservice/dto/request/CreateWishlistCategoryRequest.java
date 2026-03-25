package com.wishlistservice.dto.request;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import lombok.AccessLevel;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import lombok.experimental.FieldDefaults;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
@FieldDefaults(level = AccessLevel.PRIVATE)
public class CreateWishlistCategoryRequest {
  @NotBlank(message = "CATEGORY_NAME_REQUIRED")
  @Size(max = 100, message = "CATEGORY_NAME_TOO_LONG")
  String name;

  @Size(max = 255, message = "DESCRIPTION_TOO_LONG")
  String description;
}
