package com.searchservice.document;

import lombok.Data;
import org.springframework.data.elasticsearch.annotations.Field;
import org.springframework.data.elasticsearch.annotations.FieldType;

@Data
public class AmenityDocument {
  @Field(type = FieldType.Keyword)
  private String amenityId;

  @Field(type = FieldType.Keyword)
  private String name;

  @Field(type = FieldType.Keyword)
  private String category;
}
