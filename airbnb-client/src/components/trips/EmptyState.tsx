"use client";
import { Plane, Heart, XCircle } from "lucide-react";
import Link from "next/link";

interface EmptyStateProps {
  type: "upcoming" | "completed" | "cancelled" | "wishlist";
}

const config = {
  upcoming: {
    icon: Plane,
    title: "No upcoming trips",
    description: "Time to start planning your next adventure! Explore thousands of unique stays around the world.",
    action: "Start exploring",
    href: "#",
    color: "text-rose-400",
    bg: "bg-rose-50",
  },
  completed: {
    icon: Plane,
    title: "No completed trips yet",
    description: "Your travel history will appear here once you complete your first trip.",
    action: "Find a place to stay",
    href: "#",
    color: "text-slate-400",
    bg: "bg-slate-50",
  },
  cancelled: {
    icon: XCircle,
    title: "No cancelled trips",
    description: "You haven't cancelled any trips. Hopefully you never have to!",
    action: null,
    href: "#",
    color: "text-slate-400",
    bg: "bg-slate-50",
  },
  wishlist: {
    icon: Heart,
    title: "Your wishlist is empty",
    description: "Save listings you love to come back to them later.",
    action: "Explore stays",
    href: "#",
    color: "text-rose-400",
    bg: "bg-rose-50",
  },
};

export function EmptyState({ type }: EmptyStateProps) {
  const c = config[type];
  const Icon = c.icon;

  return (
    <div className="flex flex-col items-center justify-center py-20 px-6 text-center">
      <div className={`w-20 h-20 rounded-full ${c.bg} flex items-center justify-center mb-6`}>
        <Icon className={`w-9 h-9 ${c.color}`} />
      </div>
      <h3 className="text-xl font-semibold text-slate-900 mb-2 font-display">{c.title}</h3>
      <p className="text-slate-500 max-w-sm mb-8 text-sm leading-relaxed">{c.description}</p>
      {c.action && (
        <Link
          href={c.href}
          className="inline-flex items-center gap-2 bg-rose-500 hover:bg-rose-600 text-white px-6 py-3 rounded-full text-sm font-medium transition-all duration-200 hover:shadow-lg hover:shadow-rose-200 hover:-translate-y-0.5"
        >
          {c.action}
        </Link>
      )}
    </div>
  );
}
