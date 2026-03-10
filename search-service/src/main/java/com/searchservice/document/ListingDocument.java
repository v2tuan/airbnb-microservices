package com.searchservice.document;

import lombok.Data;
import org.springframework.data.annotation.Id;
import org.springframework.data.elasticsearch.annotations.Document;
import org.springframework.data.elasticsearch.annotations.Field;
import org.springframework.data.elasticsearch.annotations.FieldType;

import java.time.LocalDateTime;
import java.util.List;

@Data
@Document(indexName = "listings_search", createIndex = false)
public class ListingDocument {

  @Id
  private String listingId;

  @Field(type = FieldType.Keyword)
  private String hostId;

  @Field(type = FieldType.Text, analyzer = "standard")
  private String title;

  @Field(type = FieldType.Text)
  private String description;

  @Field(type = FieldType.Keyword)
  private String propertyType;

  @Field(type = FieldType.Keyword)
  private String roomType;

  @Field(type = FieldType.Integer)
  private Integer numBedrooms;

  @Field(type = FieldType.Integer)
  private Integer numBeds;

  @Field(type = FieldType.Float)
  private Float numBathrooms;

  @Field(type = FieldType.Integer)
  private Integer maxGuests;

  @Field(type = FieldType.Object)
  private LocationDocument location;

  @Field(type = FieldType.Object)
  private PricingDocument pricing;

  @Field(type = FieldType.Nested)
  private List<AmenityDocument> amenities;

  @Field(type = FieldType.Nested)
  private List<PhotoDocument> photos;

  @Field(type = FieldType.Object)
  private AvailabilityDocument availability;

  @Field(type = FieldType.Object)
  private StatisticsDocument statistics;

  @Field(type = FieldType.Keyword)
  private String status;

  @Field(type = FieldType.Date)
  private LocalDateTime createdAt;

  @Field(type = FieldType.Date)
  private LocalDateTime updatedAt;

  @Field(type = FieldType.Date)
  private LocalDateTime indexedAt;

}