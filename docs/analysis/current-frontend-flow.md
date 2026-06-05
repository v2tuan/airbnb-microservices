# Current Frontend Flow

Ngay phan tich: 2026-05-30

Pham vi doc source: frontend trong `airbnb-client/src` lien quan den Booking, Reservation, Checkout, Payment va Host reservation. File nay chi ghi nhan hien trang, khong de xuat hay sua source code.

## 1. Cau hinh API va auth hien tai

- Frontend dung `axiosClient` trong `airbnb-client/src/api/client.ts`.
- `baseURL` lay tu `NEXT_PUBLIC_API_BASE_URL`, hien trong `.env` la `http://localhost:8888`.
- Prefix API lay tu `NEXT_PUBLIC_PREFIX`, hien la `/api/v1`.
- Request interceptor tu dong gan `Authorization: Bearer <accessToken>` neu co token trong `authStorage`.
- Response interceptor xu ly `401` bang refresh token qua `POST {baseURL}{prefix}/users/auth/refresh`, sau do retry request cu.
- Nhieu endpoint booking/host van truyen header Authorization thu cong, ngoai interceptor chung.
- Stripe publishable key lay tu `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` trong `airbnb-client/src/lib/stripe.ts`.

## 2. Cac man hinh hien co

### Guest booking va checkout

#### Room detail: `/rooms/[id]`

Source:
- `airbnb-client/src/app/(room-detail)/rooms/[id]/page.tsx`
- `airbnb-client/src/components/listing/BookingCard.tsx`
- `airbnb-client/src/components/booking/GuestSelector.tsx`

Chuc nang:
- Fetch thong tin listing bang `listingAPI.getRoomById(id)`.
- Fetch rating bang `ratingAPI.getRatingsByListing(id)` va `ratingAPI.getAverageRating(id)`.
- Fetch public host profile neu listing co `hostId`.
- Hien chi tiet phong, anh, tien ich, rating, host info, wishlist va booking card.
- Booking card cho chon ngay check-in/check-out va guest count.
- Tinh gia tam thoi tren frontend: base price theo dem, cleaning fee, service fee.
- Bam `Reserve` se dieu huong sang `/checkout/[roomId]` kem query params.
- Chua thay API check availability duoc goi tai buoc booking card.

Query checkout duoc tao:
- `checkin`
- `checkout`
- `numberOfAdults`
- `numberOfChildren`
- `numberOfInfants`
- `numberOfPets`
- `guestCurrency`

#### Checkout: `/checkout/[roomId]`

Source:
- `airbnb-client/src/app/(main)/checkout/[roomId]/page.tsx`
- `airbnb-client/src/components/checkout/CheckoutContent.tsx`
- `airbnb-client/src/components/booking/payment-form.tsx`
- `airbnb-client/src/lib/stripe.ts`

Chuc nang:
- Server page bat buoc co `checkin` va `checkout`, neu thieu se `notFound()`.
- Fetch listing bang `listingAPI.getRoomById(roomId)`.
- Parse guest counts va currency tu query string.
- Render checkout content: thong tin phong, date editor, guest editor, price breakdown, payment form.
- Date va guest editor chi update URL bang `router.replace`, khong goi API availability.
- Stripe Elements duoc khoi tao voi `mode: "payment"`, `amount` tinh tren frontend va `currency: "vnd"` hardcoded.
- Payment form goi backend checkout khi user submit, sau do confirm payment voi Stripe.

#### Payment form dang dung

Source:
- `airbnb-client/src/components/booking/payment-form.tsx`

Flow submit:
1. Lay token tu Redux auth state.
2. Goi `checkout(token, CheckoutRequest)` toi backend.
3. Nhan `clientSecret` tu backend.
4. Goi `elements.submit()`.
5. Goi `stripe.confirmPayment({ elements, clientSecret, confirmParams: { return_url: "<origin>/trips" } })`.
6. Neu Stripe yeu cau redirect/confirm tiep, user se ve `/trips`.

Du lieu gui backend:
- `roomId`
- `checkInDate`
- `checkOutDate`
- `numberOfAdults`
- `numberOfChildren`
- `numberOfInfants`
- `numberOfPets`
- `currency`

#### Payment form cu/khong thay duoc dung trong checkout hien tai

Source:
- `airbnb-client/src/components/booking/PaymentForm.tsx`

