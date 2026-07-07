package com.paymentservice.controller;

import com.paymentservice.dto.ApiResponse;
import com.paymentservice.dto.response.AdminPaymentOverviewResponse;
import com.paymentservice.dto.response.AdminRefundRecordResponse;
import com.paymentservice.dto.response.AdminTransactionRecordResponse;
import com.paymentservice.exception.BusinessException;
import com.paymentservice.service.PaymentAdminService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.Collection;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/admin")
@RequiredArgsConstructor
public class PaymentAdminController {
    private final PaymentAdminService paymentAdminService;

    @GetMapping("/overview")
    public ResponseEntity<ApiResponse<AdminPaymentOverviewResponse>> overview() {
        requireAdmin();
        return ResponseEntity.ok(ApiResponse.<AdminPaymentOverviewResponse>builder()
                .success(true)
                .message("Get payment admin overview success")
                .data(paymentAdminService.getOverview())
                .build());
    }

    @GetMapping("/refunds")
    public ResponseEntity<ApiResponse<List<AdminRefundRecordResponse>>> refunds() {
        requireAdmin();
        return ResponseEntity.ok(ApiResponse.<List<AdminRefundRecordResponse>>builder()
                .success(true)
                .message("Get admin refunds success")
                .data(paymentAdminService.getRefunds())
                .build());
    }

    @GetMapping("/transactions")
    public ResponseEntity<ApiResponse<List<AdminTransactionRecordResponse>>> transactions() {
        requireAdmin();
        return ResponseEntity.ok(ApiResponse.<List<AdminTransactionRecordResponse>>builder()
                .success(true)
                .message("Get admin transactions success")
                .data(paymentAdminService.getTransactions())
                .build());
    }

    private void requireAdmin() {
        Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
        if (authentication == null || !(authentication.getPrincipal() instanceof Jwt jwt)) {
            throw BusinessException.unauthenticated("Authentication is required");
        }

        Object realmAccess = jwt.getClaim("realm_access");
        if (!(realmAccess instanceof Map<?, ?> realmAccessMap)) {
            throw BusinessException.forbidden("Admin role is required");
        }

        Object roles = realmAccessMap.get("roles");
        if (!(roles instanceof Collection<?> roleCollection)
                || roleCollection.stream()
                .map(String::valueOf)
                .noneMatch(role -> role.equals("ADMIN") || role.equals("ROLE_ADMIN"))) {
            throw BusinessException.forbidden("Admin role is required");
        }
    }
}
