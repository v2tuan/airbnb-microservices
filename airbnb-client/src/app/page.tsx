"use client";

import { useEffect, useRef, useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { HomeSectionResponse, listingAPI } from "@/api/endpoints/listing";
import ListingCard from "@/components/cards/ListingCard";
import Link from "next/link";

export default function Home() {
  const [sections, setSections] = useState<HomeSectionResponse[]>([]);
  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState("");
  const scrollRefs = useRef<{ [key: string]: HTMLDivElement | null }>({});

  useEffect(() => {
    const fetchData = async () => {
      try {
        const response = await listingAPI.getHomeSections();
        if (response.data.code === 1000) {
          setSections(response.data.result);
        } else {
          setErrorMessage(response.data.message ?? "Không thể tải dữ liệu.");
        }
      } catch (error) {
        setErrorMessage("Đã có lỗi xảy ra khi kết nối server.");
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  const scroll = (key: string, direction: "left" | "right") => {
    const container = scrollRefs.current[key];
    if (container) {
      const scrollAmount = container.clientWidth * 0.8;
      container.scrollBy({
        left: direction === "left" ? -scrollAmount : scrollAmount,
        behavior: "smooth",
      });
    }
  };

  if (loading) return <div className="pt-32 text-center">Loading...</div>;
  if (errorMessage) return <div className="pt-32 text-center text-red-500">{errorMessage}</div>;

  return (
    <main className="mx-auto w-full max-w-[2520px] px-4 pb-10 pt-65 sm:px-8 lg:px-10 xl:px-24">
      <div className="flex flex-col gap-12">
        {sections.map((section) => (
          <section key={section.sectionKey} className="group relative space-y-4">
            {/* Header */}
            <div className="flex items-center justify-between pr-2">
              <div className="group/title flex items-center gap-1 cursor-pointer">
                <h2 className="text-xl font-bold tracking-tight text-neutral-900 group-hover/title:underline md:text-2xl">
                  {section.title}
                </h2>
                <ChevronRight size={24} className="mt-0.5" />
              </div>

              <div className="hidden items-center gap-3 md:flex">
                <button
                  onClick={() => scroll(section.sectionKey, "left")}
                  className="flex h-8 w-8 items-center justify-center rounded-full border border-neutral-300 bg-white shadow-sm hover:bg-neutral-50 transition"
                >
                  <ChevronLeft size={18} />
                </button>
                <button
                  onClick={() => scroll(section.sectionKey, "right")}
                  className="flex h-8 w-8 items-center justify-center rounded-full border border-neutral-300 bg-white shadow-sm hover:bg-neutral-50 transition"
                >
                  <ChevronRight size={18} />
                </button>
              </div>
            </div>

            {/* Carousel Container */}
            <div
              ref={(el) => (scrollRefs.current[section.sectionKey] = el)}
              className="no-scrollbar flex w-full gap-4 overflow-x-auto scroll-smooth"
              style={{ scrollSnapType: "x mandatory", WebkitOverflowScrolling: "touch" }}
            >
              {section.listings.map((listing) => (
                <div
                  key={listing.listingId}
                  className="
                    flex-none
                    basis-[72%] 
                    md:basis-[calc((100%-4*1rem)/5)] 
                    lg:basis-[calc((100%-6*1rem)/7)]
                  "
                  style={{ scrollSnapAlign: "start" }}
                >
                  <Link href={`/rooms/${listing.listingId}`}>
                    <ListingCard
                      listing={{
                        ...listing,
                        isGuestFavorite: listing.rating >= 4.8,
                      }}
                    />
                  </Link>
                </div>
              ))}
            </div>
          </section>
        ))}
      </div>
    </main>
  );
}