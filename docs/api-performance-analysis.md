# API Performance Analysis

## 1. Tổng Quan Vấn Đề

Client gặp tình trạng gọi API backend bị chậm, response time cao hơn bình thường, đặc biệt ở các màn hình có dữ liệu tổng hợp như home, host profile, host reservations và các API cần gọi qua nhiều microservice.

Hệ thống backend là kiến trúc microservices, gồm các service Spring Boot chính:

- `api-gateway`: aggregate dữ liệu từ user/listing/rating service.
- `listing-service`: quản lý listing, home sections, host listings, listing detail.
- `booking-service`: quản lý booking, availability, host reservations, cancellation, complaint.
- `rating-service`: quản lý review/rating và rating summary.
- `user-service`: quản lý user profile, host onboarding, public profile.
- `payment-service`: checkout, webhook, payout, refund, reconciliation.
- `notification-service`: email/Kafka notification.
- `activity-service`, `wishlist-service`: recommendation/activity và wishlist.

`search-service` đã được loại khỏi hướng phát triển nên không được tối ưu tiếp. `message-service` cũng không được chỉnh sửa theo yêu cầu.

Mục tiêu xử lý là giảm latency nhưng không thay đổi logic nghiệp vụ và không phá vỡ API contract hiện tại.

## 2. Nguyên Nhân Gây Chậm

### High Impact

#### 2.1 N+1 request giữa các microservice

Một số API backend trước đó xử lý danh sách entity rồi gọi service khác theo từng item:

- Listing gọi booking service từng listing để check availability.
- Listing gọi rating service từng listing để lấy rating.
- Booking host reservations gọi user service từng guest để lấy public profile.
- User public profile gọi listing/rating service theo cách dễ tạo nhiều request.

Vấn đề kỹ thuật:

- Latency tổng tăng theo số item: `total_latency = N * downstream_latency`.
- Nếu downstream service chậm, thread của service caller bị giữ lâu hơn.
- Khi nhiều client gọi cùng lúc, số request nội bộ tăng mạnh, dễ làm cạn connection pool hoặc thread pool.

Giải pháp đã áp dụng:

- Thêm batch availability trong `booking-service`.
- Thêm batch rating summary trong `rating-service`.
- Thêm batch public user profile trong `user-service` và dùng ở `booking-service`.
- `listing-service` chuyển sang gọi batch rating/availability.

#### 2.2 Host reservation enrich toàn bộ dữ liệu trước khi phân trang

API host reservations ban đầu đã gom reservation theo host ở backend, nhưng vẫn có điểm nặng: service load danh sách booking theo scope, batch fetch listing/guest cho toàn bộ danh sách, map toàn bộ sang `ReservationResponse`, sau đó mới filter/sort/slice page.

Vấn đề kỹ thuật:

- Host có nhiều reservation thì mỗi request phải enrich toàn bộ portfolio.
- Dù frontend chỉ cần page 8 item, backend vẫn phải gọi listing/user service cho nhiều booking hơn cần thiết.
- Mapping DTO, serialization và memory allocation tăng theo tổng reservation thay vì page size.

Giải pháp đã áp dụng:

- Với trường hợp không có `search`, `booking-service` dùng fast path: sort/paginate trên `Booking`, chỉ enrich current page và `nextReservations`.
- Trường hợp có `search` vẫn giữ logic cũ vì search hiện phụ thuộc field nằm ở service khác như listing title/city và guest full name.

File chính:

- `booking-service/src/main/java/com/bookingservice/service/BookingService.java`

#### 2.3 Home page/listing page bị ảnh hưởng bởi query và mapping full entity

Home sections cần listing card, nhưng nếu endpoint cũ như `GET /listings` hoặc `GET /listings/host/{hostId}` bị dùng trên frontend thì service trả full `ListingResponse`, gồm photos, amenities, pricing, house rules.

Vấn đề kỹ thuật:

- Full response làm tăng serialization payload.
- Mapping full response có thể kích hoạt lazy loading quan hệ.
- Endpoint trả toàn bộ list không phân trang có thể scale kém khi dữ liệu tăng.

Giải pháp đã áp dụng:

- Home sections đã dùng `PageRequest` và chỉ lấy số lượng giới hạn.
- Repository listing được bổ sung `@EntityGraph` cho các quan hệ thường cần khi map full response để giảm lazy loading lặp.
- Batch loading rating/availability đã được thêm để tránh gọi service từng listing.

File chính:

