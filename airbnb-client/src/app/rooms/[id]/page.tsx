import { ratingAPI } from "@/api/endpoints/rating";
import { listingAPI } from "@/api/endpoints/listing";
import { BookingCard } from "@/components/listing/BookingCard";
import { ListingGallery } from "@/components/listing/ListingGallery";
import { ListingInfo } from "@/components/listing/ListingInfo";
import { ListingRatingForm } from "@/components/listing/ListingRatingForm";
import { ListingRatingPanel } from "@/components/listing/ListingRatingPanel";
import { RoomWishlistButton } from "@/components/listing/RoomWishlistButton";
import { Share } from "lucide-react";
import { notFound } from "next/navigation";

interface PageProps {
  params: Promise<{id: string}>
}
export default async function RoomDetail ({params}: PageProps) {
  const { id } = await params;
  try {
    const [listingResponse, ratingsResponse, averageResponse] = await Promise.allSettled([
      listingAPI.getRoomById(id),
      ratingAPI.getRatingsByListing(id),
      ratingAPI.getAverageRating(id),
    ])

    if (listingResponse.status !== "fulfilled") {
      throw listingResponse.reason
    }

    const ratings = ratingsResponse.status === "fulfilled" ? ratingsResponse.value.data : []
    const averageRating = averageResponse.status === "fulfilled" ? averageResponse.value.data : 0

    const response = listingResponse.value
    const listing = response.data.result

    if (!listing) return notFound()

    return (
      <main className="max-w-7xl mx-auto px-6 md:px-10 lg:px-20 py-8">
        {/* Header Section */}
        <div className="mb-6">
          <h1 className="text-2xl font-semibold">{listing.title}</h1>

          <div className="mt-2 flex items-center justify-between gap-4">
            <span className="underline font-medium text-sm cursor-pointer">
              {listing.address}, {listing.city}, {listing.country}
            </span>

            <div className="flex items-center gap-4 text-sm font-medium">
              <button
                type="button"
                className="hidden md:inline-flex items-center gap-2 underline hover:bg-zinc-100 px-2 py-1 rounded-md transition"
              >
                <Share className="h-4 w-4" />
                Share
              </button>

              <RoomWishlistButton listingId={listing.listingId} />
            </div>
          </div>
        </div>

        {/* Photos Grid */}
        <ListingGallery photos={listing.photos} />

        <div className="mt-12">
          <ListingRatingPanel averageRating={averageRating} ratings={ratings} />
          <ListingRatingForm listingId={listing.listingId} hostId={listing.hostId} />
        </div>

        {/* Content Layout */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-12 mt-12">
          {/* Left Column: Info & Description */}
          <div className="md:col-span-2">
            <ListingInfo data={listing} />
          </div>

          {/* Right Column: Sticky Booking Card */}
          <div className="relative">
            <BookingCard
              pricing={listing.pricing}
              rating={averageRating}
              reviewCount={ratings.length}
            />
          </div>
        </div>
      </main>
    )
  } catch (error) {
    console.error("Failed to fetch listing:", error);
    return <div>Error loading room details. Please try again later.</div>;
  }
}