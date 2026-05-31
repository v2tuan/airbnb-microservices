import { Heart, Search, SlidersHorizontal, Star } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import {
  type ListingResponse,
  listingAPI,
  unwrapApiData,
} from "@/api/endpoints/listing";
import SearchMap from "@/components/search/SearchMap";
import { formatPrice } from "@/contants";

interface SearchPageProps {
  searchParams: Promise<{
    q?: string;
    city?: string;
    country?: string;
    guests?: string;
    minPrice?: string;
    maxPrice?: string;
  }>;
}

const fallbackImage =
    "https://images.unsplash.com/photo-1505693416388-ac5ce068fe85?q=80&w=1200&auto=format&fit=crop";

const quickDestinations = ["Hanoi", "Dalat", "Da Nang", "Ho Chi Minh"];

function resolveCoverImage(listing: ListingResponse) {
  return (
      listing.photos?.find((photo) => photo.isCover)?.photoUrl ??
      listing.photos?.[0]?.photoUrl ??
      fallbackImage
  );
}

function resolveRating(listingId: string) {
  const seed = listingId
      .split("")
      .reduce((total, character) => total + character.charCodeAt(0), 0);

  return (4.65 + (seed % 31) / 100).toFixed(2);
}

function filterListings(
    listings: ListingResponse[],
    destination: string,
    country: string | undefined,
    maxGuests: number | undefined,
) {
  const normalizedDestination = destination.trim().toLowerCase();
  const normalizedCountry = country?.trim().toLowerCase();

  return listings.filter((listing) => {
    const matchesDestination =
        !normalizedDestination ||
        listing.city?.toLowerCase().includes(normalizedDestination) ||
        listing.country?.toLowerCase().includes(normalizedDestination) ||
        listing.title?.toLowerCase().includes(normalizedDestination);

    const matchesCountry =
        !normalizedCountry ||
        listing.country?.toLowerCase().includes(normalizedCountry);

    const matchesGuests = !maxGuests || listing.maxGuests >= maxGuests;

    return matchesDestination && matchesCountry && matchesGuests;
  });
}

function formatStayDetails(listing: ListingResponse) {
  return [
    listing.roomType?.replace("_", " ").toLowerCase(),
    `${listing.maxGuests} guests`,
    `${listing.numBedrooms} bedrooms`,
    `${listing.numBeds} beds`,
  ]
      .filter(Boolean)
      .join(" · ");
}

function buildSearchHref(params: Record<string, string | number | undefined>) {
  const query = new URLSearchParams();

  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && `${value}`.trim()) {
      query.set(key, `${value}`);
    }
  });

  return `/search?${query.toString()}`;
}

