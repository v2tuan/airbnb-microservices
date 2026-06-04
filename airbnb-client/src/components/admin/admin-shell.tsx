"use client";

import {
  AlertTriangle,
  BadgeDollarSign,
  Ban,
  ClipboardList,
  FileClock,
  Gavel,
  Home,
  LayoutDashboard,
  Menu,
  MessageSquareWarning,
  ShieldCheck,
} from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";
import { useEffect, useMemo, useState } from "react";
import { useSelector } from "react-redux";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { authStorage } from "@/lib/auth-storage";
import { hasRealmRole, parseJwt } from "@/lib/jwt";
import { cn } from "@/lib/utils";
import type { RootState } from "@/store";

const navItems = [
  {
    href: "/admin",
    label: "Overview",
    description: "Health and module map",
    icon: LayoutDashboard,
  },
  {
    href: "/admin/reservations",
    label: "Reservations",
    description: "Lifecycle and force cancel",
    icon: ClipboardList,
  },
  {
    href: "/admin/complaints",
    label: "Complaints",
    description: "Escalations and decisions",
    icon: MessageSquareWarning,
  },
  {
    href: "/admin/refunds",
    label: "Refunds",
    description: "Business-cause queue",
    icon: BadgeDollarSign,
  },
  {
    href: "/admin/host-penalties",
    label: "Host penalties",
    description: "Threshold and waivers",
    icon: Gavel,
  },
  {
    href: "/admin/listings",
    label: "Listing suspension",
    description: "Bookability controls",
    icon: Ban,
  },
  {
    href: "/admin/audit",
    label: "Audit events",
    description: "Operational trail",
    icon: FileClock,
  },
];

function useEffectiveToken() {
  const reduxToken = useSelector((state: RootState) => state.auth.token);
  const [storageToken, setStorageToken] = useState<string | null>(null);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    const sync = () => {
      setStorageToken(authStorage.getAccessToken());
      setHydrated(true);
    };

    sync();
    window.addEventListener("auth-token-refreshed", sync);
    return () => window.removeEventListener("auth-token-refreshed", sync);
  }, []);

  return {
    token: reduxToken ?? storageToken,
    hydrated,
  };
}

export function useAdminToken() {
  const { token, hydrated } = useEffectiveToken();
  const isAdmin = useMemo(
    () => !!token && hasRealmRole(token, "ADMIN"),
    [token],
  );

  return { token, hydrated, isAdmin };
}

