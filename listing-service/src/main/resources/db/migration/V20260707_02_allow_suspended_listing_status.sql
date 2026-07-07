ALTER TABLE public.listings
    DROP CONSTRAINT IF EXISTS listings_status_check;

ALTER TABLE public.listings
    ADD CONSTRAINT listings_status_check
    CHECK ((status)::text = ANY (ARRAY[
        'DRAFT'::text,
        'ACTIVE'::text,
        'INACTIVE'::text,
        'PENDING_APPROVAL'::text,
        'SUSPENDED'::text
    ]));