Chuc nang:
- Component Stripe PaymentElement tong quat hon.
- Nhan `bookingId`, `amount`, `currency`, `clientSecret`.
- Confirm payment voi `return_url=/payment-result?bookingId=...`.
- Qua scan import/callsite, checkout hien tai dang dung `payment-form.tsx`, khong thay component nay duoc dung trong flow checkout chinh.

### Guest trips va reservation management

#### Trips list: `/trips`

Source:
- `airbnb-client/src/app/(main)/trips/page.tsx`
- `airbnb-client/src/components/trips/TripsCard.tsx`
- `airbnb-client/src/components/trips/usePaymentCountdown.tsx`

Chuc nang:
- Yeu cau token nguoi dung.
- Hien tabs: `UPCOMING`, `COMPLETED`, `CANCELLED`.
- Khi doi tab, goi `getMyBookings(token, activeTab)`.
- Render danh sach booking bang `TripsCard`.
- Booking `PENDING_PAYMENT` co countdown den `expiresAt`.
- Neu countdown het tren client, UI xem nhu `EXPIRED`.
- `Pay now` tren trip card dieu huong sang `/checkout/[listingId]` kem query ngay/guest/currency va them `bookingId`.

Luu y hien trang:
- Checkout page parse ngay/guest/currency nhung khong thay dung `bookingId` query.
- Vi vay flow `Pay now` co rui ro tao checkout/booking moi thay vi thanh toan lai booking pending hien co.

#### Trip detail: `/trips/[bookingId]`

Source:
- `airbnb-client/src/app/(main)/trips/[bookingId]/page.tsx`
- `airbnb-client/src/components/trips/PendingPaymentBanner.tsx`
- `airbnb-client/src/components/trips/PaymentSummaryCard.tsx`
- `airbnb-client/src/components/trips/TripTimeline.tsx`
- `airbnb-client/src/components/trips/CancelReservationModal.tsx`

Chuc nang:
- Giao dien chi tiet reservation cua guest.
- Goi `getBookingDetail(token, bookingId)`.
- Hien gallery, listing info, host info, reservation info, payment summary, timeline, policy/rules, review summary.
- Neu `PENDING_PAYMENT` va chua het han, hien banner thanh toan con thoi gian.
- `Pay now` tao URL checkout tu booking detail va dieu huong sang `/checkout/[listingId]`.
- `Cancel reservation` mo modal ly do, sau do goi `cancelBooking(token, bookingId, reason)`.
- Sau cancel thanh cong, UI cap nhat local status sang `CANCELLED`.

#### Manage trip: `/trips/[bookingId]/manage`

Source:
- `airbnb-client/src/app/(main)/trips/[bookingId]/manage/page.tsx`
- `airbnb-client/src/components/trips/CancelReservationModal.tsx`

Chuc nang:
- Goi `getBookingDetail(token, bookingId)`.
- Cho guest xem va quan ly reservation.
- Cancel reservation goi `cancelBooking`.
- Guest notes, guest count adjustment, request date change hien la UI/local state, khong thay API update booking.
- Nut complete payment dieu huong sang checkout, nhung co cho code path khong truyen day du query `checkin/checkout`, trong khi checkout page bat buoc hai query nay.

#### Past trips profile: `/users/profile/past-trips`

Source:
- `airbnb-client/src/app/(main)/users/profile/past-trips/page.tsx`

Chuc nang:
- Man hinh placeholder, hien "No trips yet".
- Khong goi booking API.

### Host reservation

#### Host redirect: `/host`

Source:
- `airbnb-client/src/app/(host)/host/page.tsx`

Chuc nang:
- Redirect sang `/host/listings`.

#### Host navigation

Source:
- `airbnb-client/src/components/header/host-header.tsx`

Chuc nang:
- Co nav item `Reservations` tro toi `/host/reservations`.
- Active tab giu dung cho route con `/host/reservations/[reservationId]`.
- Neu user chua la host, link host action dua den `/host/become`.

#### Host reservations dashboard: `/host/reservations`

Source:
- `airbnb-client/src/app/(host)/host/reservations/page.tsx`

