package com.apigateway.client;

import com.apigateway.dto.response.ListingItemDetailDTO;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Qualifier;
import org.springframework.stereotype.Component;
import org.springframework.web.reactive.function.client.WebClient;
import reactor.core.publisher.Mono;

import java.util.List;

@Component
@Slf4j
public class ListingServiceClient {

    private final WebClient listingServiceWebClient;

    public ListingServiceClient(@Qualifier("listingServiceWebClient") WebClient listingServiceWebClient) {
        this.listingServiceWebClient = listingServiceWebClient;
    }

    /**
     * Get paginated listings by host ID
     */
    public Mono<ListingPageResponseDTO> getListingsByHost(String hostId, int page, int size) {
        return listingServiceWebClient
                .get()
                .uri(uriBuilder -> uriBuilder
                        .path("/listings/host/{hostId}/paginated")
                        .queryParam("page", page)
                        .queryParam("size", size)
                        .queryParam("status", "ACTIVE")
                        .queryParam("sort", "createdAt")
                        .queryParam("direction", "DESC")
                        .build(hostId))
                .retrieve()
                .bodyToMono(ListingPageResponseDTO.class)
                .doOnNext(resp -> log.debug("Fetched {} listings for host: {}", resp.content().size(), hostId))
                .doOnError(e -> log.error("Error fetching listings for host: {}", hostId, e));
    }

    // ============ NESTED DTOs ============

    public record ListingPageResponseDTO(
            List<ListingItemDetailDTO> content,
            Integer number,
            Integer size,
            Long totalElements) {

        public List<ListingItemDetailDTO> getItems() {
            return content;
        }
    }
}
