package com.searchservice.document;

import org.springframework.data.elasticsearch.annotations.Field;
import org.springframework.data.elasticsearch.annotations.FieldType;

public class AvailabilityDocument {
  @Field(type = FieldType.Boolean)
  private Boolean instantBook;

  @Field(type = FieldType.Integer)
  private Integer minNights;

  @Field(type = FieldType.Integer)
  private Integer maxNights;
}
