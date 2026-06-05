# Booking Flow V2 - Final Business Specification

Status: Final

Last updated: 2026-05-30

This document is the single source of truth for Booking, Reservation, Payment, Refund, Cancellation, Complaint, Host Penalty, and Listing Suspension business behavior. It supersedes earlier cancellation and incident drafts.

This document defines business rules and flow architecture only. It does not define database schema, endpoint signatures, service classes, or implementation details.

## 1. Scope

Booking Flow V2 covers the end-to-end accommodation reservation lifecycle:

- Search and listing availability evaluation.
- Booking request and temporary hold.
- System approval for checkout.
- Payment confirmation.
- Reservation confirmation.
- Check-in, check-out, and completion.
- Guest cancellation and host cancellation.
- Refund handling.
- Complaint handling after check-in.
- Admin intervention.
- Host penalty and listing suspension.
- Notification events required by business flow.

## 2. Actors

| Actor | Definition | Main Responsibilities |
|---|---|---|
| `GUEST` | User who searches for a stay and books a listing. | Search listings, create booking request, pay, view trip, cancel eligible booking, create complaint after check-in, submit evidence, accept or escalate complaint resolution. |
| `HOST` | User who owns or manages a listing. | Maintain listing availability, receive confirmed reservations, manage check-in/check-out/completion, request host cancellation, respond to complaints. |
| `ADMIN` | Internal operator responsible for exceptional and disputed cases. | Resolve escalated complaints, force cancel bookings, approve operational decisions, waive host penalties, suspend or unsuspend listings. |
| `SYSTEM` | Automated platform behavior. | Validate eligibility, hold availability, calculate prices, calculate cancellation quotes, calculate refunds, create refund records, release availability, apply penalties, escalate complaints, emit notifications. |

## 3. Canonical Terms

| Term | Meaning |
|---|---|
| Booking | The business record representing a guest's stay request or confirmed stay for a listing and date range. |
| Reservation | Host-facing view of a booking. Booking and reservation refer to the same business entity from different actor perspectives. |
| Booking request | A guest intent to reserve a listing for specific dates and guests before payment is confirmed. |
| Temporary hold | The short-lived reservation of availability while the guest completes payment. |
| Confirmed booking | A booking with successful payment and reserved availability. |
| Cancellation quote | A time-limited calculation shown before cancellation, including refund, non-refundable amount, fee treatment, and host penalty when applicable. |
| Refund record | A business record representing money owed back to the guest because of cancellation or complaint resolution. |
| Complaint | A post-check-in incident case raised by the guest. |
| Host penalty | Penalty points assigned to a host when the host cancels a confirmed booking. |
| Listing suspension | A status preventing a listing from accepting new bookings. Existing bookings are not automatically cancelled by suspension. |

## 4. Final Booking States

These are the final accepted booking/reservation states for V2.

| State | Description | Terminal |
|---|---|---|
| `PENDING_PAYMENT` | Temporary hold has been created and guest payment is not yet confirmed. | No |
| `EXPIRED` | Temporary hold expired before successful payment. | Yes |
| `CONFIRMED` | Payment succeeded and reservation is confirmed before check-in. | No |
| `CHECKED_IN` | Guest has checked in. | No |
| `CHECKED_OUT` | Guest has checked out, but final completion has not been recorded. | No |
| `COMPLETED` | Stay is completed and no further normal lifecycle transition is allowed. | Yes |
| `CANCELLED_BY_GUEST` | Confirmed booking was cancelled by guest through guest cancellation flow. | Yes |
| `CANCELLED_BY_HOST` | Confirmed booking was cancelled by host through host cancellation flow. | Yes |
| `CANCELLED_BY_ADMIN` | Booking was cancelled by admin due to complaint, safety, fraud, or operational intervention. | Yes |

Deprecated or non-final states:

- `PAID` must not be used as a booking status in V2. Use booking status `CONFIRMED` and payment status `PAID`.
- Generic `CANCELLED` must not be used in V2. Use actor-specific cancellation states.

## 5. Final Payment States

