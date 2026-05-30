# Current Booking System Analysis

Ngày phân tích: 2026-05-30

## Phạm vi source đã đọc

Các phần liên quan chính:

- `booking-service`: controller, service, entity, repository, scheduler, migration, Feign clients, config.
- `payment-service`: checkout, Stripe webhook, payment/refund/payout/transaction/payment-method services, entities, repositories, schedulers, migration, config.
- `api-gateway`: route mapping và security cho `/api/v1/bookings/**`, `/api/v1/payments/**`, `/api/v1/refunds/**`, `/api/v1/transactions/**`, `/api/v1/payment-methods/**`.
- `airbnb-client`: API wrapper `src/api/endpoints/booking.ts`, booking types, checkout/payment form, trips detail/manage, host reservations.
- `user-service`: Stripe Connect onboarding và API lấy Stripe account của host.

## Tổng quan kiến trúc hiện tại

Booking và Reservation hiện dùng chung entity `Booking` trong `booking-service`. Khác biệt chủ yếu nằm ở góc nhìn API/UI:

- Guest gọi booking APIs để xem trips, booking detail, cancel booking.
- Host gọi reservation APIs để xem dashboard, detail, check-in, complete, cancel reservation.
- Payment Service tạo booking qua Booking Service, tạo Stripe PaymentIntent, nhận webhook Stripe, sau đó cập nhật booking sang `PAID`.
- Refund Service tồn tại riêng trong Payment Service, thao tác trên `Transaction`, `Payment`, `Refund`, Stripe Refund và Stripe Transfer Reversal, nhưng hiện chưa được nối trực tiếp từ flow guest/host cancel booking.
- Payout được tạo sau payment thành công và được scheduler xử lý sau khi booking đã check-in/completed theo rule hiện tại.

## Booking Lifecycle hiện tại

### Tạo booking

Flow chính bắt đầu từ frontend checkout:

1. Frontend route `/checkout/[roomId]` hiển thị Stripe Elements với `mode: "payment"`.
2. Khi user bấm xác nhận, frontend gọi `POST /api/v1/payments/checkout`.
3. API Gateway route request tới Payment Service `/payments/checkout`.
4. `PaymentService.checkout()` gọi Booking Service `POST /bookings/` bằng JWT của user.
5. `BookingService.createBooking()`:
   - Lấy guestId từ JWT subject.
   - Validate `checkOutDate > checkInDate`.
   - Acquire PostgreSQL advisory transaction lock theo `listingId`.
   - Query conflict với các booking có status `PENDING_PAYMENT`, `PAID`, `CHECKED_IN`.
   - Gọi Listing Service lấy listing và hostId.
   - Tính `totalNights`.
   - Tính `totalPrice = totalNights * listing.pricing.basePrice`.
   - Tạo booking status `PENDING_PAYMENT`.
   - `@PrePersist` set `createdAt`, `updatedAt`, `expiresAt = createdAt + 15 minutes`.
6. Payment Service tiếp tục tạo Stripe PaymentIntent và lưu `payments`.

Điểm đáng chú ý: frontend tự hiển thị breakdown gồm base price, cleaning fee, service fee, nhưng Booking Service hiện chỉ tính `totalPrice` bằng `basePrice * nights`; `cleaningFee` và `serviceFee` trong booking default về 0 nếu không được set.

### Chống double-booking

Booking Service dùng 2 lớp:

- `pg_advisory_xact_lock(hashtext(listingId))` để serialize các transaction tạo booking cùng listing.
- Query overlap loại trừ các booking active status `PENDING_PAYMENT`, `PAID`, `CHECKED_IN`.

Migration có comment tùy chọn PostgreSQL GiST exclusion constraint, nhưng constraint này đang chưa được bật.

### Expire booking

Booking pending có hold 15 phút:

- `Booking.expiresAt` được set khi persist.
- `BookingExpirationScheduler` chạy mỗi 60 giây mặc định.
- `expirePendingBookings()` tìm `PENDING_PAYMENT` có `expiresAt <= now`, lock row, set status `EXPIRED`.

Frontend cũng tự tính countdown từ `expiresAt` và có thể render effective status `EXPIRED` trước khi backend scheduler update DB.

### Payment confirmed

Khi Stripe gửi `payment_intent.succeeded`:

1. Payment webhook verify signature.
2. Lấy `bookingId` từ PaymentIntent metadata.
3. Payment Service set `Payment.status = SUCCEEDED`.
4. Payment Service gọi Booking Service `POST /bookings/{id}/status` bằng service token.
5. Booking Service validate transition `PENDING_PAYMENT -> PAID`.
6. Booking set `paymentIntentId` và `paidAt`.

### Guest cancel

Guest gọi `POST /api/v1/bookings/{id}/cancel`:

- Chỉ owner guest mới cancel được.
- Nếu booking `PENDING_PAYMENT` đã quá hạn thì backend set status `EXPIRED` rồi trả `409`.
- Chỉ cho cancel khi status là `PENDING_PAYMENT` hoặc `PAID`.
- Set `status = CANCELLED`, `cancelledAt`, `cancellationReason`.

Điểm đáng chú ý: cancel booking không gọi Refund Service và không tự tạo refund nếu booking đã `PAID`.

### Host reservation management

Host dùng reservation APIs nhưng vẫn update entity `Booking`:

- `PAID -> CHECKED_IN`
- `CHECKED_IN -> COMPLETED`
- `PENDING_PAYMENT|PAID|CHECKED_IN -> CANCELLED` theo state machine chung

Host API chặn host tự set `PAID` hoặc `EXPIRED` vì các status này thuộc payment/expiry flow.

## Payment Lifecycle hiện tại

### Checkout

API chính: `POST /api/v1/payments/checkout`.

`PaymentService.checkout()`:

1. Lấy guestId từ JWT.
2. Map request sang `CreateBookingRequest`.
3. Gọi Booking Service tạo booking `PENDING_PAYMENT`.
4. Gọi User Service `GET /users/stripe/{hostId}` lấy `hostStripeAccountId`.
5. Nếu host chưa onboard Stripe Connect thì throw error.
6. Tính platform fee cố định `10%`.
7. Tạo Stripe PaymentIntent:
   - amount = booking total amount.
   - currency = request currency lowercase.
   - automatic payment methods enabled.
   - metadata gồm `bookingId`, `guestId`, `hostId`, `hostStripeAccountId`, `platformFeeAmount`, `hostAmount`.
   - idempotency key từ `Idempotency-Key` header hoặc `bookingId`.
8. Lưu `Payment` status `CREATED`.
9. Trả `clientSecret`, `paymentIntentId`, `publishableKey`, `bookingId`, `expiresAt`.

Frontend sau đó gọi `stripe.confirmPayment()` với `clientSecret`.

### Stripe webhook

API: `POST /api/v1/payments/webhook`, được gateway public permit và route tới Payment Service `/payments/webhook`.

Controller:

- Verify `Stripe-Signature` bằng `stripe.webhook-secret`.
- Chỉ xử lý event có prefix `payment_intent.`.
- Deserialize PaymentIntent.
- Lấy `bookingId` từ metadata.
- Gọi `PaymentService.handleWebhookEvent()`.

Payment Service:

- Ghi `stripe_webhook_events` trước khi side effect.
- Nếu `event_id` duplicate thì skip.
- Event supported:
  - `payment_intent.succeeded`
  - `payment_intent.payment_failed`
  - `payment_intent.canceled`
- Sau khi xử lý thành công, mark webhook `PROCESSED`; lỗi thì mark `FAILED`.

### Payment succeeded

Khi `payment_intent.succeeded`:

- Payment status chuyển `CREATED -> SUCCEEDED`.
- Lưu `succeededAt`, `stripeEventId`, `webhookPayload`.
- Booking status chuyển `PENDING_PAYMENT -> PAID`.
- Tạo `Transaction` type `PAYMENT`, status `COMPLETED`, gatewayTransactionId = PaymentIntent ID.
- Tạo `Payout` nếu chưa có:
  - status `PENDING_CHECKIN`.
  - payoutAmount/hostEarnings = host amount.
  - platformFee = 10%.
  - scheduledAt = `booking.checkInDate.atStartOfDay().plusDays(1)`.
- Publish Kafka event `payment.succeeded`.

### Payment failed/cancelled

Khi Stripe event failed/canceled:

- Payment status set `FAILED` hoặc `CANCELLED`.
- Lưu event payload/failure message.
- Booking status hiện không bị update sang `CANCELLED` hay `EXPIRED`.
- Guest có thể retry về mặt booking cho tới khi hold hết hạn, nhưng code hiện tạo checkout mới sẽ tạo booking mới, không reuse booking cũ theo `bookingId`.

