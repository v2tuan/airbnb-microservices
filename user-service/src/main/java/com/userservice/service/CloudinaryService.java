package com.userservice.service;

import com.cloudinary.Cloudinary;
import com.cloudinary.utils.ObjectUtils;
import com.userservice.dto.response.ImageUploadResponse;
import lombok.RequiredArgsConstructor;
import org.springframework.core.env.Environment;
import org.springframework.stereotype.Service;
import org.springframework.util.StringUtils;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.util.List;
import java.util.Map;
import java.util.UUID;

@Service
@RequiredArgsConstructor
public class CloudinaryService {
    private static final long MAX_IMAGE_SIZE_BYTES = 5 * 1024 * 1024;
    private static final List<String> ALLOWED_IMAGE_TYPES = List.of("image/jpeg", "image/png", "image/webp");

    private final Cloudinary cloudinary;
    private final Environment environment;

    public String uploadAvatar(MultipartFile file, String userId) {
        if (file == null || file.isEmpty()) {
            throw new RuntimeException("Avatar file is required");
        }
        validateImageFile(file);
        validateCloudinaryConfiguration();

        try {
            Map<?, ?> uploadResult = cloudinary.uploader().upload(
                    file.getBytes(),
                    ObjectUtils.asMap(
                            "folder", "airbnb/users/avatars",
                            "public_id", "user-" + userId,
                            "overwrite", true,
                            "resource_type", "image"
                    )
            );

            Object secureUrl = uploadResult.get("secure_url");
            if (secureUrl == null) {
                throw new RuntimeException("Cloudinary upload did not return secure_url");
            }

            return secureUrl.toString();
        } catch (IOException exception) {
            throw new RuntimeException("Failed to upload avatar to Cloudinary", exception);
        }
    }

    public ImageUploadResponse uploadImage(MultipartFile file, String folder) {
        if (file == null || file.isEmpty()) {
            throw new RuntimeException("Image file is required");
        }
        validateImageFile(file);
        validateCloudinaryConfiguration();

        try {
            Map<?, ?> uploadResult = cloudinary.uploader().upload(
                    file.getBytes(),
                    ObjectUtils.asMap(
                            "folder", folder == null || folder.isBlank() ? "airbnb/uploads" : folder,
                            "public_id", UUID.randomUUID().toString(),
                            "resource_type", "image"
                    )
            );

            Object secureUrl = uploadResult.get("secure_url");
            if (secureUrl == null) {
                throw new RuntimeException("Cloudinary upload did not return secure_url");
            }
            Object publicId = uploadResult.get("public_id");

            return new ImageUploadResponse(secureUrl.toString(), publicId != null ? publicId.toString() : null);
        } catch (IOException exception) {
            throw new RuntimeException("Failed to upload image to Cloudinary", exception);
        }
    }

    private void validateImageFile(MultipartFile file) {
        if (file.getSize() > MAX_IMAGE_SIZE_BYTES) {
            throw new RuntimeException("Image file must be no larger than 5MB");
        }

        String contentType = file.getContentType();
        if (contentType == null || !ALLOWED_IMAGE_TYPES.contains(contentType.toLowerCase())) {
            throw new RuntimeException("Only JPG, PNG, and WebP images are supported");
        }
    }

    private void validateCloudinaryConfiguration() {
        validateRequired("CLOUDINARY_CLOUD_NAME", "cloudinary.cloud-name");
        validateRequired("CLOUDINARY_API_KEY", "cloudinary.api-key");
        validateRequired("CLOUDINARY_API_SECRET", "cloudinary.api-secret");
    }

    private void validateRequired(String environmentVariable, String propertyName) {
        if (!StringUtils.hasText(environment.getProperty(propertyName))) {
            throw new RuntimeException(environmentVariable + " is required for Cloudinary uploads");
        }
    }
}
