package com.userservice.controller;

import com.userservice.dto.ApiResponse;
import com.userservice.dto.response.ImageUploadResponse;
import com.userservice.service.CloudinaryService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.multipart.MultipartFile;

@RestController
@RequestMapping("/uploads")
@RequiredArgsConstructor
public class UploadController {

    private final CloudinaryService cloudinaryService;

    @PostMapping("/images")
    public ResponseEntity<ApiResponse<ImageUploadResponse>> uploadImage(
            @RequestParam("file") MultipartFile file,
            @RequestParam(value = "folder", defaultValue = "airbnb/listings/photos") String folder) {
        ImageUploadResponse uploadedImage = cloudinaryService.uploadImage(file, folder);
        return ResponseEntity.ok(ApiResponse.<ImageUploadResponse>builder()
                .success(true)
                .message("Image uploaded")
                .data(uploadedImage)
                .build());
    }
}