| State | Description | Terminal |
|---|---|---|
| `PAYMENT_PENDING` | Payment attempt exists and is waiting for provider result. | No |
| `PAID` | Payment succeeded. | No |
| `PAYMENT_FAILED` | Payment attempt failed before confirmation. | Yes for that attempt |
| `PAYMENT_CANCELLED` | Payment attempt was cancelled before confirmation. | Yes for that attempt |
| `REFUND_PENDING` | At least one refund record has been created and is not completed. | No |
| `PARTIALLY_REFUNDED` | Some refundable amount has been returned to guest. | No |
| `REFUNDED` | Entire refundable paid amount has been returned to guest. | Yes |
| `REFUND_FAILED` | Refund processing failed and requires recovery or admin attention. | No |

Payment state is separate from reservation state. A reservation can be `CANCELLED_BY_GUEST`, `CANCELLED_BY_HOST`, or `CANCELLED_BY_ADMIN` while payment state is `REFUND_PENDING`, `PARTIALLY_REFUNDED`, `REFUNDED`, or `REFUND_FAILED`.

## 6. Supporting Statuses

### Complaint Status

| State | Description | Terminal |
|---|---|---|
| `WAITING_HOST_RESPONSE` | Complaint was created and host response is pending. | No |
| `OPEN` | Host responded and guest can accept or escalate. | No |
| `ESCALATED_TO_ADMIN` | Complaint is waiting for admin decision. | No |
| `RESOLVED` | Complaint was resolved. | No |
| `REJECTED` | Complaint was rejected by admin. | No |
| `CLOSED` | Complaint case is closed after resolution or rejection. | Yes |

### Listing Status

| State | Description |
|---|---|
| `ACTIVE` | Listing can receive new booking requests. |
| `SUSPENDED` | Listing cannot receive new booking requests. Existing bookings remain valid unless separately cancelled. |

### Host Penalty Status

| State | Description |
|---|---|
| `ACTIVE` | Penalty counts toward thresholds. |
| `WAIVED` | Penalty was waived by admin and no longer counts toward thresholds. |

## 7. Reservation State Machine

Allowed reservation transitions:

| From | Event | To | Actor |
|---|---|---|---|
| None | Booking request approved and temporary hold created | `PENDING_PAYMENT` | `SYSTEM` |
| `PENDING_PAYMENT` | Payment succeeds | `CONFIRMED` | `SYSTEM` |
| `PENDING_PAYMENT` | Payment hold expires | `EXPIRED` | `SYSTEM` |
| `PENDING_PAYMENT` | Guest abandons or cancels unpaid hold | `EXPIRED` | `SYSTEM` |
| `CONFIRMED` | Guest confirms cancellation quote | `CANCELLED_BY_GUEST` | `GUEST` |
| `CONFIRMED` | Host confirms cancellation quote | `CANCELLED_BY_HOST` | `HOST` |
| `CONFIRMED` | Admin force cancels | `CANCELLED_BY_ADMIN` | `ADMIN` |
| `CONFIRMED` | Guest checks in or host marks check-in | `CHECKED_IN` | `HOST` or `SYSTEM` |
| `CHECKED_IN` | Guest checks out or host marks check-out | `CHECKED_OUT` | `HOST` or `SYSTEM` |
| `CHECKED_IN` | Admin full refund due to complaint | `CANCELLED_BY_ADMIN` | `ADMIN` |
| `CHECKED_OUT` | Stay is finalized | `COMPLETED` | `HOST` or `SYSTEM` |

Invalid reservation transitions:

- Terminal states must not transition back to active states.
- `CHECKED_IN` must not transition to `CANCELLED_BY_GUEST` or `CANCELLED_BY_HOST`.
- `CHECKED_OUT` must not transition to `CANCELLED_BY_GUEST` or `CANCELLED_BY_HOST`.
- `COMPLETED` must not be cancelled.
- `EXPIRED` must not become `CONFIRMED`.
- `CONFIRMED` must not be created without successful payment.

## 8. Booking Lifecycle

### 8.1. Search

Actor: `GUEST`

Search allows a guest to discover listings by location, dates, guest count, and filters.

Business rules:

- Search must only return listings that are eligible to be booked.
- Listings with status `SUSPENDED` must not be bookable.
- Search results may show estimated pricing, but final payable amount is determined during booking request approval.
- Search does not create a booking and does not hold availability.

### 8.2. Booking Request

Actor: `GUEST`

A booking request starts when a guest selects a listing, date range, guest counts, and currency, then proceeds to checkout.

Business rules:

- Check-out date must be after check-in date.
- Guest counts must comply with listing capacity and listing rules.
- Pets are only allowed if listing rules allow pets.
- Booking request must be rejected if listing is `SUSPENDED`.
- Booking request must be rejected if date range conflicts with another active reservation.
- Active reservations for availability conflict are `PENDING_PAYMENT`, `CONFIRMED`, `CHECKED_IN`, and `CHECKED_OUT`.

### 8.3. Approval

Actor: `SYSTEM`

Approval is the system decision that a booking request can proceed to payment. This is not manual host approval.

Business rules:

- The system must validate listing status, availability, guest counts, booking dates, host payout eligibility, and price snapshot.
- If approval succeeds, the system creates a `PENDING_PAYMENT` temporary hold.
- If approval fails, no hold is created.
- A `PENDING_PAYMENT` hold must expire automatically when payment is not completed before the configured hold deadline.
- A booking request must capture the final price snapshot used for payment.

### 8.4. Confirmation

Actor: `SYSTEM`

Confirmation happens only after payment succeeds.

Business rules:

- `PENDING_PAYMENT` becomes `CONFIRMED` only after payment provider success.
- The confirmed booking must retain immutable snapshots of nightly price, total nights, cleaning fee, service fee, taxes if any, total amount, currency, and cancellation policy.
- Host and guest must receive confirmation notification.
- A confirmed booking blocks listing availability until it becomes terminal or completed.

### 8.5. Check-in

Actor: `HOST` or `SYSTEM`

Check-in marks that the guest has started the stay.

Business rules:

- Only `CONFIRMED` bookings can check in.
- Guest cancellation and host cancellation are not allowed after check-in.
- Post-check-in incidents must use complaint flow.
- Check-in timestamp must be recorded.

### 8.6. Check-out

Actor: `HOST` or `SYSTEM`

Check-out marks that the guest has ended the stay, but final completion may still be pending.

Business rules:

- Only `CHECKED_IN` bookings can check out.
- Check-out timestamp must be recorded.
- Guest cancellation and host cancellation are not allowed after check-out.
- Complaint eligibility is defined by complaint rules, not by cancellation rules.

### 8.7. Completion

Actor: `HOST` or `SYSTEM`

Completion finalizes the normal stay lifecycle.

Business rules:

- Only `CHECKED_OUT` bookings can become `COMPLETED`.
- `COMPLETED` is terminal.
- Completed bookings cannot be cancelled.
- Completed bookings cannot receive new complaints through the normal guest complaint flow.

## 9. Pricing And Policy Snapshot

Every confirmed booking must preserve the business data used to calculate cancellation and refund outcomes.

Required snapshot fields:

- Listing ID.
- Guest ID.
- Host ID.
- Check-in date.
- Check-out date.
- Total nights.
- Guest counts.
- Currency.
- Nightly price.
- Accommodation subtotal.
- Cleaning fee.
- Service fee.
- Taxes if applicable.
- Total amount.
- Cancellation policy code.
- Host payout eligibility at booking time.

Business rules:

- Refunds must be calculated from booking snapshot, not current listing price.
- Cancellation policy must be calculated from booking snapshot, not current listing policy.
- Service fee and cleaning fee must be explicit components of the booking amount.
- The total paid amount must equal the confirmed booking snapshot amount.

## 10. Cancellation Policies

Supported policy codes:

- `FLEXIBLE`
- `MODERATE`
- `STRICT`

Guest cancellation refund rules:

| Policy | Cancellation Time | Guest Refund |
|---|---|---|
| `FLEXIBLE` | At least 24 hours before check-in | 100% accommodation + cleaning fee + service fee |
| `FLEXIBLE` | Less than 24 hours before check-in | Unused nights excluding first night + cleaning fee; service fee is not refunded |
| `MODERATE` | At least 5 days before check-in | 100% accommodation + cleaning fee + service fee |
| `MODERATE` | At least 24 hours and less than 5 days before check-in | 50% accommodation + 100% cleaning fee; service fee is not refunded |
| `MODERATE` | Less than 24 hours before check-in | Cleaning fee only; accommodation and service fee are not refunded |
| `STRICT` | At least 7 days before check-in | 50% accommodation + 100% cleaning fee; service fee is not refunded |
| `STRICT` | Less than 7 days before check-in | Cleaning fee only; accommodation and service fee are not refunded |

