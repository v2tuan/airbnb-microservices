package com.ratingservice.dto;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class RatingPhotoDTO {
  private String id;
  private String imageUrl;
  private String publicId;
  private Integer sortOrder;
  private LocalDateTime createdAt;
}
