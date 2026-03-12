package com.searchservice.document;

import lombok.Data;
import org.springframework.data.elasticsearch.annotations.Field;
import org.springframework.data.elasticsearch.annotations.FieldType;

@Data
public class PricingDocument {
  @Field(type = FieldType.Float)
  private String basePrice;

  @Field(type = FieldType.Keyword)
  private String currency;

  @Field(type = FieldType.Float)
  private String cleaningFee;

}