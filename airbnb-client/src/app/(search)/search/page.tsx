import { Heart, MapPinned, Star } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import {
  type ListingResponse,
  listingAPI,
  unwrapApiData,
} from "@/api/endpoints/listing";
import SearchMap from "@/components/search/SearchMap";
import {
  Pagination,
  PaginationContent,
  PaginationEllipsis,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from "@/components/ui/pagination";
import { formatPrice } from "@/contants";
import { cn } from "@/lib/utils";

interface SearchPageProps {
  searchParams: Promise<{
    q?: string;
    city?: string;
    country?: string;
    guests?: string;
    minPrice?: string;
    maxPrice?: string;
    roomType?: string;
    propertyType?: string;
    amenity?: string;
    amenities?: string;
    bedrooms?: string;
    beds?: string;
    bathrooms?: string;
    instantBook?: string;
    page?: string;
    size?: string;
  }>;
}

const fallbackImage =
  "https://images.unsplash.com/photo-1505693416388-ac5ce068fe85?q=80&w=1200&auto=format&fit=crop";

const pageSizeOptions = [6, 9, 12];
const defaultPageSize = 6;
const searchTimeoutMs = 7000;

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

function parsePositiveNumber(value: string | undefined) {
  if (!value) return undefined;

  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : undefined;
}

function parsePage(value: string | undefined) {
  const parsed = parsePositiveNumber(value);
  return parsed ? Math.floor(parsed) : 1;
}

function normalizeFilterValue(value: string | undefined) {
  return value
    ?.trim()
    .toLowerCase()
    .replace(/[\s-]+/g, "_");
}

function filterListings(
  listings: ListingResponse[],
  destination: string,
  country: string | undefined,
  maxGuests: number | undefined,
  filters: {
    amenities: string[];
    bathrooms?: number;
    bedrooms?: number;
    beds?: number;
    instantBook?: boolean;
    propertyType?: string;
    roomType?: string;
  },
) {
  const normalizedDestination = destination.trim().toLowerCase();
  const normalizedCountry = country?.trim().toLowerCase();
  const normalizedRoomType = normalizeFilterValue(filters.roomType);
  const normalizedPropertyType = normalizeFilterValue(filters.propertyType);

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
    const matchesRoomType =
      !normalizedRoomType ||
      listing.roomType.toLowerCase() === normalizedRoomType;
    const matchesPropertyType =
      !normalizedPropertyType ||
      listing.propertyType.toLowerCase() === normalizedPropertyType;
    const matchesBedrooms =
      !filters.bedrooms || listing.numBedrooms >= filters.bedrooms;
    const matchesBeds = !filters.beds || listing.numBeds >= filters.beds;
    const matchesBathrooms =
      !filters.bathrooms || listing.numBathrooms >= filters.bathrooms;
    const matchesInstantBook =
      filters.instantBook === undefined ||
      Boolean(listing.instantBook) === filters.instantBook;
    const listingAmenities =
      listing.amenities?.map((amenity) =>
        amenity.name.toLowerCase().replace(/[\s-]+/g, "_"),
      ) ?? [];
    const matchesAmenities =
      filters.amenities.length === 0 ||
      filters.amenities.every((amenity) => listingAmenities.includes(amenity));

    return (
      matchesDestination &&
      matchesCountry &&
      matchesGuests &&
      matchesRoomType &&
      matchesPropertyType &&
      matchesBedrooms &&
      matchesBeds &&
      matchesBathrooms &&
      matchesInstantBook &&
      matchesAmenities
    );
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

  const queryString = query.toString();
  return queryString ? `/search?${queryString}` : "/search";
}

function buildPageNumbers(currentPage: number, totalPages: number) {
  if (totalPages <= 7) {
    return Array.from({ length: totalPages }, (_, index) => index + 1);
  }

  const pages = new Set([1, totalPages, currentPage]);

  if (currentPage > 2) pages.add(currentPage - 1);
  if (currentPage < totalPages - 1) pages.add(currentPage + 1);
  if (currentPage <= 3) pages.add(2).add(3);
  if (currentPage >= totalPages - 2) {
    pages.add(totalPages - 1).add(totalPages - 2);
  }

  return Array.from(pages).sort((a, b) => a - b);
}

function withSearchTimeout<T>(request: Promise<T>) {
  return Promise.race([
    request,
    new Promise<T>((_, reject) => {
      setTimeout(() => {
        reject(new Error("Search request timed out."));
      }, searchTimeoutMs);
    }),
  ]);
}

export default async function SearchPage({ searchParams }: SearchPageProps) {
  const query = await searchParams;
  const destination = query.city ?? query.q ?? "";
  const country = query.country;
  const maxGuests = parsePositiveNumber(query.guests);
  const minPrice = parsePositiveNumber(query.minPrice);
  const maxPrice = parsePositiveNumber(query.maxPrice);
  const bedrooms = parsePositiveNumber(query.bedrooms);
  const beds = parsePositiveNumber(query.beds);
  const bathrooms = parsePositiveNumber(query.bathrooms);
  const requestedSize = parsePositiveNumber(query.size);
  const pageSize =
    requestedSize && pageSizeOptions.includes(requestedSize)
      ? requestedSize
      : defaultPageSize;

  let listings: ListingResponse[] = [];
  let errorMessage = "";

  try {
    if (minPrice !== undefined && maxPrice !== undefined) {
      const response = await withSearchTimeout(
        listingAPI.searchByPriceRange({
          minPrice,
          maxPrice,
        }),
      );
      listings = unwrapApiData(response.data);
    } else {
      const response = await withSearchTimeout(
        listingAPI.searchListings({
          city: destination || undefined,
          country,
          maxGuests,
        }),
      );
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
    {
      amenities: [query.amenity, ...(query.amenities?.split(",") ?? [])]
        .map(normalizeFilterValue)
        .filter((value): value is string => Boolean(value)),
      bathrooms,
      bedrooms,
      beds,
      instantBook: query.instantBook ? query.instantBook === "true" : undefined,
      propertyType: query.propertyType,
      roomType: query.roomType,
    },
  );
  const totalPages = Math.max(1, Math.ceil(visibleListings.length / pageSize));
  const currentPage = Math.min(parsePage(query.page), totalPages);
  const startIndex = (currentPage - 1) * pageSize;
  const paginatedListings = visibleListings.slice(
    startIndex,
    startIndex + pageSize,
  );
  const pageNumbers = buildPageNumbers(currentPage, totalPages);

  const baseQuery = {
    q: query.q,
    city: query.city,
    country: query.country,
    guests: query.guests,
    minPrice: query.minPrice,
    maxPrice: query.maxPrice,
    roomType: query.roomType,
    propertyType: query.propertyType,
    amenity: query.amenity,
    amenities: query.amenities,
    bedrooms: query.bedrooms,
    beds: query.beds,
    bathrooms: query.bathrooms,
    instantBook: query.instantBook,
    size: pageSize,
  };
  const rangeStart = visibleListings.length === 0 ? 0 : startIndex + 1;
  const rangeEnd = Math.min(startIndex + pageSize, visibleListings.length);

  return (
    <main className="min-h-screen bg-white pt-[168px]">
      <div className="mx-auto grid w-full max-w-[1760px] gap-8 px-4 py-6 sm:px-8 lg:grid-cols-[minmax(0,1fr)_minmax(360px,46vw)] xl:px-16">
        <section className="min-w-0">
          <div className="mb-8 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <h1 className="text-[1.65rem] font-semibold tracking-tight text-neutral-950">
                {visibleListings.length > 1000
                  ? "Over 1,000 homes"
                  : `${visibleListings.length} homes`}
              </h1>
              <p className="mt-3 text-sm text-neutral-500">
                Showing {rangeStart}-{rangeEnd} · Page {currentPage} of{" "}
                {totalPages}
              </p>
            </div>

            <div className="flex items-center gap-2 overflow-x-auto">
              {pageSizeOptions.map((size) => (
                <Link
                  key={size}
                  href={buildSearchHref({ ...baseQuery, size, page: 1 })}
                  className={cn(
                    "inline-flex h-9 shrink-0 items-center rounded-full border px-3 text-xs font-semibold transition",
                    pageSize === size
                      ? "border-neutral-950 bg-neutral-950 text-white"
                      : "border-neutral-200 bg-white text-neutral-700 hover:border-neutral-950",
                  )}
                >
                  {size} / page
                </Link>
              ))}
            </div>
          </div>

          {errorMessage ? (
            <div className="rounded-lg border border-red-100 bg-red-50 p-6 text-sm text-red-600">
              {errorMessage}
            </div>
          ) : visibleListings.length === 0 ? (
            <div className="flex min-h-[360px] flex-col items-center justify-center rounded-lg border border-dashed border-neutral-300 bg-neutral-50 p-10 text-center">
              <MapPinned className="size-10 text-neutral-400" />
              <p className="mt-4 text-base font-semibold text-neutral-950">
                No listings match your search.
              </p>
              <p className="mt-1 max-w-md text-sm text-neutral-500">
                Try another destination, lower the guest count, or remove the
                price filter.
              </p>
            </div>
          ) : (
            <>
              <div className="grid grid-cols-1 gap-x-5 gap-y-8 sm:grid-cols-2 2xl:grid-cols-3">
                {paginatedListings.map((listing) => {
                  const coverImageUrl = resolveCoverImage(listing);
                  const basePrice = listing.pricing?.basePrice ?? 0;
                  const currency = listing.pricing?.currency ?? "USD";

                  return (
                    <Link
                      key={listing.listingId}
                      href={`/rooms/${listing.listingId}`}
                      className="group block"
                    >
                      <article className="h-full">
                        <div className="relative aspect-[20/13] overflow-hidden rounded-lg bg-neutral-100">
                          <Image
                            src={coverImageUrl}
                            alt={listing.title}
                            fill
                            className="object-cover transition duration-500 group-hover:scale-[1.03]"
                            sizes="(max-width: 767px) 92vw, (max-width: 1535px) 44vw, 28vw"
                          />
                          <div className="absolute inset-x-0 top-0 flex items-start justify-between p-3">
                            {listing.instantBook ? (
                              <span className="rounded-full bg-white px-2.5 py-1 text-xs font-semibold text-neutral-950 shadow-sm">
                                Instant Book
                              </span>
                            ) : (
                              <span />
                            )}
                            <button
                              type="button"
                              aria-label="Save to wishlist"
                              className="flex size-8 items-center justify-center rounded-full bg-black/20 text-white backdrop-blur transition hover:bg-black/35"
                            >
                              <Heart
                                className="size-[19px]"
                                strokeWidth={2.25}
                              />
                            </button>
                          </div>
                        </div>

                        <div className="mt-3 space-y-1">
                          <div className="flex items-start justify-between gap-2">
                            <h2 className="line-clamp-1 text-sm font-semibold text-neutral-950">
                              {listing.city}, {listing.country}
                            </h2>
                            <span className="inline-flex shrink-0 items-center gap-1 text-sm text-neutral-950">
                              <Star className="size-3.5 fill-neutral-950" />
                              {resolveRating(listing.listingId)}
                            </span>
                          </div>

                          <p className="line-clamp-1 text-sm text-neutral-500">
                            {listing.title}
                          </p>
                          <p className="line-clamp-1 text-sm text-neutral-500">
                            {formatStayDetails(listing)}
                          </p>
                          <p className="flex items-center gap-1 pt-1 text-sm text-neutral-950">
                            <span className="font-semibold">
                              {formatPrice(basePrice, currency)}
                            </span>
                            <span className="text-neutral-500">/ night</span>
                          </p>
                        </div>
                      </article>
                    </Link>
                  );
                })}
              </div>

              <Pagination className="mt-10 border-t border-neutral-200 pt-6">
                <PaginationContent>
                  <PaginationItem>
                    <PaginationPrevious
                      href={buildSearchHref({
                        ...baseQuery,
                        page: Math.max(1, currentPage - 1),
                      })}
                      className={cn(
                        currentPage === 1 && "pointer-events-none opacity-40",
                      )}
                    />
                  </PaginationItem>

                  {pageNumbers.map((pageNumber, index) => {
                    const previousPage = pageNumbers[index - 1];
                    const hasGap =
                      previousPage !== undefined &&
                      pageNumber - previousPage > 1;

                    return (
                      <PaginationItem key={pageNumber}>
                        {hasGap ? <PaginationEllipsis /> : null}
                        <PaginationLink
                          href={buildSearchHref({
                            ...baseQuery,
                            page: pageNumber,
                          })}
                          isActive={pageNumber === currentPage}
                        >
                          {pageNumber}
                        </PaginationLink>
                      </PaginationItem>
                    );
                  })}

                  <PaginationItem>
                    <PaginationNext
                      href={buildSearchHref({
                        ...baseQuery,
                        page: Math.min(totalPages, currentPage + 1),
                      })}
                      className={cn(
                        currentPage === totalPages &&
                          "pointer-events-none opacity-40",
                      )}
                    />
                  </PaginationItem>
                </PaginationContent>
              </Pagination>
            </>
          )}
        </section>

        <aside className="hidden lg:block">
          <div className="sticky top-[190px] h-[calc(100vh-214px)] overflow-hidden rounded-xl border border-neutral-200 shadow-sm">
            <SearchMap destination={destination} listings={paginatedListings} />
          </div>
        </aside>
      </div>
    </main>
  );
}