### Reconciliation

Có `PaymentReconciliationScheduler`, nhưng mặc định disabled:

- Config `payment.reconciliation.enabled=false`.
- Khi bật, scheduler fetch toàn bộ local payments, retrieve Stripe PaymentIntent, map status về local `PaymentStatus`.
- Chỉ cập nhật Payment local, không cập nhật Booking hay Transaction.

## Payout Lifecycle hiện tại

Payout không được user gọi trực tiếp; được tạo sau payment success và xử lý bằng scheduler.

States đang dùng bằng string:

- `PENDING_CHECKIN`
- `SCHEDULED`
- `PROCESSING`
- `COMPLETED`
- `RETRY`
- `FAILED`
- `CANCELLED`
- `REVERSED`

Flow:

1. Sau payment success, tạo payout `PENDING_CHECKIN`.
2. `PayoutScheduler` chạy mỗi 60 giây mặc định.
3. Query payout due với status `PENDING_CHECKIN`, `SCHEDULED`, `RETRY`.
4. Gọi Booking Service lấy booking.
5. Nếu booking `CANCELLED`, payout set `CANCELLED`.
6. Nếu booking chưa `CHECKED_IN` hoặc `COMPLETED`, payout giữ `PENDING_CHECKIN`, schedule lại sau 30 phút.
7. Nếu đã check-in/completed nhưng chưa qua eligible time, payout set `SCHEDULED`.
8. Khi đủ điều kiện, tạo Stripe Transfer tới `hostStripeAccountId` bằng idempotency key `payout_{payoutId}`.
9. Thành công set `COMPLETED`, lưu `stripeTransferId`, publish `payout.completed`.
10. Stripe lỗi thì retry bounded; sau 5 lần set `FAILED`.

## Refund Lifecycle hiện tại

Refund flow tồn tại ở Payment Service nhưng hiện không tự chạy khi guest/host cancel booking.

API chính: `POST /api/v1/refunds`.

Flow `RefundService.processRefund()`:

1. Input `transactionId`, `refundAmount`, `refundType`, `refundReason`, `refundDetails`.
2. Load original transaction.
3. Load payment theo `originalTransaction.bookingId`.
4. Validate amount > 0 và không vượt `payment.amount - payment.refundedAmount`.
5. Tạo refund transaction type `REFUND`, status `PROCESSING`.
6. Tạo `Refund` status `PROCESSING`.
7. Nếu payout của booking đã `COMPLETED`, retrieve Stripe Transfer và tạo transfer reversal:
   - reversal amount = min(refundAmount, completedPayout.hostEarnings).
   - payout set `REVERSED`.
8. Gọi Stripe Refund theo PaymentIntent với idempotency key `refund_{refundId}`.
9. Thành công:
   - Refund set `COMPLETED`, lưu `gatewayRefundId`, `completedAt`.
   - Refund transaction set `COMPLETED`.
   - Payment `refundedAmount` tăng.
   - Payment status set `REFUNDED` nếu refund full, ngược lại `PARTIALLY_REFUNDED`.
   - Publish Kafka `refund.completed`.
10. Stripe lỗi:
   - Refund set `FAILED`.
   - Refund transaction set `FAILED`.
   - Không cập nhật booking status.

Điểm đáng chú ý:

- Request có `refundType`, nhưng service tự tính `refundType` theo amount full/partial, không dùng request `refundType`.
- Refund status là string, không có enum.
- Không có webhook xử lý Stripe `refund.*` events.
- Không có integration từ `BookingService.cancelMyBooking()` sang `RefundService.processRefund()`.

## API đang sử dụng

### Gateway public prefix

API Gateway dùng prefix `/api/v1` và route:

- `/api/v1/bookings/**` -> Booking Service `http://localhost:8086`, strip `/api/v1`.
- `/api/v1/payments/**` -> Payment Service `http://localhost:8087`, strip `/api/v1`.
- `/api/v1/refunds/**` -> Payment Service.
- `/api/v1/transactions/**` -> Payment Service.
- `/api/v1/payment-methods/**` -> Payment Service.

Gateway public permit:

- `/api/v1/payments/webhook`
- user auth, listings, ratings, profile

