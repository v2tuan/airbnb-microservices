package com.searchservice.document;

import lombok.Data;
import org.springframework.data.elasticsearch.annotations.Field;
import org.springframework.data.elasticsearch.annotations.FieldType;
import org.springframework.data.elasticsearch.core.geo.GeoPoint;

@Data
public class LocationDocument {

  @Field(type = FieldType.Text)
  private String address;

  @Field(type = FieldType.Keyword)
  private String city;

  @Field(type = FieldType.Keyword)
  private String state;

  @Field(type = FieldType.Keyword)
  private String country;

  private GeoPoint coordinates;
}
