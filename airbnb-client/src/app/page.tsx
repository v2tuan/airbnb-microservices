"use client"
import { HomeSectionResponse, listingAPI } from "@/api/endpoints/listing";
import ListingCard from "@/components/cards/ListingCard";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { useEffect, useState } from "react";

export default function Home() {
  const [sections, setSections] = useState<HomeSectionResponse[]>([])
  const [loading, setLoading] =  useState(true)
  const [errorMessage, setErrorMessage] = useState("")

  useEffect(() => {
    const fetchData = async () => {
      try {
        const response = await listingAPI.getHomeSections();
        if (response.data.code === 1000) setSections(response.data.result);
        else setErrorMessage(response.data.message ?? "Cannot load home sections right now.")
      } catch (error) {
        console.log(error);
        setErrorMessage("Cannot load home sections right now.")
      }
      finally {
        setLoading(false)
      }
    }
    fetchData()
  }, [])

  if (loading) {
    return (
      <main className="mx-auto w-full max-w-[2520px] px-4 pb-10 pt-28 sm:px-6 lg:px-10 xl:px-20">
        <div className="space-y-14">
          {Array.from({ length: 2 }).map((_, sectionIdx) => (
            <div key={sectionIdx} className="space-y-5">
              <div className="h-8 w-72 animate-pulse rounded-full bg-neutral-200" />
              <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-5 lg:grid-cols-7">
                {Array.from({ length: 5 }).map((__, cardIdx) => (
                  <div key={cardIdx} className="space-y-3">
                    <div className="aspect-square animate-pulse rounded-3xl bg-neutral-200" />
                    <div className="h-4 w-4/5 animate-pulse rounded-full bg-neutral-200" />
                    <div className="h-4 w-1/2 animate-pulse rounded-full bg-neutral-200" />
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </main>
    );
  }

  if (errorMessage) {
    return (
      <main className="mx-auto w-full max-w-[2520px] px-4 pb-10 pt-28 sm:px-6 lg:px-10 xl:px-20">
        <p className="rounded-2xl border border-red-200 bg-red-50 px-5 py-4 text-sm font-medium text-red-700">
          {errorMessage}
        </p>
      </main>
    );
  }

  return ( 
    <main className="mx-auto w-full max-w-[2520px] px-4 pb-10 pt-28 sm:px-6 lg:px-10 xl:px-20">
      <div className="space-y-14">
        {sections.map((section) => (
          <section key={section.sectionKey} className="space-y-5">
            <div className="flex items-center justify-between gap-4">
              <button type="button" className="group inline-flex items-center gap-2">
                <h2 className="text-2xl font-semibold tracking-tight text-neutral-900 group-hover:underline md:text-3xl">
                  {section.title}
                </h2>
                <ChevronRight size={24} className="text-neutral-700" />
              </button>

              <div className="hidden items-center gap-2 md:flex">
                <button
                  type="button"
                  aria-label="Previous listings"
                  className="flex h-11 w-11 items-center justify-center rounded-full border border-neutral-200 bg-white text-neutral-500"
                >
                  <ChevronLeft size={20} />
                </button>
                <button
                  type="button"
                  aria-label="Next listings"
                  className="flex h-11 w-11 items-center justify-center rounded-full border border-neutral-300 bg-white text-neutral-900 transition hover:shadow-sm"
                >
                  <ChevronRight size={20} />
                </button>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-x-4 gap-y-8 sm:grid-cols-3 md:grid-cols-5 lg:grid-cols-7">
              {section.listings.map((listing) => (
                <ListingCard
                  key={listing.listingId}
                  listing={{
                    ...listing,
                    isGuestFavorite: listing.instantBook ?? listing.instantBooks ?? false,
                  }}
                />
              ))}
            </div>
          </section>
        ))}
      </div>
    </main>
  );
}