Additional cancellation policy rules:

- Service fee is refunded only when guest receives a full refund.
- Cleaning fee is refunded when the guest has not checked in.
- Guest cancellation is not available after check-in.
- Host cancellation always grants guest a full refund of remaining paid amount.
- Admin full refund grants guest the remaining refundable paid amount.

## 11. Guest Cancellation Flow

Actor: `GUEST`, `SYSTEM`

Trigger: Guest requests cancellation from booking detail.

Preconditions:

- Guest is authenticated.
- Booking belongs to guest.
- Booking status is `CONFIRMED`.
- Payment status is `PAID`, `PARTIALLY_REFUNDED`, or `REFUND_FAILED`.
- Booking is not checked in, checked out, completed, expired, or already cancelled.

Flow:

1. Guest requests cancellation quote.
2. System validates booking eligibility.
3. System calculates refund from booking snapshot and cancellation policy.
4. System returns time-limited quote.
5. Guest either abandons cancellation or confirms using an unexpired quote.
6. If guest confirms, booking becomes `CANCELLED_BY_GUEST`.
7. System creates refund record if refund amount is greater than zero.
8. System releases availability for the cancelled date range.
9. System notifies guest and host.

Cancellation quote must include:

- Refund amount.
- Non-refundable amount.
- Accommodation refund.
- Cleaning fee refund.
- Service fee refund.
- Policy code.
- Quote expiration time.

Business rules:

- Guest must not cancel without a valid cancellation quote.
- Quote must expire after a defined short validity window.
- Confirmation must use the same quote that was shown to the guest.
- If refund amount is zero, booking still becomes `CANCELLED_BY_GUEST` and no refund record is created.
- Guest cancellation must not create host penalty.

## 12. Host Cancellation Flow

Actor: `HOST`, `SYSTEM`, `ADMIN`

Trigger: Host requests cancellation from reservation detail.

Preconditions:

- Host is authenticated.
- Host owns the listing for the booking.
- Booking status is `CONFIRMED`.
- Payment status is `PAID`, `PARTIALLY_REFUNDED`, or `REFUND_FAILED`.
- Booking is not checked in, checked out, completed, expired, or already cancelled.

Flow:

1. Host requests cancellation quote.
2. System validates host ownership and cancellation eligibility.
3. System calculates full guest refund.
4. System calculates host penalty points and threshold result.
5. System returns time-limited quote to host.
6. Host either abandons cancellation or confirms using an unexpired quote.
7. If host confirms, booking becomes `CANCELLED_BY_HOST`.
8. System creates refund record for the guest.
9. System creates host penalty record.
10. System evaluates penalty thresholds.
11. System suspends listing or marks host for admin review when threshold is reached.
12. System releases availability for the cancelled date range.
13. System notifies guest and host.

Host cancellation quote must include:

- Guest refund amount.
- Penalty points.
- Reason code.
- Penalty threshold result.
- Quote expiration time.

Host cancellation reason codes:

- `PROPERTY_DAMAGE`
- `PERSONAL_EMERGENCY`
- `DOUBLE_BOOKING`
- `UNAVAILABLE`
- `OTHER`

Host penalty rules:

| Cancellation Time | Penalty |
|---|---|
| More than 7 days before check-in | 1 point |
| At least 24 hours and up to 7 days before check-in | 2 points |
| Less than 24 hours before check-in | 3 points |

Penalty thresholds:

| Condition | System Action |
|---|---|
| 3 active cancellation penalties within 90 days for the same listing | Suspend listing for 7 days |
| 5 active cancellation penalties within 180 days for the same host | Mark host for admin review |

Business rules:

- Host must not cancel without a valid cancellation quote.
- Host cancellation after check-in is not allowed.
- Host cancellation always creates a full refund record for the guest.
- Host cancellation always creates a host penalty unless admin later waives it.
- Waived penalties must not count toward thresholds.

## 13. Refund Handling

Refunds are business consequences of cancellation or complaint resolution.

Refund sources:

- Guest cancellation.
- Host cancellation.
- Admin cancellation.
- Admin complaint resolution.

Refund statuses:

| State | Description | Terminal |
|---|---|---|
| `PENDING` | Refund record was created and awaits processing. | No |
| `PROCESSING` | Refund is being processed by payment provider. | No |
| `COMPLETED` | Refund succeeded. | Yes |
| `FAILED` | Refund failed and requires retry or admin attention. | No |

Business rules:

- Refund amount must never exceed remaining refundable paid amount.
- Refund must be linked to exactly one business cause: cancellation quote, complaint decision, or admin force cancellation.
- Payment status becomes `REFUND_PENDING` when a refund record is created.
- Payment status becomes `PARTIALLY_REFUNDED` when total refunded amount is less than total refundable paid amount.
- Payment status becomes `REFUNDED` when total refundable paid amount has been refunded.
- Payment status becomes `REFUND_FAILED` when a refund fails and no successful retry has completed.
- Refund failure must notify admin and guest.
- Refund completion must notify guest.
- Refund handling must account for host payout state. If payout has already been transferred, the platform must recover or reverse the host portion according to payment provider capabilities and platform policy.

## 14. Complaint Flow

Actor: `GUEST`, `HOST`, `ADMIN`, `SYSTEM`

Trigger: Guest reports a serious issue after check-in.

Preconditions:

- Guest is authenticated.
- Booking belongs to guest.
- Booking status is `CHECKED_IN`.
- Payment status is `PAID`, `REFUND_PENDING`, or `PARTIALLY_REFUNDED`.
- Complaint is created within 24 hours after check-in.
- Booking has no other active complaint.

Complaint types:

| Type | Description |
|---|---|
| `CANNOT_CHECK_IN` | Guest cannot access the property or valid check-in instructions are missing. |
| `NOT_AS_DESCRIBED` | Listing materially differs from description. |
| `UNCLEAN` | Property is unclean in a material way. |
| `MISSING_AMENITY` | Important published amenity is missing. |
| `SAFETY_ISSUE` | Safety, health, or security issue exists. |

Flow:

1. Guest creates complaint with type and description.
2. Guest may attach photo or video evidence.
3. Complaint status becomes `WAITING_HOST_RESPONSE`.
4. System notifies host.
5. Host responds before deadline, moving complaint to `OPEN`.
6. Guest accepts host response, moving complaint to `RESOLVED`, or escalates to admin.
7. If host misses response deadline, system escalates complaint to admin.
8. Admin reviews escalated complaint.
9. Admin rejects, resolves without refund, grants partial refund, grants full refund, or suspends listing when allowed.
10. System closes resolved or rejected complaints after finalization.

Complaint transition rules:

| From | Event | To |
|---|---|---|
| None | Guest creates complaint | `WAITING_HOST_RESPONSE` |
| `WAITING_HOST_RESPONSE` | Host responds | `OPEN` |
| `WAITING_HOST_RESPONSE` | Host response deadline passes | `ESCALATED_TO_ADMIN` |
| `OPEN` | Guest accepts host response | `RESOLVED` |
| `OPEN` | Guest escalates | `ESCALATED_TO_ADMIN` |
| `ESCALATED_TO_ADMIN` | Admin resolves | `RESOLVED` |
| `ESCALATED_TO_ADMIN` | Admin rejects | `REJECTED` |
| `RESOLVED` | System closes case | `CLOSED` |
| `REJECTED` | System closes case | `CLOSED` |

Business rules:

- Complaint must include type and description.
- Evidence is optional but must be associated with the complaint if provided.
- A booking can have only one active complaint.
- Host can respond only while complaint is `WAITING_HOST_RESPONSE`.
- Admin can decide only while complaint is `ESCALATED_TO_ADMIN`.
- Guest cancellation and host cancellation are not available while an active complaint is escalated to admin.

## 15. Admin Complaint Resolution

Allowed admin decisions:

- `REJECT`
- `RESOLVE_NO_REFUND`
- `PARTIAL_REFUND`
- `FULL_REFUND`
- `SUSPEND_LISTING`

Allowed decisions by complaint type:

| Complaint Type | Allowed Decisions |
|---|---|
| `CANNOT_CHECK_IN` | `FULL_REFUND`, `REJECT`, `SUSPEND_LISTING` |
| `NOT_AS_DESCRIBED` | `PARTIAL_REFUND`, `FULL_REFUND`, `REJECT`, `SUSPEND_LISTING` |
| `UNCLEAN` | `RESOLVE_NO_REFUND`, `PARTIAL_REFUND`, `REJECT` |
| `MISSING_AMENITY` | `RESOLVE_NO_REFUND`, `PARTIAL_REFUND`, `REJECT` |
| `SAFETY_ISSUE` | `FULL_REFUND`, `REJECT`, `SUSPEND_LISTING` |

