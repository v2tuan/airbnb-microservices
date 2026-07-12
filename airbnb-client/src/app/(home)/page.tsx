"use client";

import { useEffect, useRef, useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import Link from "next/link";
import { HomeSectionResponse, listingAPI, unwrapApiData } from "@/api/endpoints/listing";
import ListingCard from "@/components/cards/ListingCard";
import { useWishlistStore } from "@/hooks/useWishlistStore";
import useLoginModal from "@/hooks/userLoginModal";
import { authStorage } from "@/lib/auth-storage";
import { useSelector } from "react-redux";
import { selectIsAuthenticated } from "@/features/auth/authSelectors";
import { LoadingScreen } from "@/components/loading-screen";
import type { RootState } from "@/store";

function SectionViewAllCard({ href }: { href: string }) {
  return (
    <Link href={href} className="group flex w-full flex-col gap-2">
      <div className="flex aspect-square w-full items-center justify-center rounded-2xl border border-neutral-300 bg-white transition hover:border-neutral-900 hover:shadow-sm">
        <div className="flex flex-col items-center gap-2 text-center">
          <div className="flex size-11 items-center justify-center rounded-full bg-neutral-900 text-white transition group-hover:bg-neutral-800">
            <ChevronRight size={18} className="translate-x-px" />
          </div>
          <span className="text-sm font-semibold text-neutral-900">View All</span>
        </div>
      </div>
    </Link>
  );
}

export default function Home() {
  const [sections, setSections] = useState<HomeSectionResponse[]>([]);
  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState("");
  const scrollRefs = useRef<Record<string, HTMLDivElement | null>>({});
  const personalizedHomeLoadedRef = useRef(false);
  const loginModal = useLoginModal();
  const isAuthenticated = useSelector(selectIsAuthenticated);
  const token = useSelector((state: RootState) => state.auth.token);

  const { hydrateWishlist, toggleListing, listingMap, pendingByListingId } =
    useWishlistStore();

  useEffect(() => {
    let cancelled = false;

    const fetchPublicData = async () => {
      try {
        const response = await listingAPI.getPublicHomeSections(undefined);
        if (cancelled) return;

        if (response.data.code === 1000) {
          if (!personalizedHomeLoadedRef.current) {
            setSections(unwrapApiData(response.data));
          }
          setErrorMessage("");
        } else {
          setErrorMessage(response.data.message ?? "Khong the tai du lieu.");
        }
      } catch {
        if (cancelled) return;
        setErrorMessage("Da co loi xay ra khi ket noi server.");
      } finally {
        if (cancelled) return;
        setLoading(false);
      }
    };

    setLoading(true);
    void fetchPublicData();

    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    const requestToken = token ?? authStorage.getAccessToken();
    if (!isAuthenticated && !requestToken) return;
    if (!requestToken) return;

    let cancelled = false;

    const fetchPersonalizedData = async () => {
      try {
        const response = await listingAPI.getHomeSections(
          undefined,
          requestToken,
        );
        if (cancelled) return;

        if (response.data.code === 1000) {
          personalizedHomeLoadedRef.current = true;
          setSections(unwrapApiData(response.data));
          setErrorMessage("");
        }
      } catch {
        if (!cancelled) {
          // Keep the public home sections already on screen.
        }
      }
    };

    void fetchPersonalizedData();

    return () => {
      cancelled = true;
    };
  }, [isAuthenticated, token]);

  useEffect(() => {
    const requestToken = token ?? authStorage.getAccessToken();
    if (!isAuthenticated && !requestToken) return;
    if (!requestToken) return;
    void hydrateWishlist(requestToken);
  }, [hydrateWishlist, isAuthenticated, token]);

  const handleToggleWishlist = async (listingId: string) => {
    const authToken =
      token ??
      (typeof window !== "undefined" ? localStorage.getItem("access_token") : null);

    if (!authToken) {
      loginModal.onOpen();
      return;
    }

    await toggleListing(authToken, listingId);
  };

  const scroll = (key: string, direction: "left" | "right") => {
    const container = scrollRefs.current[key];
    if (!container) return;

    const scrollAmount = container.clientWidth * 0.8;
    container.scrollBy({
      left: direction === "left" ? -scrollAmount : scrollAmount,
      behavior: "smooth",
    });
  };

  if (loading) return <LoadingScreen />;
  if (errorMessage) return <div className="py-8 text-center text-red-500">{errorMessage}</div>;

  return (
    <main className="mx-auto w-full max-w-630 px-4 pb-10 sm:px-8 lg:px-10 xl:px-24">
      <div className="flex flex-col gap-12">
        {sections.map((section) => (
          <section key={section.sectionKey} className="group relative space-y-4">
            <div className="flex items-center justify-between pr-2">
              {section.viewAllHref ? (
                <Link
                  href={section.viewAllHref}
                  className="group/title inline-flex items-center gap-1"
                >
                  <h2 className="text-xl font-bold tracking-tight text-neutral-900 group-hover/title:underline md:text-2xl">
                    {section.title}
                  </h2>
                  <ChevronRight size={24} className="mt-0.5" />
                </Link>
              ) : (
                <h2 className="text-xl font-bold tracking-tight text-neutral-900 md:text-2xl">
                  {section.title}
                </h2>
              )}

              <div className="hidden items-center gap-3 md:flex">
                <button
                  onClick={() => scroll(section.sectionKey, "left")}
                  className="flex h-8 w-8 items-center justify-center rounded-full border border-neutral-300 bg-white shadow-sm transition hover:bg-neutral-50"
                >
                  <ChevronLeft size={18} />
                </button>
                <button
                  onClick={() => scroll(section.sectionKey, "right")}
                  className="flex h-8 w-8 items-center justify-center rounded-full border border-neutral-300 bg-white shadow-sm transition hover:bg-neutral-50"
                >
                  <ChevronRight size={18} />
                </button>
              </div>
            </div>

            <div
              ref={(el) => {
                scrollRefs.current[section.sectionKey] = el;
              }}
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
                  <ListingCard
                    listing={{
                      ...listing,
                      isGuestFavorite: listing.rating >= 4.8,
                    }}
                    wished={!!listingMap[listing.listingId]}
                    wishlistLoading={!!pendingByListingId[listing.listingId]}
                    onToggleWishlist={() => handleToggleWishlist(listing.listingId)}
                  />
                </div>
              ))}

              {section.hasMore ? (
                <div
                  className="
                    flex-none
                    basis-[72%]
                    md:basis-[calc((100%-4*1rem)/5)]
                    lg:basis-[calc((100%-6*1rem)/7)]
                  "
                  style={{ scrollSnapAlign: "start" }}
                >
                  <SectionViewAllCard href={section.viewAllHref ?? "/search"} />
                </div>
              ) : null}
            </div>
            </section>
        ))}
      </div>
    </main>
  );
}
