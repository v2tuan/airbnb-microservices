import Link from "next/link";
import {
  type ListingResponse,
  listingAPI,
  unwrapApiData,
} from "@/api/endpoints/listing";
import SearchListingCard from "@/components/search/SearchListingCard";
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
    roomType?: string;
    bedrooms?: string;
    beds?: string;
    bathrooms?: string;
    amenities?: string;
    petsAllowed?: string;
    freeCancellation?: string;
    latitude?: string;
    longitude?: string;
    locationKeyword?: string;
    radius?: string;
    checkIn?: string;
    checkOut?: string;
    instantBook?: string;
    page?: string;
  }>;
}

type SearchQuery = Awaited<SearchPageProps["searchParams"]>;

const PAGE_SIZE = 12;
const SEARCH_FETCH_LIMIT = 1000;

const destinationAliases: Record<string, string> = {
  "da lat": "Dalat",
  dalat: "Dalat",
  "ha noi": "Hanoi",
  hanoi: "Hanoi",
};

function normalizeDestination(value: string) {
  const trimmed = value.trim();
  return destinationAliases[trimmed.toLowerCase()] ?? trimmed;
}

function getAmenities(query: SearchQuery) {
  return query.amenities
    ? query.amenities
        .split(",")
        .map((value) => value.trim())
        .filter(Boolean)
    : [];
}

function buildSearchHref(
  query: SearchQuery,
  updates: Record<string, string | number | boolean | undefined | null>,
) {
  const params = new URLSearchParams();

  Object.entries(query).forEach(([key, value]) => {
    if (value) params.set(key, value);
  });

  Object.entries(updates).forEach(([key, value]) => {
    if (value === undefined || value === null || value === "") {
      params.delete(key);
    } else {
      params.set(key, String(value));
    }
  });

  const queryString = params.toString();
  return `/search${queryString ? `?${queryString}` : ""}`;
}

function getPaginationItems(currentPage: number, pageCount: number) {
  const pages = new Set([
    1,
    pageCount,
    currentPage - 1,
    currentPage,
    currentPage + 1,
  ]);

  return Array.from(pages)
    .filter((page) => page >= 1 && page <= pageCount)
    .sort((a, b) => a - b);
}