- `listing-service/src/main/java/com/listingservice/repository/ListingRepository.java`
- `listing-service/src/main/java/com/listingservice/service/Impl/ListingService.java`
- `listing-service/src/main/java/com/listingservice/service/RatingClient.java`
- `listing-service/src/main/java/com/listingservice/service/AvailabilityClient.java`

#### 2.4 Thiếu timeout rõ ràng cho OpenFeign/WebClient

Một số luồng dùng OpenFeign hoặc WebClient gọi service khác nhưng chưa có timeout hoặc connection pool rõ ràng.

Vấn đề kỹ thuật:

- Downstream service chậm có thể làm request chờ lâu.
- Thread xử lý request bị giữ, gây queueing.
- Gateway không giới hạn connection/pending acquire có thể bị nghẽn khi traffic tăng.
- Retry tự động ở request không idempotent có thể làm tăng tải và tạo side effect không mong muốn.

Giải pháp đã áp dụng:

- Thêm `Request.Options` cho Feign ở `booking-service`, `payment-service`, `user-service`, `notification-service`.
- Tắt Feign retry bằng `Retryer.NEVER_RETRY`.
- Thêm Reactor Netty connection pool, connect timeout, response timeout, read/write timeout trong `api-gateway`.

File chính:

- `api-gateway/src/main/java/com/apigateway/configuration/WebClientConfiguration.java`
- `booking-service/src/main/java/com/bookingservice/config/FeignConfig.java`
- `payment-service/src/main/java/com/paymentservice/config/FeignConfig.java`
- `user-service/src/main/java/com/userservice/config/FeignConfig.java`
- `notification-service/src/main/java/com/notificationservice/config/FeignConfig.java`

#### 2.5 External API call nằm trong transaction

Một số service còn gọi Stripe, Keycloak, Cloudinary hoặc service khác trong method có transaction.

Ví dụ:

- `payment-service` webhook/refund/payout/reconciliation gọi Stripe hoặc booking service.
- `user-service` register/onboarding/avatar gọi Keycloak, Stripe, Cloudinary.
- `booking-service` cancellation flow có thể gọi payment service khi transaction booking đang mở.

Vấn đề kỹ thuật:

- DB connection bị giữ trong lúc chờ network I/O.
- Nếu external API chậm, connection pool DB bị chiếm lâu.
- Lock row hoặc transaction duration tăng, làm request khác phải chờ.
- Khi scheduler xử lý nhiều record trong một transaction, tác động có thể lan ra toàn service.

Trong phạm vi đã xử lý, chưa refactor toàn bộ phần này vì cần thay đổi kiến trúc sang outbox/job async để giữ consistency. Đây là nhóm tối ưu tiếp theo nên làm.

### Medium Impact

#### 2.6 Query không phân trang hoặc phân trang sau khi xử lý memory

Một số endpoint vẫn trả list không giới hạn:

- Listing full list.
- Listing search.
- Rating by listing.
- Guest booking list.
- Complaint admin/host list.

Vấn đề kỹ thuật:

- Response payload tăng theo database size.
- Mapping và serialization tăng tuyến tính theo số record.
- Không kiểm soát `size` làm user có thể request page rất lớn.

Đã xử lý một phần:

- Host listing paginated đã dùng batch rating.
- Host reservation đã có page response.
- Một số page size được clamp ở service.

Chưa đổi toàn bộ endpoint list cũ vì có thể làm thay đổi API contract.

#### 2.7 Database N+1/lazy loading khi map DTO

MapStruct mapping `ListingResponse` cần nhiều association:

- `photos`
- `pricing`
- `houseRules`
- `listingAmenities.amenity`

Nếu query chỉ lấy `Listing`, khi mapper truy cập association sẽ phát sinh lazy query bổ sung.

Giải pháp đã áp dụng:

- Thêm `@EntityGraph(attributePaths = {"photos", "pricing", "houseRules"})` cho các query listing trả full DTO.
- Giữ `@BatchSize` trên collection trong `Listing`.
- Không đặt `@BatchSize` trực tiếp trên `ManyToOne` `ListingAmenity.amenity` vì Hibernate 7 không cho phép; annotation này đã được gỡ sau khi phát hiện lỗi startup.

#### 2.8 Scheduler xử lý batch lớn

Một số scheduler có thể scan hoặc lock nhiều record:

- Booking expiration.
- Payment reconciliation.
- Payout processing.
- Complaint auto escalation/auto close.

Vấn đề kỹ thuật:

- Lock nhiều row trong một transaction.
- Save/publish event trong loop.
- Nếu mỗi item gọi external service, thời gian batch tăng mạnh.

Chưa refactor sâu vì cần thay đổi workflow sang chunk processing/outbox. Đề xuất nằm ở phần Optional Improvements.

#### 2.9 Activity recommendation tính toán trực tiếp theo request

`activity-service` collaborative filtering có dấu hiệu build matrix và tính similarity từ nhiều dữ liệu activity trong request path.

Vấn đề kỹ thuật:

- CPU và DB query tăng theo số user/listing/activity.
- Recommendation nên là workload precompute/cache, không nên tính đầy đủ trong request realtime.

Chưa sửa trong lượt này vì không phải luồng chính home/reservation và cần thiết kế cache/read model.

### Low Impact

#### 2.10 Logging quá nhiều ở hot path

Nhiều controller/service log `INFO` trên request path. Một số log còn có nguy cơ chứa token hoặc thông tin nhạy cảm.

Vấn đề kỹ thuật:

- Logging sync hoặc log sink chậm có thể cộng thêm latency.
- Log quá nhiều làm tăng I/O.
- Log token là rủi ro bảo mật.

Đã giảm một phần trong config bằng cách tắt SQL/debug log. Cần tiếp tục review log hot path.

#### 2.11 `ddl-auto: update` ở runtime

Nhiều service dùng Hibernate `ddl-auto: update`.

Vấn đề kỹ thuật:

- Khi startup, Hibernate inspect schema và có thể thực hiện DDL.
- Không phải nguyên nhân chính của API latency runtime, nhưng ảnh hưởng startup và rủi ro production.

Đề xuất: chuyển sang migration tool như Flyway/Liquibase.

## 3. Phân Tích Chi Tiết Kỹ Thuật

### 3.1 Controller / Service / Repository Bottlenecks

#### Booking host reservations

Trước khi tối ưu:

- Controller nhận request `/host/reservations`.
- Service query booking theo host/listing/status/date.
- Service fetch listing/guest cho toàn bộ booking trong scope.
- Service map toàn bộ sang response.
- Service filter/sort/slice page trong memory.

Vấn đề:

- Page size nhỏ nhưng cost tính theo toàn bộ reservation.
- Với host có nhiều listing/reservation, latency tăng mạnh.

Sau khi tối ưu:

- Nếu không có `search`, service sort/paginate trên `Booking`.
- Chỉ enrich booking của page hiện tại và `nextReservations`.
- Stats, statusCounts, occupiedDates được tính trực tiếp từ `Booking`, không cần full DTO.

Tradeoff:

- Khi có `search`, vẫn cần enrich trước vì search phụ thuộc dữ liệu từ listing/user service.
- Muốn tối ưu triệt để search cần denormalize các field search vào booking read model.

#### Listing home sections

Trước khi tối ưu:

- Home có nguy cơ bị ảnh hưởng nếu frontend dùng endpoint full list.
- Listing card cần ảnh/pricing nhưng query full list không giới hạn sẽ nặng.

Sau khi tối ưu:

- Home sections dùng `PageRequest` theo `limit`.
- Query home fetch `photos` và `pricing`.
- Rating/availability được batch ở client nội bộ.

#### Rating listing summaries

Trước khi tối ưu:

- Listing page/host listing có thể gọi rating service từng listing.

Sau khi tối ưu:

- `rating-service` có batch summary endpoint.
- `listing-service` gọi một request batch để lấy rating summary cho nhiều listing.

### 3.2 Database Query Issues

#### N+1 query do lazy associations

Các association của `Listing` được dùng khi mapping response. Nếu không fetch graph, mỗi listing có thể gây thêm query cho photos/pricing/houseRules/amenities.

Đã cải thiện bằng:

- `@EntityGraph` cho query listing trả full DTO.
- `@BatchSize` ở collection của `Listing`.

Lưu ý Hibernate 7:

- Không được đặt `@BatchSize` trực tiếp lên `ManyToOne` property `ListingAmenity.amenity`.
- Lỗi đã gặp: `Property 'amenity' may not be annotated '@BatchSize'`.
- Đã gỡ annotation này để service startup lại.

#### Thiếu index cho query hot path

Đã thêm/cập nhật index ở entity/config cho các bảng hot path:

- Booking conflict/availability theo listing, status, date.
- Listing theo host/status/city/country/maxGuests.
- Rating theo listing/host.

Tác động:

