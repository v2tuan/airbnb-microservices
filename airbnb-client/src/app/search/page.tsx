import ListingCard from "@/components/cards/ListingCard";
import { listingAPI, type HomeListingCardResponse, type ListingResponse, unwrapApiData } from "@/api/endpoints/listing";

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

function listingToCard(listing: ListingResponse): HomeListingCardResponse {
  const cover =
    listing.photos?.find((photo) => photo.isCover)?.photoUrl ??
    listing.photos?.[0]?.photoUrl ??
    fallbackImage;

  return {
    listingId: listing.listingId,
    title: listing.title,
    city: listing.city,
    country: listing.country,
    coverImageUrl: cover,
    basePrice: listing.pricing?.basePrice ?? 0,
    currency: listing.pricing?.currency ?? "USD",
    rating: 0,
    maxGuests: listing.maxGuests,
    instantBook: listing.instantBook,
  };
}

export default async function SearchPage({ searchParams }: SearchPageProps) {
  const query = await searchParams;
  const destination = query.city ?? query.q ?? "";
  const maxGuests = query.guests ? Number(query.guests) : undefined;
  const minPrice = query.minPrice ? Number(query.minPrice) : undefined;
  const maxPrice = query.maxPrice ? Number(query.maxPrice) : undefined;

  let listings: ListingResponse[] = [];
  let errorMessage = "";

  try {
    if (typeof minPrice === "number" && typeof maxPrice === "number") {
      const response = await listingAPI.searchByPriceRange({ minPrice, maxPrice });
      listings = unwrapApiData(response.data);
    } else {
      const response = await listingAPI.searchListings({
        city: destination || undefined,
        maxGuests,
      });
      listings = unwrapApiData(response.data);
    }
  } catch {
    errorMessage = "Unable to load search results.";
  }

  const cards = listings.map(listingToCard);

  return (
    <main className="mx-auto w-full max-w-7xl px-4 pb-12 sm:px-8">
      <div className="mb-8 flex flex-col gap-2">
        <p className="text-sm font-medium text-neutral-500">Search results</p>
        <h1 className="text-3xl font-semibold tracking-tight text-neutral-900">
          {destination ? `Places in ${destination}` : "Available places"}
        </h1>
        <p className="text-sm text-neutral-500">
          {cards.length} listings{maxGuests ? ` for up to ${maxGuests} guests` : ""}
        </p>
      </div>

      {errorMessage ? (
        <div className="rounded-2xl border border-red-100 bg-red-50 p-6 text-red-600">
          {errorMessage}
        </div>
      ) : cards.length === 0 ? (
        <div className="rounded-2xl border border-neutral-200 bg-white p-8 text-neutral-600">
          No listings match this search yet.
        </div>
      ) : (
        <section className="grid grid-cols-1 gap-x-6 gap-y-8 sm:grid-cols-2 lg:grid-cols-4">
          {cards.map((listing) => (
            <ListingCard key={listing.listingId} listing={listing} />
          ))}
        </section>
      )}
    </main>
  );
}
