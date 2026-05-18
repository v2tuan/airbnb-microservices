package com.userservice.service;

import com.stripe.exception.StripeException;
import com.stripe.model.Account;
import com.stripe.model.AccountLink;
import com.stripe.param.AccountCreateParams;
import com.stripe.param.AccountLinkCreateParams;
import com.userservice.dto.response.HostStatusResponse;
import com.userservice.entity.StripeAccountStatus;
import com.userservice.entity.User;
import com.userservice.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.UUID;

@Service
@Slf4j
@RequiredArgsConstructor
public class StripeService {
    private final UserRepository userRepository;

    @Value("${app.frontend-url}")
    private String frontendUrl;

    private final UserService userService;

    /**
     * Tạo hoặc reuse Stripe Express Account, trả về onboarding URL.
     * Đây là entry point chính — idempotent, gọi nhiều lần vẫn an toàn.
     */
    @Transactional
    public String createOrResumeOnboarding() {
        Authentication authentication = SecurityContextHolder.getContext().getAuthentication();

        Jwt jwt = (Jwt) authentication.getPrincipal();

        UUID userId = UUID.fromString(jwt.getSubject());

        String email = jwt.getClaim("email");

        User user = userRepository.findByKeycloakUserId(userId.toString())
                .orElseThrow(() -> new RuntimeException("User not found, Id: " + userId.toString()));

        // --- Best practice: không tạo duplicate account ---
        if (user.getStripeAccountId() == null) {
            Account account = createExpressAccount(userId, email);
            user.setStripeAccountId(account.getId());
            user.setStripeAccountStatus(StripeAccountStatus.PENDING);
            userRepository.save(user);

            log.info("Created Stripe account {} for user {}", account.getId(), userId);
        }

        return generateAccountLink(user.getStripeAccountId(), userId);
    }

    private Account createExpressAccount(UUID userId, String email) {
        try {
            AccountCreateParams params = AccountCreateParams.builder()
                    .setType(AccountCreateParams.Type.EXPRESS)
                    .setEmail(email)
                    .setCapabilities(
                            AccountCreateParams.Capabilities.builder()
                                    .setCardPayments(
                                            AccountCreateParams.Capabilities.CardPayments.builder()
                                                    .setRequested(true).build())
                                    .setTransfers(
                                            AccountCreateParams.Capabilities.Transfers.builder()
                                                    .setRequested(true).build())
                                    .build())
                    // Metadata giúp truy vết trong Stripe Dashboard
                    .putMetadata("user_id", String.valueOf(userId))
                    .putMetadata("platform", "airbnb-clone")
                    .build();

            return Account.create(params);
        } catch (StripeException e) {
            log.error("Failed to create Stripe account for user {}", userId, e);
            throw new RuntimeException("Cannot create Stripe account", e);
        }
    }

    private String generateAccountLink(String stripeAccountId, UUID userId) {
        try {
            AccountLinkCreateParams params = AccountLinkCreateParams.builder()
                    .setAccount(stripeAccountId)
                    .setRefreshUrl(frontendUrl + "/host/reauth?userId=" + userId)
                    .setReturnUrl(frontendUrl + "/host/success?userId=" + userId)
                    .setType(AccountLinkCreateParams.Type.ACCOUNT_ONBOARDING)
                    .build();

            AccountLink link = AccountLink.create(params);
            return link.getUrl();
        } catch (StripeException e) {
            log.error("Failed to create account link for {}", stripeAccountId, e);
            throw new RuntimeException("Cannot generate onboarding link", e);
        }
    }

    /**
     * Được gọi từ return_url: kiểm tra user đã hoàn tất onboarding chưa.
     * KHÔNG dùng return_url để trust là "đã xong" — phải verify qua API.
     */
    @Transactional
    public HostStatusResponse checkAndActivateHost(UUID userId) {
        User user = userRepository.findByKeycloakUserId(userId.toString())
                .orElseThrow(() -> new RuntimeException("User not found"));

        if (user.getStripeAccountId() == null) {
            return new HostStatusResponse(false, "No Stripe account found", null);
        }

        try {
            Account account = Account.retrieve(user.getStripeAccountId());

            boolean chargesEnabled = account.getChargesEnabled();
            boolean detailsSubmitted = account.getDetailsSubmitted();

            if (chargesEnabled && detailsSubmitted) {
                // Chính thức là host
                user.setStripeAccountStatus(StripeAccountStatus.ACTIVE);
                userRepository.save(user);

                // Gán role HOST cho user
                userService.becomeHost(userId.toString());
                log.info("User {} is now an active host", userId);
                return new HostStatusResponse(true, "Onboarding complete", user.getStripeAccountId());
            } else {
                // Chưa xong — có thể thiếu thông tin
                return new HostStatusResponse(false, "Onboarding incomplete", user.getStripeAccountId());
            }
        } catch (StripeException e) {
            log.error("Failed to retrieve account for user {}", userId, e);
            throw new RuntimeException("Cannot verify account status", e);
        }
    }

    /**
     * refresh_url handler: tạo lại onboarding link mới (link cũ đã expired).
     */
    public String refreshOnboardingLink(UUID userId) {
        User user = userRepository.findByKeycloakUserId(userId.toString())
                .orElseThrow(() -> new RuntimeException("User not found"));

        if (user.getStripeAccountId() == null) {
            throw new RuntimeException("No Stripe account to refresh");
        }

        return generateAccountLink(user.getStripeAccountId(), userId);
    }
}