Chuc nang:
- Chi danh cho user co realm role `HOST`.
- Doc token tu Redux va fallback `authStorage` de tranh hard reload bi flash anonymous.
- Lay `hostId` tu JWT `sub`.
- Tai tat ca listing cua host bang `listingAPI.getListingsByHost(hostId, { page, size })`, lap qua cac page den `totalPages`.
- Goi `getHostReservations(token, query, signal)` de lay reservation aggregate.
- Ho tro filter:
  - Listing scope: all listings hoac mot listing.
  - Status tabs.
  - Date from.
  - Date to.
  - Search theo guest/code/city.
  - Pagination.
- Co request id guard va AbortController de tranh stale response ghi de state.
- Render metrics:
  - Reservations.
  - Pending payment.
  - Arrivals today.
  - In-house.
  - Booked value.
- Render reservation cards, booking calendar occupied dates, next stays va listing scope.
- Click reservation card den `/host/reservations/[reservationId]`.

Status tabs mapping:
- `ALL`: khong truyen statuses.
- `NEEDS_ATTENTION`: `PENDING_PAYMENT`.
- `CONFIRMED`: `PAID`.
- `IN_HOUSE`: `CHECKED_IN`.
- `COMPLETED`: `COMPLETED`.
- `CANCELLED`: `CANCELLED`, `EXPIRED`.

#### Host reservation detail: `/host/reservations/[reservationId]`

Source:
- `airbnb-client/src/app/(host)/host/reservations/[reservationId]/page.tsx`

Chuc nang:
- Goi `getHostReservationDetail(token, reservationId)`.
- Hien thong tin listing, guest, check-in/check-out, guest breakdown, payment, stay rules va timeline.
- Cho host doi status theo state machine frontend:
  - `PAID` -> `CHECKED_IN` bang nut `Mark checked in`.
  - `CHECKED_IN` -> `COMPLETED` bang nut `Mark completed`.
  - Trang thai terminal khong co primary action.
- Cho host cancel neu status la `PENDING_PAYMENT`, `PAID`, hoac `CHECKED_IN`.
- Cancel mo dialog nhap reason, sau do goi `updateHostReservationStatus(..., { status: "CANCELLED", reason })`.
- Status update dung optimistic UI, neu backend fail thi rollback ve reservation truoc do.

### Host Stripe onboarding

#### Become host: `/host/become`

Source:
- `airbnb-client/src/app/(host)/host/become/page.tsx`

Chuc nang:
- Goi `startOnboarding(token)`.
- Neu backend tra URL thanh cong, redirect browser sang Stripe onboarding URL bang `window.location.href`.

#### Host success: `/host/success`

Source:
- `airbnb-client/src/app/(host)/host/success/page.tsx`

Chuc nang:
- Goi `checkStatus(token)` de verify Stripe account sau khi quay ve app.
- Neu success, dispatch `refreshThunk()` de refresh auth/session, sau do hien CTA tao listing dau tien.
- Neu incomplete, hien CTA sang `/host/reauth`.

#### Host reauth: `/host/reauth`

Source:
- `airbnb-client/src/app/(host)/host/reauth/page.tsx`

Chuc nang:
- Goi `refreshLink(token)`.
- Redirect lai Stripe bang URL moi.
- Hien loading "Reconnecting to Stripe...".

## 3. API frontend dang goi

### Booking va payment API

Source: `airbnb-client/src/api/endpoints/booking.ts`

- `POST /api/v1/payments/checkout`
  - Wrapper: `checkout(token, data)`.
  - Dung trong `components/booking/payment-form.tsx`.
  - Tao checkout/payment intent va tra `clientSecret`, `paymentIntentId`, `bookingId`, `expiresAt`.

- `GET /api/v1/bookings/me?type=...`
  - Wrapper: `getMyBookings(token, type)`.
  - Dung trong `/trips`.
  - Type frontend dung: `UPCOMING`, `COMPLETED`, `CANCELLED`; type default wrapper co `ALL`.

- `GET /api/v1/bookings/{bookingId}/detail`
  - Wrapper: `getBookingDetail(token, bookingId)`.
  - Dung trong `/trips/[bookingId]` va `/trips/[bookingId]/manage`.

- `POST /api/v1/bookings/{bookingId}/cancel`
  - Wrapper: `cancelBooking(token, bookingId, reason)`.
  - Dung trong trip detail va manage trip.
  - Body: `{ reason }`.

- `GET /api/v1/bookings/host/reservations`
  - Wrapper: `getHostReservations(token, query, signal)`.
  - Dung trong host reservations dashboard.
  - Query ho tro: `listingId`, repeated `statuses`, `search`, `dateFrom`, `dateTo`, `page`, `size`.

