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
    latitude?: string;
    longitude?: string;
    radius?: string;
    checkIn?: string;
    checkOut?: string;
  }>;
}

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

function addDaysToDateKey(value: string, amount: number) {
  const [year, month, day] = value.split("-").map(Number);
  const date = new Date(year, month - 1, day);
  date.setDate(date.getDate() + amount);

  const nextYear = date.getFullYear();
  const nextMonth = String(date.getMonth() + 1).padStart(2, "0");
  const nextDay = String(date.getDate()).padStart(2, "0");

  return `${nextYear}-${nextMonth}-${nextDay}`;
}

function filterListings(
  listings: ListingResponse[],
  destination: string,
  country: string | undefined,
  maxGuests: number | undefined,
  minPrice: number | undefined,
  maxPrice: number | undefined,
  roomType: string | undefined,
  bedrooms: number | undefined,
  beds: number | undefined,
  bathrooms: number | undefined,
) {
  const normalizedDestination = destination.trim().toLowerCase();
  const normalizedCountry = country?.trim().toLowerCase();

  return listings.filter((listing) => {
    const basePrice = listing.pricing?.basePrice;
    const matchesDestination =
      !normalizedDestination ||
      listing.city?.toLowerCase().includes(normalizedDestination) ||
      listing.country?.toLowerCase().includes(normalizedDestination) ||
      listing.title?.toLowerCase().includes(normalizedDestination);

    const matchesCountry =
      !normalizedCountry ||
      listing.country?.toLowerCase().includes(normalizedCountry);

    const matchesGuests = !maxGuests || listing.maxGuests >= maxGuests;
    const matchesMinPrice =
      !Number.isFinite(minPrice) ||
      (typeof basePrice === "number" && basePrice >= (minPrice as number));
    const matchesMaxPrice =
      !Number.isFinite(maxPrice) ||
      (typeof basePrice === "number" && basePrice <= (maxPrice as number));
    const matchesRoomType = !roomType || listing.roomType === roomType;
    const matchesBedrooms = !bedrooms || listing.numBedrooms >= bedrooms;
    const matchesBeds = !beds || listing.numBeds >= beds;
    const matchesBathrooms = !bathrooms || listing.numBathrooms >= bathrooms;

    return (
      matchesDestination &&
      matchesCountry &&
      matchesGuests &&
      matchesMinPrice &&
      matchesMaxPrice &&
      matchesRoomType &&
      matchesBedrooms &&
      matchesBeds &&
      matchesBathrooms
    );
  });
}

export default async function SearchPage({ searchParams }: SearchPageProps) {
  const query = await searchParams;
  const rawDestination = query.city ?? query.q ?? "";
  const destination = normalizeDestination(rawDestination);
  const country = query.country;
  const maxGuests = query.guests ? Number(query.guests) : undefined;
  const minPrice = query.minPrice ? Number(query.minPrice) : undefined;
  const maxPrice = query.maxPrice ? Number(query.maxPrice) : undefined;
  const roomType = query.roomType;
  const bedrooms = query.bedrooms ? Number(query.bedrooms) : undefined;
  const beds = query.beds ? Number(query.beds) : undefined;
  const bathrooms = query.bathrooms ? Number(query.bathrooms) : undefined;
  const latitude = query.latitude ? Number(query.latitude) : undefined;
  const longitude = query.longitude ? Number(query.longitude) : undefined;
  const radius = query.radius ? Number(query.radius) : 25;
  const hasNearbySearch =
    Number.isFinite(latitude) && Number.isFinite(longitude);
  const checkIn = query.checkIn;
  const checkOut = query.checkOut;
  const hasDateRange = Boolean(checkIn && checkOut && checkOut > checkIn);
  const availabilityEndDate =
    hasDateRange && checkOut ? addDaysToDateKey(checkOut, -1) : undefined;

  let listings: ListingResponse[] = [];
  let errorMessage = "";

  try {
    if (hasNearbySearch) {
      const response = await listingAPI.searchByLocation({
        latitude: latitude as number,
        longitude: longitude as number,
        radius,
      });
      listings = unwrapApiData(response.data);
    } else if (Number.isFinite(minPrice) && Number.isFinite(maxPrice)) {
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

    if (hasDateRange) {
      const availability = await Promise.all(
        listings.map(async (listing) => {
          try {
            const response = await listingAPI.checkAvailability(
              listing.listingId,
              {
                startDate: checkIn as string,
                endDate: availabilityEndDate as string,
              },
            );

            return {
              listing,
              available: unwrapApiData(response.data),
            };
          } catch {
            return {
              listing,
              available: false,
            };
          }
        }),
      );

      listings = availability
        .filter((item) => item.available)
        .map((item) => item.listing);
    }
  } catch {
    errorMessage = "Unable to load search results.";
  }

  const visibleListings = filterListings(
    listings,
    destination,
    country,
    maxGuests,
    minPrice,
    maxPrice,
    roomType,
    bedrooms,
    beds,
    bathrooms,
  );
  const resultLabel = destination
    ? `Places in ${destination}`
    : hasNearbySearch
      ? "Places near you"
      : "Places to stay";
  const priceLabel =
    Number.isFinite(minPrice) && Number.isFinite(maxPrice)
      ? `${formatPrice(minPrice as number, "USD")} - ${formatPrice(maxPrice as number, "USD")}`
      : "Any price";
  const mapDestination = hasNearbySearch ? "Nearby" : destination;

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
          ) : visibleListings.length === 0 ? (
            <div className="rounded-2xl border border-neutral-200 bg-neutral-50 p-10 text-center text-neutral-500">
              <p className="text-base font-medium">
                No listings match your search.
              </p>
              <p className="mt-1 text-sm">
                Try adjusting your filters or destination.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-x-5 gap-y-8 sm:grid-cols-2 3xl:grid-cols-3">
              {visibleListings.map((listing) => (
                <SearchListingCard key={listing.listingId} listing={listing} />
              ))}
            </div>
          )}
        </section>

        {/* Right: Map */}
        <aside className="hidden lg:block">
          <div className="sticky top-[112px] h-[calc(100vh-136px)] overflow-hidden rounded-2xl border border-neutral-200 shadow-sm">
            <SearchMap
              destination={mapDestination}
              listings={visibleListings}
            />
          </div>
        </aside>
      </div>
    </main>
  );
}
