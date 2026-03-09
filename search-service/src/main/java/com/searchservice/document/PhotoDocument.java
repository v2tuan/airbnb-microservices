package com.searchservice.document;

import org.springframework.data.elasticsearch.annotations.Field;
import org.springframework.data.elasticsearch.annotations.FieldType;

public class PhotoDocument {
  @Field(type = FieldType.Keyword)
  private String photoUrl;

  @Field(type = FieldType.Boolean)
  private Boolean isCover;
}