Các API còn lại yêu cầu JWT tại gateway.

### Booking Service APIs

Context path: `/bookings`.

- `POST /bookings/`: tạo booking `PENDING_PAYMENT`.
- `GET /bookings?statuses=...`: lấy booking của guest theo status.
- `GET /bookings/{id}`: lấy booking basic.
- `GET /bookings/{id}/detail`: lấy detail cho guest hiện tại.
- `POST /bookings/{id}/cancel`: guest cancel booking.
- `GET /bookings/me?type=ALL|UPCOMING|COMPLETED|CANCELLED`: danh sách trips của guest.
- `GET /bookings/host/listings/{listingId}/reservations?statuses=...`: reservation theo listing.
- `GET /bookings/host/reservations`: dashboard host, support `listingId`, `statuses`, `search`, `dateFrom`, `dateTo`, `page`, `size`.
- `GET /bookings/host/reservations/{reservationId}`: detail reservation cho host/admin.
- `PATCH /bookings/host/reservations/{reservationId}/status`: host/admin update status.
- `POST /bookings/{id}/status`: update status chung, payment service đang dùng.
- `POST /bookings/{id}/check-in`: convenience endpoint, set `CHECKED_IN`.
- `POST /bookings/{id}/complete`: convenience endpoint, set `COMPLETED`.

Frontend hiện dùng chủ yếu:

- `POST /api/v1/payments/checkout`
- `GET /api/v1/bookings/me`
- `GET /api/v1/bookings/{bookingId}/detail`
- `POST /api/v1/bookings/{bookingId}/cancel`
- `GET /api/v1/bookings/host/reservations`
- `GET /api/v1/bookings/host/reservations/{reservationId}`
- `PATCH /api/v1/bookings/host/reservations/{reservationId}/status`

### Payment Service APIs

Context path: `/payments`.

- `POST /payments/checkout`: tạo booking + Stripe PaymentIntent.
- `POST /payments/webhook`: Stripe webhook.

Payment Method APIs:

- `POST /payments/api/v1/payment-methods?userId=...`
- `GET /payments/api/v1/payment-methods?userId=...`
- `GET /payments/api/v1/payment-methods/{id}`
- `DELETE /payments/api/v1/payment-methods/{id}`
- `PUT /payments/api/v1/payment-methods/{id}/set-default?userId=...`

Transaction APIs:

- `POST /payments/api/v1/transactions`
- `GET /payments/api/v1/transactions/{id}`
- `GET /payments/api/v1/transactions/booking/{bookingId}`
- `GET /payments/api/v1/transactions/user/payments/{userId}`
- `GET /payments/api/v1/transactions/user/payouts/{userId}`

Refund APIs:

- `POST /payments/api/v1/refunds`
- `GET /payments/api/v1/refunds/{id}`
- `GET /payments/api/v1/refunds/transaction/{transactionId}`

Lưu ý route path: Payment Service có context path `/payments`, nhưng các controller `RefundController`, `TransactionController`, `PaymentMethodController` lại khai báo `@RequestMapping("/api/v1/...")`. Qua gateway `StripPrefix=2`, request `/api/v1/refunds` sẽ route thành `/refunds`, không khớp với `/payments/api/v1/refunds` nếu context path active. Đây là điểm cần kiểm tra runtime; tài liệu này ghi theo code hiện tại, không sửa.

### User Service Stripe Connect APIs liên quan

Payment Service dùng:

- `GET http://localhost:8082/users/stripe/{hostId}` để lấy Stripe account ID của host.

Frontend host onboarding dùng qua user API:

- `POST /users/stripe/onboard`
- `GET /users/stripe/status`
- `GET /users/stripe/refresh`

## Database schema hiện tại

Schema được xác định từ JPA entity và migration. Cả Booking Service và Payment Service đang dùng `spring.jpa.hibernate.ddl-auto=update`, nên entity cũng là nguồn schema thực tế ngoài migration.

### booking_db

#### `bookings`

Các cột chính:

- `booking_id UUID PK`
- `version BIGINT NOT NULL`
- `payment_intent_id VARCHAR`
- `listing_id UUID NOT NULL`
- `guest_id UUID NOT NULL`
- `host_id UUID`
- `check_in_date DATE NOT NULL`
- `check_out_date DATE NOT NULL`
- `expires_at TIMESTAMP NOT NULL`
- `total_nights INTEGER`
- `num_adults INTEGER`
- `num_children INTEGER`
- `num_infants INTEGER`
- `num_pets INTEGER`
- `status VARCHAR NOT NULL`
- `total_price NUMERIC(10,2)` theo annotation nhưng Java field là `long`
- `cleaning_fee NUMERIC(10,2)`
- `service_fee NUMERIC(10,2)`
- `currency VARCHAR(3)`
- `guest_notes VARCHAR(500)`
- `paid_at TIMESTAMP`
- `checked_in_at TIMESTAMP`
- `completed_at TIMESTAMP`
- `cancelled_at TIMESTAMP`
- `cancellation_reason VARCHAR(500)`
- `created_at TIMESTAMP NOT NULL`
- `updated_at TIMESTAMP NOT NULL`

Indexes/entity:

- `idx_bookings_listing` trên `listing_id`
- `idx_bookings_guest` trên `guest_id`
- `idx_bookings_host` trên `host_id`
- `idx_bookings_status` trên `status`
- `idx_bookings_dates` trên `listing_id, check_in_date, check_out_date`
- `idx_bookings_host_listing_status` trên `host_id, listing_id, status`
- Migration thêm `idx_bookings_listing_dates`
- Migration thêm `idx_bookings_expiry` trên `status, expires_at`

#### `outbox_events`

Entity tồn tại nhưng chưa thấy service/repository/poller sử dụng.

- `id UUID PK`
- `saga_id UUID`
- `event_type VARCHAR NOT NULL`
- `payload JSONB NOT NULL`
- `published BOOLEAN NOT NULL`
- `created_at TIMESTAMP`

#### `saga_state`

Entity tồn tại nhưng chưa thấy service/repository sử dụng.

- `saga_id UUID PK`
- `booking_id UUID NOT NULL`
- `current_step VARCHAR NOT NULL`
- `status VARCHAR NOT NULL`
- `payload JSONB`
- `created_at TIMESTAMP`
- `updated_at TIMESTAMP`

### payment_db

#### `payments`

- `id UUID PK`
- `version BIGINT NOT NULL`
- `booking_id UUID NOT NULL UNIQUE`
- `guest_id UUID`
- `host_id UUID`
- `host_stripe_account_id VARCHAR`
- `stripe_payment_intent_id VARCHAR NOT NULL UNIQUE`
- `stripe_charge_id VARCHAR`
- `client_secret VARCHAR NOT NULL`
- `amount BIGINT NOT NULL`
- `platform_fee_amount BIGINT NOT NULL DEFAULT 0`
- `host_amount BIGINT NOT NULL DEFAULT 0`
- `refunded_amount BIGINT NOT NULL DEFAULT 0`
- `amount_decimal NUMERIC(12,2)`
- `currency VARCHAR(3) NOT NULL`
- `status VARCHAR NOT NULL`
- `stripe_event_id VARCHAR`
- `webhook_payload TEXT`
- `failure_message VARCHAR`
- `created_at TIMESTAMP NOT NULL`
- `updated_at TIMESTAMP`
- `succeeded_at TIMESTAMP`

Indexes:

- `idx_payments_booking`
- `idx_payments_pi`
- `idx_payments_status`

#### `stripe_webhook_events`

- `event_id VARCHAR(255) PK`
- `event_type VARCHAR(100) NOT NULL`
- `payment_intent_id VARCHAR`
- `payload TEXT`
- `status VARCHAR(30) NOT NULL`
- `failure_reason TEXT`
- `received_at TIMESTAMP NOT NULL`
- `processed_at TIMESTAMP`

#### `transactions`

- `transaction_id UUID PK`
- `booking_id UUID NOT NULL`
- `payer_id UUID NOT NULL`
- `payee_id UUID NOT NULL`
- `payment_method_id UUID FK nullable`
- `transaction_type VARCHAR(50) NOT NULL`
- `amount NUMERIC(10,2) NOT NULL`
- `currency VARCHAR(3) NOT NULL`
- `status VARCHAR(50) NOT NULL`
- `gateway_transaction_id VARCHAR(255)`
- `gateway_response JSONB`
- `failure_reason TEXT`
- `description TEXT`
- `initiated_at TIMESTAMP NOT NULL`
- `completed_at TIMESTAMP`
- `created_at TIMESTAMP NOT NULL`

