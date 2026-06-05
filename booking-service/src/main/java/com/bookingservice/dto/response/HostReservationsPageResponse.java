package com.bookingservice.dto.response;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDate;
import java.util.List;
import java.util.Map;

/**
 * View-model tổng hợp cho trang quản lý reservation của host.
 *
 * DTO này cố ý không chỉ trả `content` của trang hiện tại. UI hiện tại còn cần metric,
 * số lượng từng tab, calendar và "Next stays". Nếu frontend chỉ nhận page hiện tại rồi tự
 * tính các phần đó, dashboard sẽ hiển thị sai khi host có nhiều hơn một page reservation.
 *
 * Production contract:
 * - Backend chịu trách nhiệm filter/search/pagination để frontend không kéo toàn bộ booking.
 * - Backend trả thêm aggregate metadata để giữ nguyên UX cũ mà không cần client-side aggregate.
 * - Frontend chỉ render theo query hiện tại; khi query đổi thì gọi lại endpoint này.
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class HostReservationsPageResponse {
    private List<ReservationResponse> content;
    private int page;
    private int size;
    private long totalElements;
    private int totalPages;
    private ReservationStats stats;
    private Map<String, Long> statusCounts;
    private List<LocalDate> occupiedDates;
    private List<ReservationResponse> nextReservations;

    /**
     * Metric của toàn bộ scope đang chọn, không bị ảnh hưởng bởi search/date/status tab.
     *
     * Lý do: UI cũ tính metric từ `scopedReservations`, tức là từ listing scope hiện tại
     * trước khi apply filter. Nếu đổi sang metric của page hiện tại, user sẽ thấy số liệu
     * nhảy sai khi phân trang hoặc search.
     */
    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class ReservationStats {
        private long total;
        private long pending;
        private long arrivalsToday;
        private long inHouse;
        private long revenue;
        private String currency;
    }
}
