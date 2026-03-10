package com.searchservice.document;

import lombok.Data;
import org.springframework.data.elasticsearch.annotations.Field;
import org.springframework.data.elasticsearch.annotations.FieldType;

@Data
public class StatisticsDocument {
  @Field(type = FieldType.Integer)
  private Integer totalReviews;

  @Field(type = FieldType.Float)
  private Float averageRating;

  @Field(type = FieldType.Boolean)
  private Boolean isSuperhost;

}
