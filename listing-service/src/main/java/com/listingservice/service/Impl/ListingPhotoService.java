package com.listingservice.service.Impl;

import com.listingservice.dto.request.ListingPhotoRequest;
import com.listingservice.dto.response.ListingPhotoResponse;
import com.listingservice.entity.Listing;
import com.listingservice.entity.ListingPhoto;
import com.listingservice.exception.AppException;
import com.listingservice.exception.ErrorCode;
import com.listingservice.mapper.IListingPhotoMapper;
import com.listingservice.repository.ListingPhotoRepository;
import com.listingservice.repository.ListingRepository;
import com.listingservice.service.IListingPhotoService;
import lombok.AccessLevel;
import lombok.RequiredArgsConstructor;
import lombok.experimental.FieldDefaults;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.UUID;

@Service
@RequiredArgsConstructor
@FieldDefaults(level = AccessLevel.PRIVATE, makeFinal = true)
@Slf4j
public class ListingPhotoService implements IListingPhotoService {
    
    ListingPhotoRepository listingPhotoRepository;
    ListingRepository listingRepository;
    IListingPhotoMapper listingPhotoMapper;
    
    @Override
    @Transactional
    public ListingPhotoResponse addPhoto(UUID listingId, ListingPhotoRequest request) {
        log.info("Adding photo to listing: {}", listingId);
        
        Listing listing = listingRepository.findById(listingId)
                .orElseThrow(() -> new AppException(ErrorCode.LISTING_NOT_FOUND));
        
        long photoCount = listingPhotoRepository.countByListingListingId(listingId);
        
        ListingPhoto photo = listingPhotoMapper.toEntity(request);
        photo.setListing(listing);
        photo.setDisplayOrder((int) photoCount + 1);
        
        // Set as cover if it's the first photo
        if (photoCount == 0) {
            photo.setIsCover(true);
        }
        
        ListingPhoto savedPhoto = listingPhotoRepository.save(photo);
        log.info("Photo added to listing: {}", listingId);
        
        return listingPhotoMapper.toResponse(savedPhoto);
    }
    
    @Override
    @Transactional
    public ListingPhotoResponse updatePhoto(UUID photoId, ListingPhotoRequest request) {
        log.info("Updating photo: {}", photoId);
        
        ListingPhoto photo = listingPhotoRepository.findById(photoId)
                .orElseThrow(() -> new AppException(ErrorCode.PHOTO_NOT_FOUND));
        
        listingPhotoMapper.updateEntity(photo, request);
        
        ListingPhoto updatedPhoto = listingPhotoRepository.save(photo);
        log.info("Photo updated: {}", photoId);
        
        return listingPhotoMapper.toResponse(updatedPhoto);
    }
    
    @Override
    @Transactional
    public void deletePhoto(UUID photoId) {
        log.info("Deleting photo: {}", photoId);
        
        ListingPhoto photo = listingPhotoRepository.findById(photoId)
                .orElseThrow(() -> new AppException(ErrorCode.PHOTO_NOT_FOUND));
        
        UUID listingId = photo.getListing().getListingId();
        boolean wasCover = photo.getIsCover();
        
        listingPhotoRepository.deleteById(photoId);
        
        // If deleted photo was cover, set first remaining photo as cover
        if (wasCover) {
            List<ListingPhoto> remainingPhotos = listingPhotoRepository
                    .findByListingListingIdOrderByDisplayOrderAsc(listingId);
            
            if (!remainingPhotos.isEmpty()) {
                ListingPhoto newCover = remainingPhotos.get(0);
                newCover.setIsCover(true);
                listingPhotoRepository.save(newCover);
            }
        }
        
        log.info("Photo deleted: {}", photoId);
    }
    
    @Override
    public ListingPhotoResponse getPhotoById(UUID photoId) {
        log.info("Getting photo by ID: {}", photoId);
        
        ListingPhoto photo = listingPhotoRepository.findById(photoId)
                .orElseThrow(() -> new AppException(ErrorCode.PHOTO_NOT_FOUND));
        
        return listingPhotoMapper.toResponse(photo);
    }
    
    @Override
    public List<ListingPhotoResponse> getPhotosByListing(UUID listingId) {
        log.info("Getting photos for listing: {}", listingId);
        
        if (!listingRepository.existsById(listingId)) {
            throw new AppException(ErrorCode.LISTING_NOT_FOUND);
        }
        
        return listingPhotoRepository.findByListingListingIdOrderByDisplayOrderAsc(listingId)
                .stream()
                .map(listingPhotoMapper::toResponse)
                .toList();
    }
    
    @Override
    @Transactional
    public void setCoverPhoto(UUID listingId, UUID photoId) {
        log.info("Setting cover photo for listing: {}", listingId);
        
        // Remove current cover
        listingPhotoRepository.findByListingListingIdAndIsCoverTrue(listingId)
                .ifPresent(currentCover -> {
                    currentCover.setIsCover(false);
                    listingPhotoRepository.save(currentCover);
                });
        
        // Set new cover
        ListingPhoto newCover = listingPhotoRepository.findById(photoId)
                .orElseThrow(() -> new AppException(ErrorCode.PHOTO_NOT_FOUND));
        
        if (!newCover.getListing().getListingId().equals(listingId)) {
            throw new AppException(ErrorCode.PHOTO_NOT_BELONGS_TO_LISTING);
        }
        
        newCover.setIsCover(true);
        listingPhotoRepository.save(newCover);
        
        log.info("Cover photo set for listing: {}", listingId);
    }
    
    @Override
    @Transactional
    public void reorderPhotos(UUID listingId, List<UUID> photoIds) {
        log.info("Reordering photos for listing: {}", listingId);
        
        if (!listingRepository.existsById(listingId)) {
            throw new AppException(ErrorCode.LISTING_NOT_FOUND);
        }
        
        for (int i = 0; i < photoIds.size(); i++) {
            UUID photoId = photoIds.get(i);
            ListingPhoto photo = listingPhotoRepository.findById(photoId)
                    .orElseThrow(() -> new AppException(ErrorCode.PHOTO_NOT_FOUND));
            
            if (!photo.getListing().getListingId().equals(listingId)) {
                throw new AppException(ErrorCode.PHOTO_NOT_BELONGS_TO_LISTING);
            }
            
            photo.setDisplayOrder(i + 1);
            listingPhotoRepository.save(photo);
        }
        
        log.info("Photos reordered for listing: {}", listingId);
    }
}