function AdminBrandBlock({ compact = false }: { compact?: boolean }) {
  return (
    <Link href="/admin" className="flex min-w-0 items-center gap-3">
      <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-[#ff385c] text-white">
        <ShieldCheck className="size-5" />
      </span>
      <span className={cn("min-w-0", compact && "hidden min-[380px]:block")}>
        <span className="block truncate text-base font-semibold tracking-tight text-[#222222]">
          Airbnb Admin
        </span>
        <span className="block truncate text-xs font-medium text-[#6a6a6a]">
          Booking Flow V2
        </span>
      </span>
    </Link>
  );
}

function AdminNavLinks({ onNavigate }: { onNavigate?: () => void }) {
  const pathname = usePathname();

  return (
    <nav className="space-y-1">
      {navItems.map((item) => {
        const Icon = item.icon;
        const isActive =
          item.href === "/admin"
            ? pathname === item.href
            : pathname.startsWith(item.href);

        return (
          <Link
            key={item.href}
            href={item.href}
            onClick={onNavigate}
            className={cn(
              "group relative flex items-center gap-3 rounded-[14px] px-3 py-3 text-sm transition",
              isActive
                ? "bg-[#f7f7f7] text-[#222222]"
                : "text-[#6a6a6a] hover:bg-[#f7f7f7] hover:text-[#222222]",
            )}
          >
            {isActive ? (
              <span className="absolute left-0 top-1/2 h-6 w-0.5 -translate-y-1/2 rounded-full bg-[#ff385c]" />
            ) : null}
            <span
              className={cn(
                "flex size-9 shrink-0 items-center justify-center rounded-full",
                isActive
                  ? "bg-white text-[#222222] ring-1 ring-[#dddddd]"
                  : "bg-[#f2f2f2] text-[#222222]",
              )}
            >
              <Icon className="size-4" />
            </span>
            <span className="min-w-0">
              <span className="block font-semibold">{item.label}</span>
              <span
                className={cn(
                  "block truncate text-xs",
                  isActive ? "text-[#6a6a6a]" : "text-[#929292]",
                )}
              >
                {item.description}
              </span>
            </span>
          </Link>
        );
      })}
    </nav>
  );
}

function AdminSidebar() {
  return (
    <aside className="sticky top-0 hidden h-screen w-[288px] shrink-0 border-r border-[#ebebeb] bg-white px-5 py-6 lg:flex lg:flex-col">
      <AdminBrandBlock />

      <div className="mt-6 rounded-[14px] border border-[#ebebeb] bg-[#f7f7f7] p-4">
        <div className="flex items-center justify-between gap-3">
          <p className="text-sm font-semibold text-[#222222]">Control plane</p>
          <Badge
            variant="outline"
            className="rounded-full border-rose-100 bg-white text-[#ff385c]"
          >
            V2
          </Badge>
        </div>
        <p className="mt-2 text-xs leading-5 text-[#6a6a6a]">
          Admin actions are isolated from guest and host flows and preserve
          actor-specific booking states.
        </p>
      </div>

      <div className="mt-6 flex-1 overflow-y-auto pr-1">
        <AdminNavLinks />
      </div>

      <div className="mt-6 rounded-[14px] border border-[#ebebeb] bg-white p-4">
        <p className="text-sm font-semibold text-[#222222]">Operational rule</p>
        <p className="mt-2 text-xs leading-5 text-[#6a6a6a]">
          Force cancellation, refunds, complaint decisions and listing
          suspension must remain auditable.
        </p>
      </div>
    </aside>
  );
}

function MobileAdminNav() {
  const [open, setOpen] = useState(false);

  return (
    <div className="sticky top-0 z-30 border-b border-[#ebebeb] bg-white/95 px-4 py-3 backdrop-blur lg:hidden">
      <div className="flex items-center justify-between gap-3">
        <AdminBrandBlock compact />
        <Sheet open={open} onOpenChange={setOpen}>
          <SheetTrigger asChild>
            <Button
              variant="outline"
              size="icon"
              className="rounded-full bg-white"
            >
              <Menu className="size-4" />
              <span className="sr-only">Open admin navigation</span>
            </Button>
          </SheetTrigger>
          <SheetContent side="left" className="w-[340px] bg-white">
            <SheetHeader className="border-b border-[#ebebeb]">
              <SheetTitle>
                <AdminBrandBlock />
              </SheetTitle>
            </SheetHeader>
            <div className="p-4">
              <AdminNavLinks onNavigate={() => setOpen(false)} />
            </div>
          </SheetContent>
        </Sheet>
      </div>
    </div>
  );
}

function AccessGate({
  title,
  description,
  children,
}: {
  title: string;
  description: string;
  children?: ReactNode;
}) {
  return (
    <main className="flex min-h-screen items-center justify-center bg-[#f7f7f7] px-4">
      <section className="max-w-lg rounded-[20px] border border-[#dddddd] bg-white p-8 text-center shadow-[0_0_0_1px_rgba(0,0,0,0.02),0_2px_6px_rgba(0,0,0,0.04),0_4px_8px_rgba(0,0,0,0.10)]">
        <div className="mx-auto flex size-14 items-center justify-center rounded-full bg-rose-50 text-[#ff385c]">
          <AlertTriangle className="size-6" />
        </div>
        <h1 className="mt-5 text-2xl font-semibold tracking-tight text-[#222222]">
          {title}
        </h1>
        <p className="mt-3 text-sm leading-6 text-[#6a6a6a]">{description}</p>
        <div className="mt-6 flex justify-center gap-3">{children}</div>
      </section>
    </main>
  );
}

export function AdminGuard({ children }: { children: ReactNode }) {
  const { token, hydrated, isAdmin } = useAdminToken();

  if (!hydrated) {
    return (
      <main className="min-h-screen bg-white p-6">
        <div className="mx-auto h-[520px] max-w-5xl animate-pulse rounded-[20px] bg-[#f7f7f7]" />
      </main>
    );
  }

  if (!token) {
    return (
      <AccessGate
        title="Admin access requires sign in"
        description="Sign in with an account that has the ADMIN realm role to view operational dashboards."
      >
        <Button
          asChild
          className="h-12 rounded-[8px] bg-[#ff385c] px-6 text-white"
        >
          <Link href="/login">Sign in</Link>
        </Button>
        <Button asChild variant="outline" className="h-12 rounded-[8px] px-6">
          <Link href="/">Back home</Link>
        </Button>
      </AccessGate>
    );
  }

  if (!isAdmin) {
    const subject = parseJwt(token)?.preferred_username ?? parseJwt(token)?.sub;

    return (
      <AccessGate
        title="Admin role required"
        description={`Current session ${subject ? `(${subject}) ` : ""}does not include ADMIN. This dashboard is intentionally isolated from guest and host operations.`}
      >
        <Button asChild variant="outline" className="h-12 rounded-[8px] px-6">
          <Link href="/">Back home</Link>
        </Button>
      </AccessGate>
    );
  }

  return (
    <div className="min-h-screen bg-white text-[#222222]">
      <div className="flex min-h-screen">
        <AdminSidebar />
        <div className="min-w-0 flex-1">
          <MobileAdminNav />
          <div className="min-h-screen">{children}</div>
        </div>
      </div>
    </div>
  );
}

export function AdminHomeLink() {
  return (
    <Button asChild variant="outline" className="h-10 rounded-[8px] px-4">
      <Link href="/">
        <Home className="mr-2 size-4" />
        Public site
      </Link>
    </Button>
  );
}