export default async function SearchPage({ searchParams }: SearchPageProps) {
  const query = await searchParams;
  const rawDestination = query.city ?? query.q ?? "";
  const destination = normalizeDestination(rawDestination);
  const country = query.country;
  const maxGuests = query.guests ? Number(query.guests) : undefined;
  const minPrice = query.minPrice ? Number(query.minPrice) : undefined;
  const maxPrice = query.maxPrice ? Number(query.maxPrice) : undefined;
  const roomTypes = query.roomType
    ? query.roomType
        .split(",")
        .map((value) => value.trim())
        .filter(Boolean)
    : [];
  const bedrooms = query.bedrooms ? Number(query.bedrooms) : undefined;
  const beds = query.beds ? Number(query.beds) : undefined;
  const bathrooms = query.bathrooms ? Number(query.bathrooms) : undefined;
  const amenities = query.amenities ? getAmenities(query) : [];
  const instantBook = query.instantBook === "true";
  const requestedPage = query.page ? Number(query.page) : 1;
  const latitude = query.latitude ? Number(query.latitude) : undefined;
  const longitude = query.longitude ? Number(query.longitude) : undefined;
  const radius = query.radius ? Number(query.radius) : 25;
  const hasNearbySearch =
    Number.isFinite(latitude) && Number.isFinite(longitude);
  const checkIn = query.checkIn;
  const checkOut = query.checkOut;
  const hasDateRange = Boolean(checkIn && checkOut && checkOut > checkIn);

  let listings: ListingResponse[] = [];
  let errorMessage = "";

  try {
    const response = await listingAPI.searchListingsWithFilters({
      state: destination || undefined,
      country,
      guests: maxGuests,
      minPrice,
      maxPrice,
      minBedrooms: bedrooms,
      minBeds: beds,
      minBathrooms: bathrooms,
      roomTypes: roomTypes.length
        ? (roomTypes as Array<"ENTIRE_PLACE" | "PRIVATE_ROOM" | "SHARED_ROOM">)
        : undefined,
      instantBook,
      amenityNames: amenities,
      latitude,
      longitude,
      radiusKm: radius,
      checkIn,
      checkOut,
      limit: SEARCH_FETCH_LIMIT,
    });
    listings = unwrapApiData(response.data);
  } catch {
    errorMessage = "Unable to load search results.";
  }

  const pageCount = Math.max(1, Math.ceil(listings.length / PAGE_SIZE));
  const currentPage = Math.min(
    Math.max(Number.isFinite(requestedPage) ? requestedPage : 1, 1),
    pageCount,
  );
  const pageStart = (currentPage - 1) * PAGE_SIZE;
  const paginatedListings = listings.slice(
    pageStart,
    pageStart + PAGE_SIZE,
  );
  const paginationItems = getPaginationItems(currentPage, pageCount);
  const resultLabel = destination
    ? `Places in ${destination}`
    : hasNearbySearch
      ? "Places near you"
      : "Places to stay";
  const priceLabel =
    Number.isFinite(minPrice) && Number.isFinite(maxPrice)
      ? `${formatPrice(minPrice as number, "USD")} - ${formatPrice(maxPrice as number, "USD")}`
      : "Any price";
  const mapDestination = hasNearbySearch
    ? "Nearby"
    : (query.locationKeyword ?? destination);

  return (
    <main className="min-h-screen bg-white pt-41">
      <div className="mx-auto grid w-full max-w-440 gap-10 px-4 py-6 sm:px-8 lg:grid-cols-[minmax(0,1fr)_minmax(360px,46vw)] xl:px-10">
        {/* Left: Listings */}
        <section>
          {/* Result meta */}
          <div className="mb-5">
            <p className="text-sm text-neutral-500">
              {listings.length} stays
              {pageCount > 1 ? ` · Page ${currentPage} of ${pageCount}` : ""} ·{" "}
              <span className="font-medium text-neutral-700">{priceLabel}</span>
              {maxGuests ? ` · ${maxGuests} guests` : ""}
              {hasDateRange ? ` · ${checkIn} - ${checkOut}` : ""}
            </p>
            <h1 className="mt-1 text-2xl font-semibold tracking-tight text-neutral-950 md:text-[1.65rem]">
              {resultLabel}
            </h1>
          </div>

          {errorMessage ? (
            <div className="rounded-2xl border border-red-100 bg-red-50 p-6 text-sm text-red-600">
              {errorMessage}
            </div>
          ) : listings.length === 0 ? (
            <div className="rounded-2xl border border-neutral-200 bg-neutral-50 p-10 text-center text-neutral-500">
              <p className="text-base font-medium">
                No listings match your search.
              </p>
              <p className="mt-1 text-sm">
                Try adjusting your filters or destination.
              </p>
            </div>
          ) : (
            <>
              <div className="grid grid-cols-1 gap-x-5 gap-y-8 sm:grid-cols-2 3xl:grid-cols-3">
                {paginatedListings.map((listing) => (
                  <SearchListingCard
                    key={listing.listingId}
                    listing={listing}
                  />
                ))}
              </div>

              {pageCount > 1 ? (
                <nav
                  aria-label="Search results pagination"
                  className="mt-10 flex items-center justify-center gap-2"
                >
                  <Link
                    href={buildSearchHref(query, {
                      page: currentPage > 2 ? currentPage - 1 : null,
                    })}
                    scroll={false}
                    aria-disabled={currentPage === 1}
                    className={`inline-flex h-10 items-center rounded-full border px-4 text-sm font-semibold transition ${
                      currentPage === 1
                        ? "pointer-events-none border-neutral-200 text-neutral-300"
                        : "border-neutral-300 text-neutral-800 hover:border-neutral-950"
                    }`}
                  >
                    Previous
                  </Link>

                  {paginationItems.map((pageNumber, index) => {
                    const previousPage = paginationItems[index - 1];
                    const showGap =
                      previousPage !== undefined &&
                      pageNumber - previousPage > 1;

                    return (
                      <span
                        key={pageNumber}
                        className="inline-flex items-center gap-2"
                      >
                        {showGap ? (
                          <span className="px-1 text-sm text-neutral-400">
                            ...
                          </span>
                        ) : null}
                        <Link
                          href={buildSearchHref(query, {
                            page: pageNumber === 1 ? null : pageNumber,
                          })}
                          scroll={false}
                          aria-current={
                            pageNumber === currentPage ? "page" : undefined
                          }
                          className={`inline-flex size-10 items-center justify-center rounded-full border text-sm font-semibold transition ${
                            pageNumber === currentPage
                              ? "border-neutral-950 bg-neutral-950 text-white"
                              : "border-neutral-300 text-neutral-800 hover:border-neutral-950"
                          }`}
                        >
                          {pageNumber}
                        </Link>
                      </span>
                    );
                  })}

                  <Link
                    href={buildSearchHref(query, {
                      page: currentPage + 1,
                    })}
                    scroll={false}
                    aria-disabled={currentPage === pageCount}
                    className={`inline-flex h-10 items-center rounded-full border px-4 text-sm font-semibold transition ${
                      currentPage === pageCount
                        ? "pointer-events-none border-neutral-200 text-neutral-300"
                        : "border-neutral-300 text-neutral-800 hover:border-neutral-950"
                    }`}
                  >
                    Next
                  </Link>
                </nav>
              ) : null}
            </>
          )}
        </section>

        {/* Right: Map */}
        <aside className="hidden lg:block">
          <div className="sticky top-45 h-[calc(100vh-204px)] overflow-hidden rounded-2xl border border-neutral-200 shadow-sm">
            <SearchMap
              destination={mapDestination}
              listings={paginatedListings}
            />
          </div>
        </aside>
      </div>
    </main>
  );
}
