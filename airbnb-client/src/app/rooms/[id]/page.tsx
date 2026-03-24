import { listingAPI } from "@/api/endpoints/listing";
import { BookingCard } from "@/components/listing/BookingCard";
import { ListingGallery } from "@/components/listing/ListingGallery";
import { ListingInfo } from "@/components/listing/ListingInfo";
import { Heart, Share } from "lucide-react";
import { notFound } from "next/navigation";

interface PageProps {
  params: Promise<{id: string}>
}
export default async function RoomDetail ({params}: PageProps) {
  const { id } = await params;
  try {
    const response = await listingAPI.getRoomById(id)
    const listing = response.data.result

    if (!listing) return notFound()

    return (
      <main className="max-w-7xl mx-auto px-6 md:px-10 lg:px-20 py-8 pt-65">
        {/* Header Section */}
        <div className="mb-6">
          <h1 className="text-2xl font-semibold">{listing.title}</h1>

          <div className="mt-2 flex items-center justify-between gap-4">
            <span className="underline font-medium text-sm cursor-pointer">
              {listing.address}, {listing.city}, {listing.country}
            </span>

            <div className="hidden md:flex items-center gap-4 text-sm font-medium">
              <button
                type="button"
                className="inline-flex items-center gap-2 underline hover:bg-zinc-100 px-2 py-1 rounded-md transition"
              >
                <Share className="h-4 w-4" />
                Share
              </button>

              <button
                type="button"
                className="inline-flex items-center gap-2 underline hover:bg-zinc-100 px-2 py-1 rounded-md transition"
              >
                <Heart className="h-4 w-4" />
                Save
              </button>
            </div>
          </div>
        </div>

        {/* Photos Grid */}
        <ListingGallery photos={listing.photos} />

        {/* Content Layout */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-12 mt-12">
          {/* Left Column: Info & Description */}
          <div className="md:col-span-2">
            <ListingInfo data={listing} />
          </div>

          {/* Right Column: Sticky Booking Card */}
          <div className="relative">
            <BookingCard pricing={listing.pricing} />
          </div>
        </div>
      </main>
    )
  } catch (error) {
    console.error("Failed to fetch listing:", error);
    return <div>Error loading room details. Please try again later.</div>;
  }
}