"use client";

import { Heart } from "lucide-react";
import { useSelector } from "react-redux";
import { selectIsAuthenticated } from "@/features/auth/authSelectors";
import type { RootState } from "@/store";
import useLoginModal from "@/hooks/userLoginModal";
import { useWishlistStore } from "@/hooks/useWishlistStore";
import { useEffect } from "react";

interface RoomWishlistButtonProps {
  listingId: string;
}

export function RoomWishlistButton({ listingId }: RoomWishlistButtonProps) {
  const loginModal = useLoginModal();
  const isAuthenticated = useSelector(selectIsAuthenticated);
  const token = useSelector((state: RootState) => state.auth.token);

  const { hydrateWishlist, toggleListing, listingMap, pendingByListingId } =
    useWishlistStore();

  useEffect(() => {
    if (!isAuthenticated || !token) return;
    void hydrateWishlist(token);
  }, [hydrateWishlist, isAuthenticated, token]);

  const handleToggle = async () => {
    const authToken =
      token ??
      (typeof window !== "undefined"
        ? localStorage.getItem("access_token")
        : null);

    if (!authToken) {
      loginModal.onOpen();
      return;
    }

    await toggleListing(authToken, listingId);
  };

  const wished = !!listingMap[listingId];
  const pending = !!pendingByListingId[listingId];

  return (
    <button
      type="button"
      disabled={pending}
      onClick={handleToggle}
      className="inline-flex items-center gap-2 rounded-md px-2 py-1 underline transition hover:bg-zinc-100 disabled:cursor-not-allowed disabled:opacity-60"
    >
      <Heart className={`h-4 w-4 ${wished ? "fill-rose-500 text-rose-500" : ""}`} />
      {wished ? "Saved" : "Save"}
    </button>
  );
}
