package com.searchservice.document;

import jakarta.persistence.Id;
import lombok.Data;
import org.springframework.data.elasticsearch.annotations.DateFormat;
import org.springframework.data.elasticsearch.annotations.Document;
import org.springframework.data.elasticsearch.annotations.Field;
import org.springframework.data.elasticsearch.annotations.FieldType;

import java.time.LocalDateTime;
import java.util.List;

@Document(indexName="listings_search")
@Data
public class ListingDocument {
  @Id
  private String listingId;

  @Field(type = FieldType.Keyword)
  private String hostId;

  @Field(type = FieldType.Text, analyzer = "standard")
  private String title;

  @Field(type = FieldType.Keyword)
  private String propertyType;

  @Field(type = FieldType.Integer)
  private Integer numBedrooms;

  private LocationDocument location;

  @Field(type = FieldType.Nested)
  private List<AmenityDocument> amenities;

  @Field(type = FieldType.Float)
  private Float basePrice;

  @Field(type = FieldType.Boolean)
  private boolean isSuperhost;

  @Field(type = FieldType.Float)
  private Float averageRating;

  @Field(type = FieldType.Date, format = DateFormat.date_hour_minute_second)
  private LocalDateTime updatedAt;
}
