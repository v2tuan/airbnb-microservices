# Payment Service

Payment Service xử lý toàn bộ các giao dịch thanh toán, hoàn tiền và quản lý thông tin thanh toán của người dùng.

## 📦 Cấu trúc Project

```
payment-service/
├── src/main/java/com/paymentservice/
│   ├── controller/
│   │   ├── PaymentMethodController.java
│   │   ├── TransactionController.java
│   │   └── RefundController.java
│   ├── service/
│   │   ├── PaymentMethodService.java
│   │   ├── TransactionService.java
│   │   └── RefundService.java
│   ├── entity/
│   │   ├── PaymentMethod.java
│   │   ├── Transaction.java
│   │   ├── Refund.java
│   │   ├── Payout.java
│   │   ├── PaymentAuditLog.java
│   │   └── PlatformFee.java
│   ├── repository/
│   ├── mapper/
│   ├── dto/
│   └── PaymentServiceApplication.java
├── src/main/resources/
│   └── application.yaml
└── pom.xml
```

## 🚀 Chạy Service

```bash
# Terminal 5
cd payment-service
mvn spring-boot:run
```

Service sẽ chạy trên port **8085**

## 📡 API Endpoints

### Payment Methods

#### 1. Create Payment Method
```bash
POST http://localhost:8888/api/v1/payment-methods?userId={userId}
Content-Type: application/json

{
  "methodType": "CREDIT_CARD",
  "provider": "VISA",
  "token": "token_xxx",
  "lastFourDigits": "4242",
  "cardBrand": "VISA",
  "expiryMonth": 12,
  "expiryYear": 2025,
  "cardholderName": "John Doe",
  "isDefault": true
}
```

#### 2. Get User Payment Methods
```bash
GET http://localhost:8888/api/v1/payment-methods?userId={userId}
```

#### 3. Get Payment Method
```bash
GET http://localhost:8888/api/v1/payment-methods/{paymentMethodId}
```

#### 4. Set As Default
```bash
PUT http://localhost:8888/api/v1/payment-methods/{paymentMethodId}/set-default?userId={userId}
```

#### 5. Delete Payment Method
```bash
DELETE http://localhost:8888/api/v1/payment-methods/{paymentMethodId}
```

---

### Transactions

#### 1. Process Payment
```bash
POST http://localhost:8888/api/v1/transactions
Content-Type: application/json

{
  "bookingId": "uuid",
  "payerId": "uuid",
  "payeeId": "uuid",
  "paymentMethodId": "uuid",
  "amount": 1000000,
  "currency": "VND",
  "description": "Booking payment"
}
```

#### 2. Get Transaction
```bash
GET http://localhost:8888/api/v1/transactions/{transactionId}
```

#### 3. Get Booking Transactions
```bash
GET http://localhost:8888/api/v1/transactions/booking/{bookingId}
```

#### 4. Get User Payments (Payer)
```bash
GET http://localhost:8888/api/v1/transactions/user/payments/{userId}
```

#### 5. Get User Payouts (Payee/Host)
```bash
GET http://localhost:8888/api/v1/transactions/user/payouts/{userId}
```

---

### Refunds

#### 1. Process Refund
```bash
POST http://localhost:8888/api/v1/refunds
Content-Type: application/json

{
  "transactionId": "uuid",
  "refundAmount": 1000000,
  "refundType": "FULL",
  "refundReason": "Customer request",
  "refundDetails": "Refund details here"
}
```

#### 2. Get Refund
```bash
GET http://localhost:8888/api/v1/refunds/{refundId}
```

#### 3. Get Transaction Refunds
```bash
GET http://localhost:8888/api/v1/refunds/transaction/{transactionId}
```

---

## 🗄️ Database Tables

### 1. payment_methods
Thông tin phương thức thanh toán của người dùng

**Indexes:**
- `idx_payment_methods_user` (user_id)
- `idx_payment_methods_token` (token)

### 2. transactions
Giao dịch thanh toán chính

**Trạng thái:** PENDING → PROCESSING → COMPLETED/FAILED

**Indexes:**
- `idx_transactions_booking` (booking_id)
- `idx_transactions_payer` (payer_id)
- `idx_transactions_payee` (payee_id)
- `idx_transactions_status` (status)
- `idx_transactions_gateway` (gateway_transaction_id)

### 3. refunds
Giao dịch hoàn tiền

**Indexes:**
- `idx_refunds_original` (original_transaction_id)
- `idx_refunds_status` (status)

### 4. payouts
Thanh toán cho host

**Indexes:**
- `idx_payouts_host` (host_id)
- `idx_payouts_booking` (booking_id)
- `idx_payouts_status` (status)
- `idx_payouts_scheduled` (scheduled_at)

### 5. payment_audit_logs
Audit trail cho tất cả thao tác thanh toán

**Indexes:**
- `idx_audit_logs_transaction` (transaction_id)
- `idx_audit_logs_time` (created_at)
- `idx_audit_logs_action` (action)

### 6. platform_fees
Cấu hình phí nền tảng

**Indexes:**
- `idx_platform_fees_type` (fee_type)
- `idx_platform_fees_effective` (effective_from, effective_to)

---

## 🔐 Database Credentials (Neon)

```
URL: ep-divine-math-a1lyqysl-pooler.ap-southeast-1.aws.neon.tech
User: neondb_owner
Password: npg_GnXE70sJUjmu
Database: payment_db
```

---

## 📝 Implementation Status

✅ **Completed:**
- Entity classes with relationships
- Repository interfaces
- Service layer with business logic
- REST controllers
- DTOs for requests/responses
- Mappers
- API Gateway routing

⏳ **TODO:**
- Payment gateway integration (Stripe, Momo, VNPay)
- Webhook handlers for payment confirmation
- Transaction reconciliation logic
- Email notifications
- Unit & integration tests
- Security: JWT validation in controllers
- Error handling & custom exceptions

---

## 🔗 Integration Points

### With User Service
- Validate `payerId` and `payeeId` exist in user service

### With Listing Service
- Get booking details and pricing

### With API Gateway
- Routes: `/api/v1/payment-methods/**`, `/api/v1/transactions/**`, `/api/v1/refunds/**`
- Port: 8085

---

## 💡 Usage Example

```bash
# 1. Create payment method
curl -X POST http://localhost:8888/api/v1/payment-methods?userId=user123 \
  -H "Content-Type: application/json" \
  -d '{
    "methodType": "CREDIT_CARD",
    "provider": "VISA",
    "token": "stripe_token_xxx",
    "lastFourDigits": "4242",
    "isDefault": true
  }'

# 2. Process payment
curl -X POST http://localhost:8888/api/v1/transactions \
  -H "Content-Type: application/json" \
  -d '{
    "bookingId": "booking123",
    "payerId": "user1",
    "payeeId": "host1",
    "paymentMethodId": "pm123",
    "amount": 1000000,
    "currency": "VND"
  }'

# 3. Process refund
curl -X POST http://localhost:8888/api/v1/refunds \
  -H "Content-Type: application/json" \
  -d '{
    "transactionId": "tx123",
    "refundAmount": 1000000,
    "refundType": "FULL",
    "refundReason": "Customer request"
  }'
```