Business rules:

- Admin must provide an admin note for every decision.
- `PARTIAL_REFUND` requires refund amount greater than zero and less than remaining refundable paid amount.
- `FULL_REFUND` creates refund for the remaining refundable paid amount.
- `FULL_REFUND` on a `CHECKED_IN` booking changes booking status to `CANCELLED_BY_ADMIN`.
- `RESOLVE_NO_REFUND` keeps booking in its current lifecycle state.
- `REJECT` keeps booking in its current lifecycle state.
- `SUSPEND_LISTING` changes listing status to `SUSPENDED` and does not automatically cancel existing bookings.

## 16. Admin Operations

### 16.1. Force Cancel Booking

Actor: `ADMIN`

Business rules:

- Admin may force cancel a `CONFIRMED` or `CHECKED_IN` booking only for operational, safety, fraud, or complaint reasons.
- Admin force cancellation changes booking status to `CANCELLED_BY_ADMIN`.
- Admin force cancellation must record reason and admin note.
- Admin force cancellation must create refund record when refund amount is greater than zero.
- Admin force cancellation must release availability when the stay has not started.

### 16.2. Waive Host Penalty

Actor: `ADMIN`

Business rules:

- Only `ACTIVE` host penalties can be waived.
- Admin must provide waiver reason.
- Waived penalties do not count toward penalty thresholds.
- Host must be notified when a penalty is waived.

### 16.3. Suspend Or Unsuspend Listing

Actor: `ADMIN`, `SYSTEM`

Business rules:

- System may suspend a listing only because a defined penalty threshold is reached.
- Admin may suspend or unsuspend a listing with a reason.
- `SUSPENDED` listings cannot receive new booking requests.
- Existing bookings are not automatically cancelled when listing is suspended.
- Host and admin must be notified when listing is suspended or unsuspended.

## 17. Availability Rules

Business rules:

- `PENDING_PAYMENT`, `CONFIRMED`, `CHECKED_IN`, and `CHECKED_OUT` block availability for their date range.
- `EXPIRED`, `CANCELLED_BY_GUEST`, `CANCELLED_BY_HOST`, and `CANCELLED_BY_ADMIN` release availability for dates not already consumed by a started stay.
- `COMPLETED` represents consumed availability and does not release past dates.
- Double-booking must be prevented for all active availability-blocking states.
- Availability release must happen after cancellation state is recorded.

## 18. Notification Events

The system must create notification events for the following business events:

| Event | Recipients |
|---|---|
| `BOOKING_REQUEST_CREATED` | Guest |
| `BOOKING_CONFIRMED` | Guest, Host |
| `BOOKING_EXPIRED` | Guest |
| `BOOKING_CHECKED_IN` | Guest, Host |
| `BOOKING_CHECKED_OUT` | Guest, Host |
| `BOOKING_COMPLETED` | Guest, Host |
| `BOOKING_CANCELLED_BY_GUEST` | Guest, Host |
| `BOOKING_CANCELLED_BY_HOST` | Guest, Host |
| `BOOKING_CANCELLED_BY_ADMIN` | Guest, Host, Admin |
| `REFUND_CREATED` | Guest |
| `REFUND_COMPLETED` | Guest |
| `REFUND_FAILED` | Guest, Admin |
| `COMPLAINT_CREATED` | Host |
| `COMPLAINT_ESCALATED` | Admin |
| `COMPLAINT_RESOLVED` | Guest, Host |
| `COMPLAINT_REJECTED` | Guest, Host |
| `HOST_PENALTY_CREATED` | Host |
| `HOST_PENALTY_WAIVED` | Host |
| `LISTING_SUSPENDED` | Host, Admin |
| `LISTING_UNSUSPENDED` | Host, Admin |

## 19. Consistency Decisions

The following decisions resolve conflicts found during review:

- Booking status `PAID` is replaced by booking status `CONFIRMED` plus payment status `PAID`.
- Generic booking status `CANCELLED` is replaced by `CANCELLED_BY_GUEST`, `CANCELLED_BY_HOST`, and `CANCELLED_BY_ADMIN`.
- Host cancellation after check-in is not allowed; post-check-in issues must use complaint and admin intervention.
- Guest cancellation after check-in is not allowed; post-check-in issues must use complaint flow.
- Cancellation quote is mandatory for guest and host cancellation.
- Refund is not a standalone business action for normal users; it is caused by cancellation or admin complaint resolution.
- Booking completion follows `CHECKED_IN -> CHECKED_OUT -> COMPLETED`.
- Listing suspension does not automatically cancel existing bookings.
- Availability conflict checks must include all active availability-blocking states.

# Finalized Business Rules

- BR-001: A listing with status `SUSPENDED` must not accept new booking requests.
- BR-002: Search must not create a booking or hold availability.
- BR-003: Check-out date must be after check-in date.
- BR-004: Guest counts must comply with listing capacity and listing rules.
- BR-005: Pets are allowed only when listing rules allow pets.
- BR-006: A booking request must be rejected when it conflicts with an active availability-blocking reservation.
- BR-007: `PENDING_PAYMENT`, `CONFIRMED`, `CHECKED_IN`, and `CHECKED_OUT` are availability-blocking states.
- BR-008: `EXPIRED`, `CANCELLED_BY_GUEST`, `CANCELLED_BY_HOST`, and `CANCELLED_BY_ADMIN` release unconsumed availability.
- BR-009: Approval is a system validation step, not manual host approval.
- BR-010: A successful approval creates a `PENDING_PAYMENT` temporary hold.
- BR-011: A `PENDING_PAYMENT` hold must expire automatically if payment is not completed before the hold deadline.
- BR-012: `PENDING_PAYMENT` can become `CONFIRMED` only after payment succeeds.
- BR-013: Booking status `PAID` must not be used in V2.
- BR-014: Payment status `PAID` must be separate from booking status `CONFIRMED`.
- BR-015: Generic booking status `CANCELLED` must not be used in V2.
- BR-016: Cancellation status must identify the cancelling actor.
- BR-017: Terminal reservation states must not transition back to active states.
- BR-018: `COMPLETED` bookings must not be cancelled.
- BR-019: `EXPIRED` bookings must not become `CONFIRMED`.
- BR-020: `CONFIRMED` bookings must retain immutable price and policy snapshots.
- BR-021: Refunds must be calculated from booking snapshot, not current listing price.
- BR-022: Cancellation policy must be calculated from booking snapshot, not current listing policy.
- BR-023: Service fee and cleaning fee must be explicit booking amount components.
- BR-024: Total paid amount must equal the confirmed booking snapshot amount.
- BR-025: Guest cancellation requires a valid cancellation quote.
- BR-026: Host cancellation requires a valid cancellation quote.
- BR-027: Cancellation quote must be time-limited.
- BR-028: Cancellation confirmation must use the same quote that was shown to the actor.
- BR-029: Guest cancellation is allowed only for `CONFIRMED` bookings before check-in.
- BR-030: Host cancellation is allowed only for `CONFIRMED` bookings before check-in.
- BR-031: Guest cancellation changes booking status to `CANCELLED_BY_GUEST`.
- BR-032: Host cancellation changes booking status to `CANCELLED_BY_HOST`.
- BR-033: Admin force cancellation changes booking status to `CANCELLED_BY_ADMIN`.
- BR-034: Host cancellation always grants guest a full refund of remaining paid amount.
- BR-035: Host cancellation always creates an active host penalty unless later waived by admin.
- BR-036: Guest cancellation must not create host penalty.
- BR-037: Service fee is refunded only when guest receives a full refund.
- BR-038: Cleaning fee is refunded when guest has not checked in.
- BR-039: Refund amount must never exceed remaining refundable paid amount.
- BR-040: Refund must be linked to exactly one business cause.
- BR-041: Payment status becomes `REFUND_PENDING` when a refund record is created.
- BR-042: Payment status becomes `PARTIALLY_REFUNDED` when only part of refundable paid amount has been refunded.
- BR-043: Payment status becomes `REFUNDED` when all refundable paid amount has been refunded.
- BR-044: Payment status becomes `REFUND_FAILED` when refund processing fails.
- BR-045: Refund failure must notify guest and admin.
- BR-046: Refund completion must notify guest.
- BR-047: Only `CONFIRMED` bookings can check in.
- BR-048: Only `CHECKED_IN` bookings can check out.
- BR-049: Only `CHECKED_OUT` bookings can become `COMPLETED`.
- BR-050: Guest cancellation and host cancellation are not allowed after check-in.
- BR-051: Post-check-in incidents must use complaint flow.
- BR-052: Complaint can be created only for `CHECKED_IN` bookings.
- BR-053: Complaint must be created within 24 hours after check-in.
- BR-054: A booking can have only one active complaint.
- BR-055: Complaint must include type and description.
- BR-056: Complaint evidence is optional but must be attached to the complaint when provided.
- BR-057: New complaint status is `WAITING_HOST_RESPONSE`.
- BR-058: Host can respond only while complaint is `WAITING_HOST_RESPONSE`.
- BR-059: Host response changes complaint status to `OPEN`.
- BR-060: Guest can accept host response only while complaint is `OPEN`.
- BR-061: Guest can escalate complaint only while complaint is `OPEN`.
- BR-062: System must escalate complaint when host response deadline passes.
- BR-063: Admin can decide only while complaint is `ESCALATED_TO_ADMIN`.
- BR-064: Admin full refund on a checked-in booking changes booking status to `CANCELLED_BY_ADMIN`.
- BR-065: Admin `RESOLVE_NO_REFUND` keeps booking in current lifecycle state.
- BR-066: Admin `REJECT` keeps booking in current lifecycle state.
- BR-067: `SUSPEND_LISTING` changes listing status to `SUSPENDED`.
- BR-068: Listing suspension must not automatically cancel existing bookings.
- BR-069: Only active host penalties count toward thresholds.
- BR-070: Waived host penalties must not count toward thresholds.
- BR-071: Three active cancellation penalties within 90 days for the same listing suspend the listing for 7 days.
- BR-072: Five active cancellation penalties within 180 days for the same host mark the host for admin review.
- BR-073: Admin must provide a note for every complaint decision.
- BR-074: Admin must provide a reason when waiving penalty.
- BR-075: Admin must provide a reason when suspending or unsuspending listing.
- BR-076: All cancellation, refund, complaint, penalty, and suspension events must create notifications for required recipients.
- BR-077: Availability release must happen after cancellation state is recorded.
- BR-078: Existing bookings remain valid when listing is suspended unless separately cancelled by an allowed flow.
- BR-079: Refund handling must account for host payout state.
- BR-080: Normal users must not create arbitrary refunds outside cancellation or complaint resolution flows.

