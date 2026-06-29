"use client";

import {
  AlertTriangle,
  BadgeDollarSign,
  ChevronDown,
  ClipboardList,
  Home,
  LayoutDashboard,
  LogOut,
  Menu,
  ReceiptText,
  ShieldCheck,
  User,
} from "lucide-react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import type { ReactNode } from "react";
import { useEffect, useMemo, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { logout } from "@/features/auth/authSlice";
import { authStorage } from "@/lib/auth-storage";
import { hasRealmRole, parseJwt } from "@/lib/jwt";
import { cn } from "@/lib/utils";
import type { AppDispatch, RootState } from "@/store";

const navItems = [
  {
    href: "/admin",
    label: "Overview",
    description: "Commerce dashboard",
    icon: LayoutDashboard,
  },
  {
    href: "/admin/transactions",
    label: "Transactions",
    description: "Payments and payouts",
    icon: ReceiptText,
  },
  {
    href: "/admin/users",
    label: "Users",
    description: "Accounts and hosts",
    icon: User,
  },
  {
    href: "/admin/refunds",
    label: "Refunds",
    description: "Refund operations",
    icon: BadgeDollarSign,
  },
  {
    href: "/admin/listings",
    label: "Listings",
    description: "Inventory controls",
    icon: Home,
  },
  {
    href: "/admin/reservations",
    label: "Reservations",
    description: "Booking lifecycle",
    icon: ClipboardList,
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

function getInitials(name?: string | null, email?: string | null) {
  const source = name?.trim() || email?.trim() || "Admin";
  const parts = source.split(/\s+/).filter(Boolean);

  if (parts.length >= 2) {
    return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
  }

  return source.slice(0, 2).toUpperCase();
}

export function AdminAccountMenu({
  operationLabel = "Admin operations",
}: {
  operationLabel?: string;
}) {
  const router = useRouter();
  const dispatch = useDispatch<AppDispatch>();
  const { token } = useAdminToken();
  const authUser = useSelector((state: RootState) => state.auth.user);
  const jwtUser = token ? parseJwt(token) : null;
  const roles = jwtUser?.realm_access?.roles ?? [];
  const roleLabel = roles.includes("ADMIN") ? "ADMIN" : (roles[0] ?? "USER");
  const displayName =
    authUser?.fullName ||
    authUser?.name ||
    jwtUser?.preferred_username ||
    authUser?.email ||
    "Admin";
  const email = authUser?.email || jwtUser?.email;

  const handleLogout = () => {
    dispatch(logout());
    router.push("/");
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="outline"
          className="h-10 rounded-full border-[#dedee6] bg-white px-2 pr-3 text-[#0b0b0f] shadow-none hover:bg-[#f3f3f6]"
        >
          <Avatar className="size-8">
            <AvatarImage src={authUser?.avatarUrl || undefined} alt="avatar" />
            <AvatarFallback className="bg-[#222222] text-xs font-semibold text-white">
              {getInitials(displayName, email)}
            </AvatarFallback>
          </Avatar>
          <ChevronDown className="size-4 text-[#696b78]" />
          <span className="sr-only">Open admin account menu</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent
        align="end"
        className="admin-dark w-72 rounded-[14px] border-[#dedee6] bg-white text-[#0b0b0f]"
      >
        <DropdownMenuLabel className="p-3">
          <div className="flex items-start gap-3">
            <Avatar className="size-10">
              <AvatarImage
                src={authUser?.avatarUrl || undefined}
                alt="avatar"
              />
              <AvatarFallback className="bg-[#222222] text-xs font-semibold text-white">
                {getInitials(displayName, email)}
              </AvatarFallback>
            </Avatar>
            <div className="min-w-0">
              <span className="block truncate text-sm font-semibold text-[#0b0b0f]">
                {displayName}
              </span>
              <span className="mt-0.5 block truncate text-xs text-[#696b78]">
                {email ?? "No email available"}
              </span>
              <span className="mt-1 block truncate text-[11px] font-semibold uppercase tracking-[0.08em] text-[#ff385c]">
                Role: {roleLabel}
              </span>
              <span className="mt-1 inline-flex rounded-full border border-[#dedee6] bg-[#f3f3f6] px-2 py-0.5 text-[11px] font-medium text-[#696b78]">
                {operationLabel}
              </span>
            </div>
          </div>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuItem asChild className="cursor-pointer rounded-[10px]">
          <Link href="/users/profile/about">
            <User className="size-4" />
            Profile
          </Link>
        </DropdownMenuItem>
        <DropdownMenuItem asChild className="cursor-pointer rounded-[10px]">
          <Link href="/">
            <Home className="size-4" />
            Public site
          </Link>
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem
          className="cursor-pointer rounded-[10px] text-[#c13515]"
          onClick={handleLogout}
        >
          <LogOut className="size-4" />
          Log out
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
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
          Operations
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
    <aside className="sticky top-0 hidden h-screen w-[288px] shrink-0 border-r border-[#dedee6] bg-[#f4f4f6] px-5 py-6 lg:flex lg:flex-col">
      <AdminBrandBlock />

      <div className="mt-6 flex-1 overflow-y-auto pr-1">
        <AdminNavLinks />
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
          <SheetContent
            side="left"
            className="admin-dark w-[340px] border-[#dedee6] bg-[#f4f4f6] text-[#0b0b0f]"
          >
            <SheetHeader className="border-b border-[#dedee6]">
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
    <main className="admin-dark flex min-h-screen items-center justify-center bg-[#f7f7f8] px-4 text-[#0b0b0f]">
      <section className="max-w-lg rounded-[20px] border border-[#dedee6] bg-white p-8 text-center shadow-none">
        <div className="mx-auto flex size-14 items-center justify-center rounded-full bg-rose-50 text-[#ff385c]">
          <AlertTriangle className="size-6" />
        </div>
        <h1 className="mt-5 text-2xl font-semibold tracking-tight text-[#0b0b0f]">
          {title}
        </h1>
        <p className="mt-3 text-sm leading-6 text-[#696b78]">{description}</p>
        <div className="mt-6 flex justify-center gap-3">{children}</div>
      </section>
    </main>
  );
}

export function AdminGuard({ children }: { children: ReactNode }) {
  const { token, hydrated, isAdmin } = useAdminToken();

  if (!hydrated) {
    return (
      <main className="admin-dark min-h-screen bg-[#f7f7f8] p-6 text-[#0b0b0f]">
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
    <div className="admin-dark min-h-screen bg-[#f7f7f8] text-[#0b0b0f]">
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