export default async function SearchPage({ searchParams }: SearchPageProps) {
  const query = await searchParams;
  const destination = query.city ?? query.q ?? "";
  const country = query.country;
  const maxGuests = query.guests ? Number(query.guests) : undefined;
  const minPrice = query.minPrice ? Number(query.minPrice) : undefined;
  const maxPrice = query.maxPrice ? Number(query.maxPrice) : undefined;

  let listings: ListingResponse[] = [];
  let errorMessage = "";

  try {
    if (Number.isFinite(minPrice) && Number.isFinite(maxPrice)) {
      const response = await listingAPI.searchByPriceRange({
        minPrice: minPrice as number,
        maxPrice: maxPrice as number,
      });
      listings = unwrapApiData(response.data);
    } else {
      const response = await listingAPI.searchListings({
        city: destination || undefined,
        country,
        maxGuests,
      });
      listings = unwrapApiData(response.data);
    }
  } catch {
    errorMessage = "Unable to load search results.";
  }

  const visibleListings = filterListings(
      listings,
      destination,
      country,
      maxGuests,
  );
  const resultLabel = destination
      ? `Places in ${destination}`
      : "Places to stay";
  const priceLabel =
      Number.isFinite(minPrice) && Number.isFinite(maxPrice)
          ? `${formatPrice(minPrice as number, "USD")} - ${formatPrice(maxPrice as number, "USD")}`
          : "Any price";

  return (
      <main className="min-h-screen bg-white">
        {/*<div className="sticky top-0 z-30 border-b border-neutral-200 bg-white/95 backdrop-blur">*/}
        {/*  <div className="mx-auto flex w-full max-w-[1760px] flex-col gap-3 px-4 py-3 sm:px-8 xl:px-10">*/}
        {/*    <form*/}
        {/*      action="/search"*/}
        {/*      className="mx-auto grid w-full max-w-4xl gap-1 rounded-full border border-neutral-200 bg-white p-1.5 shadow-sm md:grid-cols-[minmax(0,1.25fr)_minmax(0,0.65fr)_minmax(0,0.8fr)_auto]"*/}
        {/*    >*/}
        {/*      <label className="min-w-0 rounded-full px-4 py-2 transition hover:bg-neutral-50">*/}
        {/*        <span className="block text-[11px] font-bold leading-none text-neutral-950">*/}
        {/*          Where*/}
        {/*        </span>*/}
        {/*        <input*/}
        {/*          name="city"*/}
        {/*          defaultValue={destination}*/}
        {/*          placeholder="Search destinations"*/}
        {/*          className="mt-0.5 w-full bg-transparent text-[13px] text-neutral-700 outline-none placeholder:text-neutral-400"*/}
        {/*        />*/}
        {/*      </label>*/}

        {/*      <label className="min-w-0 rounded-full px-4 py-2 transition hover:bg-neutral-50">*/}
        {/*        <span className="block text-[11px] font-bold leading-none text-neutral-950">*/}
        {/*          Guests*/}
        {/*        </span>*/}
        {/*        <input*/}
        {/*          name="guests"*/}
        {/*          defaultValue={query.guests ?? ""}*/}
        {/*          inputMode="numeric"*/}
        {/*          placeholder="Add guests"*/}
        {/*          className="mt-0.5 w-full bg-transparent text-[13px] text-neutral-700 outline-none placeholder:text-neutral-400"*/}
        {/*        />*/}
        {/*      </label>*/}

        {/*      <div className="grid min-w-0 grid-cols-2 gap-2 rounded-full px-4 py-2 transition hover:bg-neutral-50">*/}
        {/*        <label>*/}
        {/*          <span className="block text-[11px] font-bold leading-none text-neutral-950">*/}
        {/*            Min*/}
        {/*          </span>*/}
        {/*          <input*/}
        {/*            name="minPrice"*/}
        {/*            defaultValue={query.minPrice ?? ""}*/}
        {/*            inputMode="numeric"*/}
        {/*            placeholder="$0"*/}
        {/*            className="mt-0.5 w-full bg-transparent text-[13px] text-neutral-700 outline-none placeholder:text-neutral-400"*/}
        {/*          />*/}
        {/*        </label>*/}
        {/*        <label>*/}
        {/*          <span className="block text-[11px] font-bold leading-none text-neutral-950">*/}
        {/*            Max*/}
        {/*          </span>*/}
        {/*          <input*/}
        {/*            name="maxPrice"*/}
        {/*            defaultValue={query.maxPrice ?? ""}*/}
        {/*            inputMode="numeric"*/}
        {/*            placeholder="$500"*/}
        {/*            className="mt-0.5 w-full bg-transparent text-[13px] text-neutral-700 outline-none placeholder:text-neutral-400"*/}
        {/*          />*/}
        {/*        </label>*/}
        {/*      </div>*/}

        {/*      <button*/}
        {/*        type="submit"*/}
        {/*        className="inline-flex size-11 items-center justify-center rounded-full bg-rose-500 text-white transition hover:bg-rose-600 md:w-11"*/}
        {/*        aria-label="Search"*/}
        {/*      >*/}
        {/*        <Search className="size-4" />*/}
        {/*      </button>*/}
        {/*    </form>*/}

        {/*    <div className="flex items-center gap-2 overflow-x-auto pb-0.5">*/}
        {/*      <button*/}
        {/*        type="button"*/}
        {/*        className="inline-flex h-8 shrink-0 items-center gap-1.5 rounded-full border border-neutral-300 bg-white px-3 text-xs font-semibold text-neutral-900 shadow-sm"*/}
        {/*      >*/}
        {/*        <SlidersHorizontal className="size-3.5" />*/}
        {/*        Filters*/}
        {/*      </button>*/}
        {/*      {quickDestinations.map((city) => (*/}
        {/*        <Link*/}
        {/*          key={city}*/}
        {/*          href={buildSearchHref({ city, guests: maxGuests })}*/}
        {/*          className={`inline-flex h-8 shrink-0 items-center rounded-full border px-3 text-xs font-semibold transition ${*/}
        {/*            destination.toLowerCase() === city.toLowerCase()*/}
        {/*              ? "border-neutral-950 bg-neutral-950 text-white"*/}
        {/*              : "border-neutral-200 bg-white text-neutral-700 hover:border-neutral-950"*/}
        {/*          }`}*/}
        {/*        >*/}
        {/*          {city}*/}
        {/*        </Link>*/}
        {/*      ))}*/}
        {/*      <Link*/}
        {/*        href={buildSearchHref({*/}
        {/*          city: destination,*/}
        {/*          guests: maxGuests,*/}
        {/*          minPrice: 0,*/}
        {/*          maxPrice: 100,*/}
        {/*        })}*/}
        {/*        className="inline-flex h-8 shrink-0 items-center rounded-full border border-neutral-200 bg-white px-3 text-xs font-semibold text-neutral-700 transition hover:border-neutral-950"*/}
        {/*      >*/}
        {/*        Under $100*/}
        {/*      </Link>*/}
        {/*    </div>*/}
        {/*  </div>*/}
        {/*</div>*/}

        <div className="mx-auto grid w-full max-w-[1760px] gap-10 px-4 py-6 sm:px-8 lg:grid-cols-[minmax(0,1fr)_minmax(360px,46vw)] xl:px-10">
          {/* Left: Listings */}
          <section>
            {/* Result meta */}
            <div className="mb-5">
              <p className="text-sm text-neutral-500">
                {visibleListings.length} stays ·{" "}
                <span className="font-medium text-neutral-700">{priceLabel}</span>
                {maxGuests ? ` · ${maxGuests} guests` : ""}
              </p>
              <h1 className="mt-1 text-2xl font-semibold tracking-tight text-neutral-950 md:text-[1.65rem]">
                {resultLabel}
              </h1>
            </div>

            {errorMessage ? (
                <div className="rounded-2xl border border-red-100 bg-red-50 p-6 text-sm text-red-600">
                  {errorMessage}
                </div>
            ) : visibleListings.length === 0 ? (
                <div className="rounded-2xl border border-neutral-200 bg-neutral-50 p-10 text-center text-neutral-500">
                  <p className="text-base font-medium">No listings match your search.</p>
                  <p className="mt-1 text-sm">Try adjusting your filters or destination.</p>
                </div>
            ) : (
              <div className="grid grid-cols-1 gap-x-5 gap-y-8 sm:grid-cols-2 3xl:grid-cols-3">
            {visibleListings.map((listing) => {
              const coverImageUrl = resolveCoverImage(listing);
              const basePrice = listing.pricing?.basePrice ?? 0;
              const currency = listing.pricing?.currency ?? "USD";

              return (
              <Link
              key={listing.listingId}
            href={`/rooms/${listing.listingId}`}
            className="group block"
          >
            <article>
              {/* Image — đổi từ aspect-square → aspect-[20/13] giống Airbnb */}
              <div className="relative aspect-[20/13] overflow-hidden rounded-2xl bg-neutral-100">
                <Image
                    src={coverImageUrl}
                    alt={listing.title}
                    fill
                    className="object-cover transition duration-500 group-hover:scale-[1.03]"
                    sizes="(max-width: 767px) 92vw, (max-width: 1535px) 44vw, 28vw"
                />

                {/* Wishlist button */}
                <button
                    aria-label="Save to wishlist"
                    className="absolute right-3 top-3 flex size-8 items-center justify-center rounded-full transition"
                >
                  <Heart
                      className="size-[22px] drop-shadow-[0_1px_2px_rgba(0,0,0,0.5)]"
                      stroke="white"
                      strokeWidth={2}
                      fill="transparent"
                  />
                </button>

                {/* Badges */}
                {listing.instantBook ? (
                    <span className="absolute left-3 top-3 rounded-full bg-white px-2.5 py-1 text-xs font-semibold text-neutral-950 shadow-sm">
                Instant Book
              </span>
                ) : null}
              </div>

              {/* Info — bố cục giống Airbnb */}
              <div className="mt-3 space-y-0.5">
                {/* Dòng 1: Location (bold) + Rating */}
                <div className="flex items-start justify-between gap-2">
                  <h2 className="line-clamp-1 text-sm font-semibold text-neutral-950">
                    {listing.city}, {listing.country}
                  </h2>
                  <span className="inline-flex shrink-0 items-center gap-1 text-sm text-neutral-950">
                <Star className="size-3.5 fill-neutral-950" />
                    {resolveRating(listing.listingId)}
              </span>
                </div>

                {/* Dòng 2: Title (màu xám nhạt hơn) */}
                <p className="line-clamp-1 text-sm text-neutral-500">
                  {listing.title}
                </p>

                {/* Dòng 3: Stay details */}
                <p className="line-clamp-1 text-sm text-neutral-500">
                  {formatStayDetails(listing)}
                </p>

                {/* Dòng 4: Giá — underline giống Airbnb style */}
                <p className="pt-1 text-sm text-neutral-950">
              <span className="font-semibold underline">
                {formatPrice(basePrice, currency)}
              </span>
                  <span className="text-neutral-500"> / night</span>
                </p>
              </div>
            </article>
          </Link>
          );
          })}
        </div>
            )}
          </section>

          {/* Right: Map */}
          <aside className="hidden lg:block">
            <div className="sticky top-[112px] h-[calc(100vh-136px)] overflow-hidden rounded-2xl border border-neutral-200 shadow-sm">
              <SearchMap destination={destination} listings={visibleListings} />
            </div>
          </aside>
        </div>
      </main>
  );
}