package com.notificationservice.repository;

import com.notificationservice.model.NotificationDocument;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.mongodb.repository.MongoRepository;
import org.springframework.data.mongodb.repository.Query;

public interface NotificationRepository extends MongoRepository<NotificationDocument, String> {
    long countByUserIdAndReadFalse(String userId);

    Page<NotificationDocument> findByUserIdOrderByCreatedAtDesc(String userId, Pageable pageable);

    Page<NotificationDocument> findByUserIdAndReadFalseOrderByCreatedAtDesc(String userId, Pageable pageable);

    @Query("{ 'userId': ?0, 'read': false }")
    java.util.List<NotificationDocument> findUnreadByUserId(String userId);
}
