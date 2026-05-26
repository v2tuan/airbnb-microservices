"use client";

import { MessageCircle, Shield, Star } from "lucide-react";
import Image from "next/image";
import type { BookingDetailHost } from "@/types/booking.type";

interface HostCardProps {
  host: BookingDetailHost | null;
  onContact?: () => void;
}

function initials(name?: string | null) {
  return (name ?? "Host")
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join("");
}

function joinedYear(joinedAt?: string | null) {
  if (!joinedAt) return "recently";
  const year = new Date(joinedAt).getFullYear();
  return Number.isFinite(year) ? String(year) : "recently";
}

export function HostCard({ host, onContact }: HostCardProps) {
  const name = host?.fullName ?? "Host";

  return (
    <div className="rounded-2xl border border-slate-100 bg-white p-6 shadow-sm">
      <div className="mb-5 flex items-start gap-4">
        <div className="relative flex-shrink-0">
          <div className="relative flex h-16 w-16 items-center justify-center overflow-hidden rounded-full bg-slate-900 text-sm font-semibold text-white ring-2 ring-rose-100">
            {host?.avatarUrl ? (
              <Image
                src={host.avatarUrl}
                alt={name}
                fill
                className="object-cover"
                sizes="64px"
              />
            ) : (
              initials(name)
            )}
          </div>
          {host?.superHost ? (
            <div className="absolute -right-1 -bottom-1 flex h-6 w-6 items-center justify-center rounded-full bg-rose-500">
              <Shield className="h-3 w-3 text-white" />
            </div>
          ) : null}
        </div>
        <div>
          <h3 className="font-display text-base font-semibold text-slate-900">
            {name}
          </h3>
          {host?.superHost ? (
            <span className="text-xs font-medium text-rose-500">Superhost</span>
          ) : null}
          <p className="mt-0.5 text-sm text-slate-500">
            Hosting since {joinedYear(host?.joinedAt)}
          </p>
        </div>
      </div>

      <div className="mb-5 grid grid-cols-3 gap-3">
        <div className="text-center">
          <div className="flex items-center justify-center gap-1 text-lg font-bold text-slate-900">
            <Star className="h-4 w-4 fill-amber-400 text-amber-400" />
            4.9
          </div>
          <p className="mt-0.5 text-xs text-slate-500">Rating</p>
        </div>
        <div className="text-center">
          <div className="text-lg font-bold text-slate-900">24</div>
          <p className="mt-0.5 text-xs text-slate-500">Reviews</p>
        </div>
        <div className="text-center">
          <div className="text-lg font-bold text-slate-900">98%</div>
          <p className="mt-0.5 text-xs text-slate-500">Response</p>
        </div>
      </div>

      <p className="mb-4 text-sm text-slate-600">
        Response time:{" "}
        <span className="font-medium text-slate-800">within a few hours</span>
      </p>

      <button
        type="button"
        onClick={onContact}
        className="flex w-full items-center justify-center gap-2 rounded-xl bg-slate-900 py-3 text-sm font-medium text-white transition-all duration-200 hover:bg-slate-800 hover:shadow-md"
      >
        <MessageCircle className="h-4 w-4" />
        Message host
      </button>
    </div>
  );
}
