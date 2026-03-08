package com.searchservice.document;

import org.springframework.data.elasticsearch.annotations.Field;
import org.springframework.data.elasticsearch.annotations.FieldType;

public class PricingDocument {
  @Field(type = FieldType.Float)
  private String baseFree;

  @Field(type = FieldType.Keyword)
  private String currency;

  @Field(type = FieldType.Float)
  private String cleaningFee;

}