- Query availability/search/filter giảm scan dữ liệu.
- Query dashboard và summary tận dụng index tốt hơn.

#### Query trả list không giới hạn

Một số repository/controller vẫn trả `List<>` thay vì `Page<>`. Đây là rủi ro khi dữ liệu tăng.

Không sửa contract trong lượt này để tránh phá frontend, nhưng cần deprecate dần.

### 3.3 OpenFeign / External API Latency

Các service gọi nhau qua HTTP:

- Booking -> Listing/User/Payment.
- Listing -> Booking/Rating.
- Payment -> Booking/Identity/User.
- Gateway -> User/Listing/Rating.
- Notification -> Brevo/email provider.

Trước khi tối ưu:

- Feign chưa có timeout rõ ràng ở nhiều service.
- Gateway WebClient chưa có connection provider và timeout ở Netty layer.
- Retry có thể làm request chậm hơn và tăng tải.

Sau khi tối ưu:

- Feign connect timeout: 1s.
- Feign read timeout: 3s cho internal services, 5s cho notification email client.
- Feign retry disabled.
- Gateway WebClient có connection pool, pending acquire timeout, response timeout, read/write timeout.

Tác động:

- Downstream chậm không kéo treo request quá lâu.
- Giảm nguy cơ thread starvation.
- Giảm tail latency khi một service phụ bị chậm.

### 3.4 Transaction / Locking Issues

Các pattern còn rủi ro:

- Gọi external service trong transaction.
- Giữ lock row/advisory lock trong lúc gọi network.
- Scheduler xử lý nhiều item trong một transaction.

Ví dụ:

- Booking create dùng advisory lock để chống double booking. Lock là đúng, nhưng nên hạn chế mọi network I/O trong vùng lock.
- Payment webhook/refund/payout/reconciliation nên tách external call khỏi transaction DB.
- User avatar upload không nên giữ DB transaction trong lúc upload Cloudinary.

Đã xử lý một phần:

- Payment checkout đã giảm transaction ở một số luồng trước đó.
- Service token provider cache token để giảm gọi Keycloak lặp.

Chưa xử lý triệt để:

- Cần outbox/event-driven worker để vừa giữ logic đúng vừa tránh transaction dài.

### 3.5 Serialization / Mapping Overhead

Mapping overhead xảy ra khi:

- Endpoint trả full DTO thay vì card/lightweight DTO.
- MapStruct truy cập nhiều association lazy.
- Response chứa list lớn không phân trang.

Đã cải thiện:

- Home dùng card DTO.
- Host listing paginated dùng item DTO.
- Host reservation fast path chỉ map page hiện tại.
- Listing repository fetch graph giảm lazy mapping cost.

### 3.6 Connection Pool / Thread Pool Issues

Vấn đề chính:

- Nếu downstream service chậm và không có timeout, thread xử lý request bị block.
- Nếu DB transaction giữ lâu, Hikari connection bị chiếm lâu.
- Nếu Gateway không giới hạn connection pool/pending acquire, request có thể dồn hàng khó kiểm soát.

Đã cải thiện:

- Tăng Hikari pool ở một số service cấu hình.
- Tắt SQL debug log.
- Thêm timeout/pool cho Gateway WebClient.
- Thêm Feign timeout.

### 3.7 Logging / Middleware Delay

SQL logging/debug logging đã được giảm trong config để tránh I/O log quá nhiều. Request-level `INFO` log vẫn nên review thêm, đặc biệt các log có token hoặc dữ liệu nhạy cảm.

## 4. Giải Pháp Đã Thực Hiện

### 4.1 Batch availability

Trước khi fix:

- `listing-service` check availability từng listing bằng nhiều request đến `booking-service`.

Sau khi fix:

- `booking-service` có endpoint batch availability.
- `listing-service` gọi một request để check nhiều listing.

Tác động:

- Giảm N request nội bộ xuống 1 request.
- Cải thiện latency home/search khi có nhiều listing.

### 4.2 Batch rating summary

Trước khi fix:

- Host listing/listing card có thể gọi rating service từng listing.

Sau khi fix:

- `rating-service` có batch listing rating summary.
- `listing-service` lấy rating summaries theo batch.

Tác động:

- Giảm network round-trip.
- Giảm tải rating service.
- Giữ response rating/review count như logic cũ.

### 4.3 Batch public user profile

Trước khi fix:

- Reservation list gọi user service từng guest.

Sau khi fix:

- `user-service` hỗ trợ batch public profile.
- `booking-service` dùng batch trong reservation list.

Tác động:

- Giảm N+1 HTTP call ở reservation dashboard.
- Cải thiện màn hình host reservation.

### 4.4 Host reservation fast path

Trước khi fix:

- API host reservation enrich toàn bộ scope rồi mới slice page.

Sau khi fix:

- Nếu không có `search`, service chỉ enrich page hiện tại và `nextReservations`.
- Stats/status/calendar tính từ `Booking`.

Tác động:

- Với host nhiều reservation, request page không còn phụ thuộc mạnh vào tổng số reservation.
- Giảm call sang listing/user service.
- Giảm memory allocation và DTO mapping.

### 4.5 Gateway WebClient timeout/connection pool

Trước khi fix:

- WebClient chỉ có reactive `.timeout()` ở một số flow, chưa có timeout/pool ở Netty client.

Sau khi fix:

- Thêm `ConnectionProvider`.
- Thêm connect timeout, response timeout, read timeout, write timeout.

Tác động:

- Gateway fail fast hơn khi downstream chậm.
- Giảm nguy cơ request treo lâu.
- Kiểm soát số connection/pending acquire.

### 4.6 Feign timeout và disable retry

Trước khi fix:

- Feign client ở booking/payment/user/notification chưa có timeout rõ ràng.
- Retry có thể làm tăng latency và tải.

Sau khi fix:

- Connect timeout 1s.
- Read timeout 3s cho internal service, 5s cho email provider.
- `Retryer.NEVER_RETRY`.

Tác động:

- Giảm tail latency.
- Tránh nhân tải khi downstream lỗi/chậm.
- An toàn hơn với API không idempotent.

### 4.7 Listing fetch graph

Trước khi fix:

- Mapping `ListingResponse` có thể kích hoạt lazy query cho photos/pricing/houseRules.

Sau khi fix:

- Repository query full response có `@EntityGraph` cho association chính.
- Home section đã fetch `photos`, `pricing` theo page.

Tác động:

- Giảm N+1 query trong listing response.
- Cải thiện listing/home/host listing response.

### 4.8 Service token caching trong payment

Trước khi fix:

- Payment service có thể gọi Keycloak lấy client credentials token nhiều lần.

Sau khi fix:

- `ServiceTokenProvider` cache token đến gần thời điểm hết hạn.

Tác động:

- Giảm request đến Keycloak.
- Giảm latency webhook/payment flow cần gọi booking service bằng service token.

### 4.9 Config logging/pool

Trước khi fix:

- Một số service bật SQL/debug log hoặc pool nhỏ.

Sau khi fix:

- Giảm SQL/debug logging.
- Tăng Hikari pool ở các service hot path.

Tác động:

- Giảm I/O log.
- Tăng khả năng xử lý concurrent request trong giới hạn DB cho phép.

## 5. Cách Tối Ưu Đề Xuất Thêm

### 5.1 Tách external API khỏi transaction bằng outbox/job

Nên áp dụng cho:

- Payment webhook confirm booking.
- Refund Stripe.
- Payout Stripe transfer.
- Payment reconciliation.
- User Cloudinary avatar upload.
- Stripe onboarding.
- Keycloak role/user operations.

Pattern đề xuất:

- Transaction 1: validate + persist local state + insert outbox event.
- Worker async: gọi external API.
- Transaction 2: cập nhật kết quả.
- Có retry/backoff/DLQ/idempotency key.

Lợi ích:

- DB transaction ngắn.
- Không giữ connection khi chờ network.
- Dễ retry an toàn.

### 5.2 Denormalize read model cho reservation dashboard

Nên lưu snapshot trong booking/read model:

- `listingTitle`
- `listingCity`
- `listingCountry`
- `listingCoverImageUrl`
- `guestFullName`
- `guestAvatarUrl`

Lợi ích:

- Search có thể chạy ở DB.
- Pagination đúng ở DB kể cả khi search.
- Không cần enrich toàn bộ scope trước search.

### 5.3 Chuẩn hóa pagination cho mọi endpoint list

Nên deprecate endpoint trả toàn bộ list:

- `GET /listings`
- `GET /listings/search`
- `GET /ratings/listing/{listingId}`
- Complaint list.
- Guest bookings list.

Best practice:

- Mọi list endpoint có `page`, `size`.
- Clamp `size <= 100`.
- Sort field whitelist.
- Với timeline/message/media nên dùng cursor pagination.

### 5.4 Precompute recommendation