Indexes:

- `idx_transactions_booking`
- `idx_transactions_payer`
- `idx_transactions_payee`
- `idx_transactions_status`
- `idx_transactions_gateway`

#### `refunds`

- `refund_id UUID PK`
- `original_transaction_id UUID NOT NULL FK transactions`
- `refund_transaction_id UUID FK transactions`
- `refund_amount NUMERIC(10,2) NOT NULL`
- `refund_type VARCHAR(50) NOT NULL`
- `refund_reason VARCHAR(100) NOT NULL`
- `refund_details TEXT`
- `status VARCHAR(50) NOT NULL`
- `processed_by UUID`
- `gateway_refund_id VARCHAR(255)`
- `initiated_at TIMESTAMP NOT NULL`
- `completed_at TIMESTAMP`

Indexes:

- `idx_refunds_original`
- `idx_refunds_status`

#### `payouts`

- `payout_id UUID PK`
- `host_id UUID NOT NULL`
- `booking_id UUID NOT NULL`
- `payment_id UUID`
- `host_stripe_account_id VARCHAR`
- `transaction_id UUID FK transactions`
- `payout_amount NUMERIC(10,2) NOT NULL`
- `platform_fee NUMERIC(10,2) NOT NULL`
- `host_earnings NUMERIC(10,2) NOT NULL`
- `currency VARCHAR(3) NOT NULL`
- `payout_method VARCHAR(50) NOT NULL`
- `stripe_transfer_id VARCHAR UNIQUE nullable`
- `stripe_transfer_reversal_id VARCHAR`
- `payout_details JSONB`
- `status VARCHAR(50) NOT NULL`
- `failure_reason TEXT`
- `retry_count INTEGER NOT NULL DEFAULT 0`
- `next_retry_at TIMESTAMP`
- `scheduled_at TIMESTAMP NOT NULL`
- `processed_at TIMESTAMP`
- `created_at TIMESTAMP NOT NULL`

Indexes:

- `idx_payouts_host`
- `idx_payouts_booking`
- `idx_payouts_status`
- `idx_payouts_scheduled`
- `idx_payouts_due`
- partial unique `idx_payouts_stripe_transfer`

#### `payment_methods`

- `payment_method_id UUID PK`
- `user_id UUID NOT NULL`
- `method_type VARCHAR(50) NOT NULL`
- `provider VARCHAR(50) NOT NULL`
- `token VARCHAR(255) NOT NULL`
- `last_four_digits VARCHAR(4)`
- `card_brand VARCHAR(50)`
- `expiry_month INTEGER`
- `expiry_year INTEGER`
- `cardholder_name VARCHAR(200)`
- `is_default BOOLEAN NOT NULL`
- `is_verified BOOLEAN NOT NULL`
- `created_at TIMESTAMP NOT NULL`
- `updated_at TIMESTAMP NOT NULL`

Indexes:

- `idx_payment_methods_user`
- `idx_payment_methods_token`

#### `payment_audit_logs`

- `log_id UUID PK`
- `transaction_id UUID FK transactions nullable`
- `action VARCHAR(100) NOT NULL`
- `performed_by UUID`
- `ip_address VARCHAR(45)`
- `user_agent TEXT`
- `request_data JSONB`
- `response_data JSONB`
- `status VARCHAR(50) NOT NULL`
- `created_at TIMESTAMP NOT NULL`

#### `platform_fees`

- `fee_id UUID PK`
- `fee_type VARCHAR(50) NOT NULL`
- `percentage NUMERIC(5,2) NOT NULL`
- `fixed_amount NUMERIC(10,2)`
- `min_amount NUMERIC(10,2)`
- `max_amount NUMERIC(10,2)`
- `currency VARCHAR(3) NOT NULL`
- `effective_from DATE NOT NULL`
- `effective_to DATE`
- `is_active BOOLEAN NOT NULL`
- `created_at TIMESTAMP NOT NULL`

### user_db liên quan Stripe

Trong `users`:

- `stripe_account_id VARCHAR UNIQUE`
- `stripe_account_status VARCHAR`

Enum `StripeAccountStatus`:

- `NONE`
- `PENDING`
- `ACTIVE`

## Các trạng thái hiện có

### BookingStatus

Enum backend và frontend đều có:

