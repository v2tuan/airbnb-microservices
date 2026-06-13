package com.listingservice.service.Impl;

import com.listingservice.dto.request.ListingAccessInfoRequest;
import com.listingservice.dto.response.ListingAccessInfoResponse;
import com.listingservice.entity.Listing;
import com.listingservice.entity.ListingAccessInfo;
import com.listingservice.entity.ListingGuideStep;
import com.listingservice.exception.AppException;
import com.listingservice.exception.ErrorCode;
import com.listingservice.mapper.IListingAccessInfoMapper;
import com.listingservice.repository.ListingAccessInfoRepository;
import com.listingservice.repository.ListingRepository;
import com.listingservice.service.IListingAccessInfoService;
import lombok.AccessLevel;
import lombok.RequiredArgsConstructor;
import lombok.experimental.FieldDefaults;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.Comparator;
import java.util.List;
import java.util.UUID;
import java.util.concurrent.atomic.AtomicInteger;

@Service
@RequiredArgsConstructor
@FieldDefaults(level = AccessLevel.PRIVATE, makeFinal = true)
@Slf4j
public class ListingAccessInfoService implements IListingAccessInfoService {

    ListingAccessInfoRepository accessInfoRepository;
    ListingRepository listingRepository;
    IListingAccessInfoMapper accessInfoMapper;

    @Override
    @Transactional
    public ListingAccessInfoResponse createOrUpdateAccessInfo(UUID listingId, ListingAccessInfoRequest request) {
        log.info("Creating/Updating access info for listing: {}", listingId);

        Listing listing = listingRepository.findById(listingId)
                .orElseThrow(() -> new AppException(ErrorCode.LISTING_NOT_FOUND));

        ListingAccessInfo accessInfo = accessInfoRepository.findByListingListingId(listingId)
                .orElse(ListingAccessInfo.builder()
                        .listing(listing)
                        .build());

        accessInfo.setWifiPassword(blankToNull(request.getWifiPassword()));
        accessInfo.setEntryCode(blankToNull(request.getEntryCode()));
        accessInfo.setSmartLockInstructions(blankToNull(request.getSmartLockInstructions()));
        accessInfo.setKeyPickupInstructions(blankToNull(request.getKeyPickupInstructions()));
        replaceGuideSteps(accessInfo, request.getCheckInGuide());

        ListingAccessInfo saved = accessInfoRepository.save(accessInfo);
        return accessInfoMapper.toResponse(saved);
    }

    @Override
    @Transactional(readOnly = true)
    public ListingAccessInfoResponse getAccessInfoByListing(UUID listingId) {
        ListingAccessInfo accessInfo = accessInfoRepository.findByListingListingId(listingId)
                .orElseThrow(() -> new AppException(ErrorCode.ACCESS_INFO_NOT_FOUND));

        return accessInfoMapper.toResponse(accessInfo);
    }

    @Override
    @Transactional
    public void deleteAccessInfo(UUID listingId) {
        if (!accessInfoRepository.existsByListingListingId(listingId)) {
            throw new AppException(ErrorCode.ACCESS_INFO_NOT_FOUND);
        }

        accessInfoRepository.deleteByListingListingId(listingId);
    }

    private void replaceGuideSteps(ListingAccessInfo accessInfo, List<ListingAccessInfoRequest.GuideStepRequest> guideSteps) {
        accessInfo.getCheckInGuide().clear();

        if (guideSteps == null || guideSteps.isEmpty()) {
            return;
        }

        AtomicInteger fallbackStep = new AtomicInteger(1);
        guideSteps.stream()
                .filter(step -> !isBlank(step.getTitle()) || !isBlank(step.getDescription()))
                .sorted(Comparator.comparing(
                        ListingAccessInfoRequest.GuideStepRequest::getStepNumber,
                        Comparator.nullsLast(Integer::compareTo)))
                .forEach(step -> accessInfo.getCheckInGuide().add(ListingGuideStep.builder()
                        .accessInfo(accessInfo)
                        .stepNumber(step.getStepNumber() != null ? step.getStepNumber() : fallbackStep.getAndIncrement())
                        .title(blankToDefault(step.getTitle(), "Check-in step"))
                        .description(blankToDefault(step.getDescription(), "Follow the host's instructions for this step."))
                        .imageUrl(blankToNull(step.getImageUrl()))
                        .build()));
    }

    private String blankToNull(String value) {
        return isBlank(value) ? null : value.trim();
    }

    private String blankToDefault(String value, String fallback) {
        return isBlank(value) ? fallback : value.trim();
    }

    private boolean isBlank(String value) {
        return value == null || value.isBlank();
    }
}