`activity-service` nên chuyển recommendation sang precompute:

- Scheduled job build top-N recommendation per user.
- Cache Redis hoặc table read model.
- Request path chỉ đọc cache.

Lợi ích:

- Giảm CPU/DB trên request.
- Latency ổn định hơn.

### 5.5 Batch scheduler theo chunk và SKIP LOCKED

Các scheduler nên dùng:

- Batch size cố định, ví dụ 50/100.
- `FOR UPDATE SKIP LOCKED`.
- Claim job trong transaction ngắn.
- Process từng job ngoài transaction dài.
- Publish event sau commit hoặc outbox.

Lợi ích:

- Tránh lock nhiều row.
- Nhiều instance có thể xử lý song song.
- Không làm nghẽn API request.

### 5.6 Observability

Nên bổ sung:

- Micrometer metrics per endpoint.
- HTTP client metrics per downstream.
- DB query slow log.
- Trace ID qua gateway và service.
- Log latency từng external call.

Các metric cần theo dõi:

- p50/p95/p99 latency.
- Hikari active/idle/pending connections.
- Feign/WebClient timeout count.
- DB slow query count.
- Kafka consumer lag.
- Error rate theo downstream.

### 5.7 Migration thay cho ddl-auto update

Nên chuyển:

- `spring.jpa.hibernate.ddl-auto=update`

Sang:

- Flyway hoặc Liquibase.

Lợi ích:

- Startup ổn định hơn.
- Schema thay đổi có kiểm soát.
- Tránh Hibernate tự alter schema ngoài ý muốn.

## 6. Lessons Learned

### 6.1 Insight quan trọng

- Trong microservices, latency thường đến từ tổng số network round-trip, không chỉ từ một query chậm.
- API list phải được thiết kế theo pagination từ đầu; thêm pagination sau khi đã enrich toàn bộ dữ liệu không đủ tốt.
- Transaction không nên bao quanh network I/O.
- Batch endpoint là cách đơn giản và hiệu quả để giảm N+1 request giữa services.
- Gateway phải có timeout và connection pool rõ ràng, không chỉ dựa vào timeout ở tầng reactive chain.
- DTO mapping có thể gây DB query ẩn nếu entity association lazy chưa được fetch đúng.
- Không nên dùng endpoint full list cho màn hình home hoặc dashboard.

### 6.2 Lỗi thiết kế cần tránh

- Gọi service khác trong vòng lặp.
- Trả `List<>` không giới hạn cho dữ liệu tăng theo thời gian.
- Gọi Stripe/Cloudinary/Keycloak trong transaction DB dài.
- Scheduler scan toàn bộ bảng rồi xử lý trong một transaction.
- Dùng retry mặc định cho operation không idempotent.
- Log token hoặc log quá nhiều ở hot path.
- Tính recommendation hoặc aggregate nặng trực tiếp trong request path.

### 6.3 Checklist performance cho feature mới

Trước khi merge API mới, cần kiểm tra:

- Endpoint list có pagination và max `size` chưa.
- Có gọi downstream service trong loop không.
- Có batch endpoint hoặc bulk query thay thế không.
- Có query nào `findAll()` trên bảng tăng trưởng không.
- Có mapping DTO nào truy cập lazy association gây N+1 không.
- Repository query đã có index phù hợp chưa.
- Có external API call trong transaction không.
- Feign/WebClient/RestClient có timeout chưa.
- Có retry không, operation có idempotent không.
- Response payload có quá lớn không.
- Log ở hot path có cần để `INFO` không.
- Scheduler có batch limit và lock strategy an toàn chưa.
- Có metric/trace để đo p95/p99 latency không.

## 7. Phạm Vi Đã Xác Minh

Các service đã compile thành công sau thay đổi:

- `booking-service`
- `listing-service`
- `api-gateway`
- `payment-service`
- `user-service`
- `notification-service`

Kiểm tra đã chạy:

```powershell
mvn -q -DskipTests compile
git diff --check
```

`git diff --check` không phát hiện lỗi whitespace, chỉ có cảnh báo LF/CRLF do môi trường Windows.

## 8. Ghi Chú Về Search Service Và Message Service

`search-service` không được tối ưu tiếp vì team đã bỏ service này khỏi hướng phát triển.

`message-service` không được chỉnh sửa theo yêu cầu. Các phân tích liên quan message service nếu có chỉ nên xem là backlog riêng, không nằm trong phạm vi thay đổi hiện tại.
