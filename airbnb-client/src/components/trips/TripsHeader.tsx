"use client";

import Link from "next/link";

export function TripsHeader() {
  return (
    <header className="sticky top-0 z-40 border-b border-slate-200/70 bg-white/90 backdrop-blur">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4 sm:px-6">
        <Link href="/trips" className="text-base font-semibold text-slate-900">
          Trips
        </Link>
        <nav className="flex items-center gap-4 text-sm font-medium text-slate-500">
          <Link href="/guest/messages" className="hover:text-slate-900">
            Messages
          </Link>
          <Link href="/users/profile" className="hover:text-slate-900">
            Profile
          </Link>
        </nav>
      </div>
    </header>
  );
}
