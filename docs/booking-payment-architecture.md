# Booking and Payment Architecture

## Scope

This extension keeps the existing authentication and security modules intact. The change is limited to Booking lifecycle finalization, Stripe PaymentIntent integration, webhook idempotency, delayed Stripe Connect payout, refunds, transaction history, Kafka events, scheduler jobs, and cache hooks.

## Lifecycles

Booking:

1. `PENDING_PAYMENT`: created before Stripe confirmation and expires after 15 minutes.
2. `PAID`: set only from verified Stripe `payment_intent.succeeded`.
3. `CHECKED_IN`: set when guest check-in is confirmed.
4. `COMPLETED`: set after stay completion.
5. `CANCELLED` or `EXPIRED`: terminal states.

Payment:

1. `CREATED`: platform PaymentIntent created without `transfer_data`.
2. `SUCCEEDED`: webhook confirms payment. Ledger transaction is created.
3. `FAILED` or `CANCELLED`: webhook records failure and guest can retry until booking expires.
4. `PARTIALLY_REFUNDED` or `REFUNDED`: updated after Stripe refund succeeds.

Payout:

1. `PENDING_CHECKIN`: created after successful payment.
2. `SCHEDULED`: guest checked in, payout eligible at `checkedInAt + 24h`.
3. `PROCESSING`: scheduler is creating Stripe Transfer.
4. `COMPLETED`: Stripe Transfer succeeded.
5. `RETRY` or `FAILED`: transient Stripe errors retry with bounded backoff.

Refund:

1. Validate refund amount against remaining refundable amount.
2. If payout has not completed, call Stripe Refund on the PaymentIntent.
3. If payout completed, reverse the Stripe Transfer first, then refund the guest.
4. If reversal/refund fails, mark refund transaction `FAILED` for manual review.

Webhook:

1. Controller verifies `Stripe-Signature`.
2. Persist `stripe_webhook_events.event_id` before applying side effects.
3. Duplicate event IDs are skipped by primary key.
4. Process payment event in a DB transaction.
5. Mark webhook `PROCESSED` or `FAILED`.

## Consistency

The system uses local DB transactions plus idempotent external calls. Stripe calls use idempotency keys derived from booking/payment/refund/payout IDs. Cross-service consistency is eventual: Booking is updated by Payment Service after a verified webhook, and Payout is driven by scheduler plus Booking state.

Tradeoff: this avoids distributed transactions and keeps services autonomous, but requires reconciliation jobs and idempotent handlers.

## Anti Double Booking

Booking creation uses `pg_advisory_xact_lock(hashtext(listingId))` before checking overlapping active bookings. This serializes booking attempts for the same listing. For stronger PostgreSQL enforcement, the migration includes an optional GiST exclusion constraint using `daterange`.

Tradeoff: advisory lock is easy to add without changing schema heavily; exclusion constraint is stronger but PostgreSQL-specific.

## Kafka

Payment Service publishes:

- `payment.succeeded`
- `payout.completed`
- `refund.completed`

Consumers should use manual ack, bounded retry, and `.DLT` topics. Current config sets manual ack and retry; production should attach a `DeadLetterPublishingRecoverer` when all topics are provisioned.

## Redis Cache

Transaction history methods are cacheable:

- transaction by ID
- booking transaction history
- payer transaction history
- host payout history

`CACHE_TYPE=simple` is the safe local default. Use `CACHE_TYPE=redis` with Redis in production.

## Reconciliation

Production reconciliation should run periodically:

- fetch Stripe PaymentIntents changed since last checkpoint
- compare payment status, amount, currency, and refund totals
- fetch Stripe Transfers for payout settlement
- flag mismatches into audit/manual review

This should be implemented as a separate scheduler to avoid mixing reconciliation with webhook latency.