- `GET /api/v1/bookings/host/reservations/{reservationId}`
  - Wrapper: `getHostReservationDetail(token, reservationId)`.
  - Dung trong host reservation detail.

- `PATCH /api/v1/bookings/host/reservations/{reservationId}/status`
  - Wrapper: `updateHostReservationStatus(token, reservationId, data)`.
  - Dung trong host reservation detail.
  - Body: `{ status, reason? }`.

- `GET /api/v1/bookings/host/listings/{listingId}/reservations`
  - Wrapper: `getHostReservationsByListing(token, listingId, statuses?)`.
  - Van ton tai trong API wrapper, nhung dashboard hien tai dung endpoint aggregate `/bookings/host/reservations`.

### Listing API lien quan

Source: `airbnb-client/src/api/endpoints/listing.ts`

- `GET /api/v1/listings/{id}`
  - Wrapper: `listingAPI.getRoomById(id)`.
  - Dung trong room detail va checkout.

- `GET /api/v1/listings/{id}/detail`
  - Wrapper: `listingAPI.getListingDetail(id, params)`.
  - Co ho tro params check-in/check-out/guest, nhung khong thay duoc dung trong checkout flow hien tai.

- `GET /api/v1/listings/host/{hostId}/paginated`
  - Wrapper: `listingAPI.getListingsByHost(hostId, params)`.
  - Dung trong host reservations dashboard de lay listing filter/scope.

### Host Stripe Connect API

Source: `airbnb-client/src/api/endpoints/host.ts`

- `POST /api/v1/users/stripe/onboard`
  - Wrapper: `startOnboarding(token)`.
  - Dung trong `/host/become`.

- `GET /api/v1/users/stripe/status`
  - Wrapper: `checkStatus(token)`.
  - Dung trong `/host/success`.

- `GET /api/v1/users/stripe/refresh`
  - Wrapper: `refreshLink(token)`.
  - Dung trong `/host/reauth`.

### Stripe client-side API

Source:
- `airbnb-client/src/lib/stripe.ts`
- `airbnb-client/src/components/checkout/CheckoutContent.tsx`
- `airbnb-client/src/components/booking/payment-form.tsx`

Dang dung:
- `loadStripe(NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY)`.
- `<Elements stripe={stripePromise} options={...}>`.
- `<PaymentElement />`.
- `elements.submit()`.
- `stripe.confirmPayment(...)`.

Khong thay frontend goi truc tiep:
- Refund API.
- Transaction API.
- Payment method save/list API.
- Stripe refund client API.

## 4. Cac flow nguoi dung dang ho tro

### Flow guest dat phong moi

1. User vao `/rooms/[id]`.
2. Frontend fetch listing, rating, host profile.
3. User chon date range va guests trong `BookingCard`.
4. Frontend tinh gia tam thoi va dieu huong sang `/checkout/[roomId]`.
5. Checkout page fetch lai listing bang `getRoomById`.
6. User co the sua ngay/guest tren checkout, viec sua chi update query URL.
7. User submit payment form.
8. Frontend goi `POST /payments/checkout`.
9. Backend tra Stripe `clientSecret`.
10. Frontend goi Stripe `confirmPayment`.
11. Sau payment, return URL la `/trips`.

### Flow guest xem danh sach trip

1. User vao `/trips`.
2. Frontend goi `GET /bookings/me?type=UPCOMING` mac dinh.
3. User doi tab thi goi lai API voi `COMPLETED` hoac `CANCELLED`.
4. Trip card hien status, ngay, listing, tong tien.
5. Trip `PENDING_PAYMENT` hien countdown va nut `Pay now`.
6. Click card di den `/trips/[bookingId]`.

### Flow guest thanh toan tiep booking pending

1. User click `Pay now` tu trip card hoac trip detail.
2. Frontend build URL `/checkout/[listingId]` voi date/guest/currency va `bookingId`.
3. Checkout hien tai khong thay su dung `bookingId`.
4. Submit payment van goi `POST /payments/checkout` voi `roomId` va dates.

Ket luan hien trang: UI co y do ho tro thanh toan tiep pending booking, nhung integration frontend hien tai khong bind checkout voi booking pending bang `bookingId`.

### Flow guest huy reservation