- `PENDING_PAYMENT`: booking vừa tạo, đang chờ thanh toán.
- `PAID`: Stripe webhook succeeded đã xác nhận payment.
- `CHECKED_IN`: host đánh dấu guest đã check-in.
- `COMPLETED`: host đánh dấu hoàn tất sau stay.
- `EXPIRED`: pending payment quá hạn.
- `CANCELLED`: guest hoặc host cancel.

Transition hợp lệ trong Booking Service:

- `PENDING_PAYMENT -> PAID | EXPIRED | CANCELLED`
- `PAID -> CHECKED_IN | CANCELLED`
- `CHECKED_IN -> COMPLETED | CANCELLED`
- `EXPIRED`, `CANCELLED`, `COMPLETED` là terminal.

### PaymentStatus

Enum:

- `CREATED`
- `SUCCEEDED`
- `FAILED`
- `CANCELLED`
- `PARTIALLY_REFUNDED`
- `REFUNDED`

Transition thực tế:

- Checkout tạo `CREATED`.
- Webhook succeeded set `SUCCEEDED`.
- Webhook payment_failed set `FAILED`.
- Webhook canceled set `CANCELLED`.
- Refund success set `PARTIALLY_REFUNDED` hoặc `REFUNDED`.

### WebhookEventStatus

Enum:

- `RECEIVED`
- `PROCESSED`
- `FAILED`

### SagaStatus

Enum tồn tại nhưng chưa được dùng trong flow hiện tại:

- `STARTED`
- `PROCESSING`
- `COMPLETED`
- `COMPENSATING`
- `COMPENSATED`
- `FAILED`

### Transaction status

String, không có enum. Code/comment đang dùng:

- `PENDING`
- `PROCESSING`
- `COMPLETED`
- `FAILED`
- `CANCELLED`
- `REFUNDED`

Flow hiện tại:

- Simulated `TransactionService.processPayment()` tạo `PENDING` rồi update `COMPLETED`.
- Stripe payment success tạo trực tiếp transaction `COMPLETED`.
- Refund tạo transaction `PROCESSING`, rồi `COMPLETED` hoặc `FAILED`.

### Refund status

String, không có enum:

- `PENDING` được comment nhắc tới nhưng process hiện tạo `PROCESSING`.
- `PROCESSING`
- `COMPLETED`
- `FAILED`

### Payout status

String, không có enum:

- `PENDING_CHECKIN`
- `SCHEDULED`
- `PROCESSING`
- `COMPLETED`
- `RETRY`
- `FAILED`
- `CANCELLED`
- `REVERSED`

### StripeAccountStatus

Enum ở User Service:

- `NONE`
- `PENDING`
- `ACTIVE`

## Điểm lệch/rủi ro hiện tại cần lưu ý

- Guest/host cancel booking không trigger refund, dù UI có hiển thị potential refund/refund policy.
- Refund API yêu cầu `transactionId`, trong khi booking cancel API chỉ biết `bookingId`; chưa có orchestration nối 2 luồng.
- Payment failed/canceled chỉ update `Payment`, không update `Booking`; booking chỉ hết hạn bằng scheduler.
- `POST /api/v1/payments/checkout` luôn tạo booking mới trước khi tạo PaymentIntent; flow "Complete payment" từ pending booking hiện không reuse bookingId cũ.
- Payment Service controller paths cho refunds/transactions/payment-methods có thể lệch với gateway route vì service context path là `/payments` nhưng controllers lại có `/api/v1/...`.
- Booking Service `SecurityConfig` hiện toàn bộ đang comment; cần xác nhận runtime security default từ dependency/config nếu deploy thật.
- Booking DB có `OutboxEvent` và `SagaState`, nhưng chưa thấy code sử dụng outbox/saga trong lifecycle hiện tại.
- Payment Service publish Kafka events, nhưng không thấy consumer trong Booking Service cho payment/refund/payout events.
- Amount đang dùng `long` cho Stripe amount và booking total; currency/cents convention chưa rõ. Với Stripe, amount phải là đơn vị nhỏ nhất theo currency, còn frontend/Booking đang dùng giá listing trực tiếp.
- Booking Service tính total khác frontend checkout breakdown vì chưa cộng cleaning fee/service fee từ listing pricing.
- `Payment.clientSecret` được lưu DB; cần cân nhắc retention/security khi đi production.
