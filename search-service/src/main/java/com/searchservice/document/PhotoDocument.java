package com.searchservice.document;

import lombok.Data;
import org.springframework.data.elasticsearch.annotations.Field;
import org.springframework.data.elasticsearch.annotations.FieldType;

@Data
public class PhotoDocument {
  @Field(type = FieldType.Keyword)
  private String photoUrl;

  @Field(type = FieldType.Boolean)
  private Boolean isCover;
}
