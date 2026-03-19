package com.listingservice.controller;

import com.listingservice.dto.response.ApiResponse;
import com.listingservice.dto.response.HomeSectionResponse;
import com.listingservice.service.IListingService;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

@RestController
@RequiredArgsConstructor
public class ListingController {

  private final IListingService listingService;

  @GetMapping("/sections")
  public ApiResponse<List<HomeSectionResponse>> getHomeSections(
      @RequestParam(required = false) Integer limit
  ) {
    return ApiResponse.<List<HomeSectionResponse>>builder()
        .result(listingService.getHomeSections(limit))
        .build();
  }

}