1. User vao trip detail hoac manage page.
2. Frontend goi `GET /bookings/{bookingId}/detail`.
3. User mo modal cancel va chon/nhap reason.
4. Frontend goi `POST /bookings/{bookingId}/cancel`.
5. UI cap nhat local status sang `CANCELLED` khi thanh cong.

Ket luan hien trang: frontend khong goi refund API rieng. Refund neu co phu thuoc vao backend xu ly trong cancel endpoint hoac xu ly ngoai UI.

### Flow guest manage reservation

1. User vao `/trips/[bookingId]/manage`.
2. Frontend fetch booking detail.
3. User co the cancel reservation.
4. User co the sua notes/guest count/request date change tren UI, nhung cac thao tac nay khong thay API save tuong ung.
5. Nut payment dieu huong ve checkout.

### Flow host xem va loc reservations

1. Host vao `/host/reservations`.
2. Frontend kiem tra token va realm role `HOST`.
3. Frontend lay `hostId` tu JWT.
4. Frontend tai tat ca listings cua host bang paginated listing API.
5. Frontend goi `GET /bookings/host/reservations` voi filter hien tai.
6. Host co the loc theo listing, status, search, date range va page.
7. Dashboard hien metrics, list reservation, calendar occupied dates va next stays.
8. Host click reservation de vao detail.

### Flow host doi trang thai reservation

1. Host vao `/host/reservations/[reservationId]`.
2. Frontend goi detail API.
3. Neu status `PAID`, host co CTA `Mark checked in`.
4. Neu status `CHECKED_IN`, host co CTA `Mark completed`.
5. Neu status `PENDING_PAYMENT`, `PAID`, hoac `CHECKED_IN`, host co the cancel.
6. Frontend optimistic update status truoc, goi `PATCH /bookings/host/reservations/{reservationId}/status`.
7. Neu API fail, frontend rollback ve state cu.

### Flow host Stripe onboarding

1. User vao `/host/become`.
2. Frontend goi `POST /users/stripe/onboard`.
3. Browser redirect sang Stripe.
4. Stripe quay ve `/host/success` hoac refresh URL `/host/reauth`.
5. `/host/success` goi `GET /users/stripe/status`, neu success thi refresh auth session.
6. `/host/reauth` goi `GET /users/stripe/refresh` va redirect sang Stripe link moi.

## 5. Trang thai hien co tren frontend

Booking/reservation status type trong `airbnb-client/src/types/booking.type.ts`:

- `PENDING_PAYMENT`
- `PAID`
- `CHECKED_IN`
- `COMPLETED`
- `CANCELLED`
- `EXPIRED`

Booking filter type:

- `UPCOMING`
- `COMPLETED`
- `CANCELLED`
- `ALL`

Host dashboard status filter key:

- `ALL`
- `NEEDS_ATTENTION`
- `CONFIRMED`
- `IN_HOUSE`
- `COMPLETED`
- `CANCELLED`

Payment UI labels hien tai:

- `PENDING_PAYMENT`: Awaiting payment / pending countdown.
- `PAID`, `CHECKED_IN`, `COMPLETED`: Paid hoac Stripe status tu payment detail.
- `CANCELLED`: Refund review neu co `paidAt`, nguoc lai Not charged.
- `EXPIRED`: Expired.

## 6. Diem can luu y trong hien trang

- Checkout route bat buoc `checkin` va `checkout`; cac dieu huong khong kem hai query nay se vao `notFound()`.
- `bookingId` query duoc truyen khi `Pay now`, nhung checkout hien tai khong doc/dung gia tri nay.
- Stripe Elements trong checkout hardcode `currency: "vnd"`, trong khi checkout request gui `bookingIntent.guestCurrency`.
- Gia checkout duoc tinh tren frontend de hien thi va de khoi tao Elements amount; backend checkout moi la nguon tao PaymentIntent thuc te.
- Khong thay frontend goi API availability khi user chon ngay o room detail/checkout.
- Cancel reservation chi goi booking cancel endpoint; khong thay refund endpoint rieng tren frontend.
- Manage trip co mot so thao tac UI-only: guest count, notes, request date change.
- `components/booking/PaymentForm.tsx` co ve la component cu/chua duoc dung trong checkout hien tai.
- Host reservation detail cho phep host cancel ca status `CHECKED_IN`; tinh hop le nghiep vu phu thuoc backend validate.