# Changelog

## Changes From Previous Version

- Added full booking lifecycle from search through booking request, approval, confirmation, check-in, check-out, and completion.
- Added final canonical reservation state list including `PENDING_PAYMENT`, `CONFIRMED`, `CHECKED_OUT`, and actor-specific cancellation states.
- Added final payment state list separating booking lifecycle from payment lifecycle.
- Added canonical terms to remove ambiguity between booking and reservation.
- Added explicit rule that `PAID` is not a booking status in V2.
- Added explicit rule that generic `CANCELLED` is not a booking status in V2.
- Added approval definition as system approval, not manual host approval.
- Added immutable pricing and cancellation policy snapshot rules.
- Added availability blocking and release rules.
- Added refund handling as a consequence of cancellation or complaint resolution.
- Added host penalty statuses and threshold rules.
- Added admin force cancellation rules.
- Added notification events for the full lifecycle, not only cancellation and complaint.
- Refactored guest cancellation to require quote-first confirmation.
- Refactored host cancellation to require quote-first confirmation and full guest refund.
- Refactored post-check-in issues to use complaint/admin intervention instead of host or guest cancellation.
- Refactored completion flow to `CHECKED_IN -> CHECKED_OUT -> COMPLETED`.
- Clarified that listing suspension blocks new bookings but does not automatically cancel existing bookings.
- Clarified that refund amount must never exceed remaining refundable paid amount.
- Clarified complaint eligibility, state transitions, admin decisions, and listing suspension decisions.
- Removed ambiguous generic cancellation behavior.
- Removed business dependency on current implementation status names that conflict with V2 terminology.
- Removed standalone user-driven refund behavior from normal guest and host flows.
