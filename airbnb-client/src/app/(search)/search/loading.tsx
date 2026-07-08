import { Search } from "lucide-react";

export default function SearchLoading() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-white px-6 pt-28">
      <output
        className="flex flex-col items-center gap-5 text-center"
        aria-live="polite"
      >
        <div className="relative flex size-24 items-center justify-center">
          <div className="absolute inset-0 rounded-full border border-neutral-200" />
          <div className="absolute inset-2 rounded-full border-2 border-transparent border-t-[#ff385c] border-r-[#ff385c] animate-spin" />
          <div className="flex size-14 items-center justify-center rounded-full bg-[#ff385c] text-white shadow-lg shadow-rose-100">
            <Search className="size-6" strokeWidth={2.6} />
          </div>
        </div>
        <div className="space-y-1">
          <p className="text-base font-semibold text-neutral-950">
            Searching stays
          </p>
          <p className="text-sm text-neutral-500">
            Finding the best matches for your trip.
          </p>
        </div>
      </output>
    </main>
  );
}
