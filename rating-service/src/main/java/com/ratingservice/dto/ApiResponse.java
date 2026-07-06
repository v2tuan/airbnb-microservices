package com.ratingservice.dto;

import lombok.Data;

@Data
public class ApiResponse<T> {
  private boolean success;
  private Integer code;
  private String message;
  private T data;
}
