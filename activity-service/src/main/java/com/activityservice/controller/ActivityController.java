package com.activityservice.controller;

import com.activityservice.dto.ActivityBatchRequest;
import com.activityservice.dto.ActivityRequest;
import com.activityservice.service.ActivityIngestionService;
import jakarta.validation.Valid;
import java.util.Map;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/activities")
public class ActivityController {

  private final ActivityIngestionService activityIngestionService;

  public ActivityController(ActivityIngestionService activityIngestionService) {
    this.activityIngestionService = activityIngestionService;
  }

  @PostMapping
  @ResponseStatus(HttpStatus.CREATED)
  public Map<String, Object> createActivity(@Valid @RequestBody ActivityRequest request) {
    var saved = activityIngestionService.save(request);
    return Map.of("id", saved.getId(), "message", "activity stored");
  }

  @PostMapping("/batch")
  @ResponseStatus(HttpStatus.CREATED)
  public Map<String, Object> createActivities(@Valid @RequestBody ActivityBatchRequest request) {
    int savedCount = activityIngestionService.saveAll(request.activities()).size();
    return Map.of("saved", savedCount, "message", "activities stored");
  }
}

