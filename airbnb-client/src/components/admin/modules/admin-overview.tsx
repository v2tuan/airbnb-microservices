"use client";

import {
  AlertTriangle,
  BadgeDollarSign,
  Ban,
  ClipboardList,
  FileClock,
  Gavel,
  MessageSquareWarning,
} from "lucide-react";
import Link from "next/link";
import { AdminHomeLink, useAdminToken } from "@/components/admin/admin-shell";
import {
  AdminCard,
  AdminMetricCard,
  AdminPageHeader,
  TextStatusPill,
} from "@/components/admin/admin-ui";
import { Button } from "@/components/ui/button";
import { parseJwt } from "@/lib/jwt";

const modules = [
  {
    href: "/admin/reservations",
    title: "Bookings and reservations",
    description:
      "Review V2 lifecycle state and force cancel eligible bookings.",
    icon: ClipboardList,
    status: "Placeholder list API",
  },
  {
    href: "/admin/complaints",
    title: "Complaints",
    description: "Resolve escalated complaints with the V2 decision matrix.",
    icon: MessageSquareWarning,
    status: "Live backend API",
  },
  {
    href: "/admin/refunds",
    title: "Refunds",
    description:
      "Monitor refund records created by cancellation or complaint causes.",
    icon: BadgeDollarSign,
    status: "Placeholder list API",
  },
  {
    href: "/admin/host-penalties",
    title: "Host penalties",
    description:
      "Waive active host cancellation penalties with an admin reason.",
    icon: Gavel,
    status: "Placeholder list API",
  },
  {
    href: "/admin/listings",
    title: "Listing suspension",
    description:
      "Suspend or unsuspend listings without cancelling existing bookings.",
    icon: Ban,
    status: "Partial backend API",
  },
  {
    href: "/admin/audit",
    title: "Audit events",
    description:
      "Read the operational event stream for admin-sensitive actions.",
    icon: FileClock,
    status: "Placeholder API",
  },
];

export function AdminOverviewModule() {
  const { token } = useAdminToken();
  const jwt = token ? parseJwt(token) : null;

  return (
    <>
      <AdminPageHeader
        eyebrow="Admin operations"
        title="Booking Flow V2 control room"
        description="A focused operational dashboard for reservations, refunds, complaints, host penalties, listing suspensions and audit events."
        action={<AdminHomeLink />}
      />

      <div className="mx-auto max-w-[1280px] space-y-6 p-5 sm:p-8">
        <section className="overflow-hidden rounded-[20px] border border-[#dddddd] bg-white shadow-[0_0_0_1px_rgba(0,0,0,0.02),0_2px_6px_rgba(0,0,0,0.04),0_4px_8px_rgba(0,0,0,0.10)]">
          <div className="grid gap-0 lg:grid-cols-[1.1fr_0.9fr]">
            <div className="p-6 sm:p-8">
              <div className="inline-flex items-center gap-2 rounded-full border border-[#dddddd] bg-white px-3 py-1 text-xs font-semibold text-[#222222]">
                <span className="size-1.5 rounded-full bg-[#ff385c]" />
                Live admin workspace
              </div>
              <h2 className="mt-5 max-w-2xl text-[22px] font-medium leading-tight tracking-[-0.02em] text-[#222222]">
                Operate sensitive booking workflows from one governed surface.
              </h2>
              <p className="mt-3 max-w-2xl text-sm leading-6 text-[#6a6a6a]">
                The dashboard keeps destructive actions near their audit
                context, separates read-only queues from command panels, and
                uses Booking Flow V2 actor-specific states throughout.
              </p>
              <div className="mt-6 flex flex-wrap gap-3">
                <Button
                  asChild
                  className="h-12 rounded-[8px] bg-[#ff385c] px-6 text-white hover:bg-[#e00b41]"
                >
                  <Link href="/admin/reservations">Review reservations</Link>
                </Button>
                <Button
                  asChild
                  variant="outline"
                  className="h-12 rounded-[8px] px-6"
                >
                  <Link href="/admin/complaints">Open complaints</Link>
                </Button>
              </div>
            </div>
            <div className="border-t border-[#ebebeb] bg-[#f7f7f7] p-6 sm:p-8 lg:border-l lg:border-t-0">
              <div className="flex gap-3">
                <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-rose-50 text-[#ff385c]">
                  <AlertTriangle className="size-5" />
                </span>
                <div>
                  <p className="font-semibold text-[#222222]">
                    Business boundary
                  </p>
                  <p className="mt-2 text-sm leading-6 text-[#6a6a6a]">
                    Admin force cancellation is allowed only for CONFIRMED or
                    CHECKED_IN bookings. Listing suspension must not auto-cancel
                    existing bookings. Complaint full refund on CHECKED_IN
                    changes the booking to CANCELLED_BY_ADMIN.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </section>

        <div className="grid gap-4 md:grid-cols-3">
          <AdminMetricCard
            accent="brand"
            label="Signed in as"
            value={jwt?.preferred_username ?? "Admin"}
            note="Realm role ADMIN verified on the client."
          />
          <AdminMetricCard
            accent="success"
            label="Booking status policy"
            value="V2"
            note="Legacy paid and generic cancelled booking statuses are excluded."
          />
          <AdminMetricCard
            accent="warning"
            label="Normal user refunds"
            value="Blocked"
            note="Refunds originate only from business causes."
          />
        </div>

        <div className="grid gap-4 xl:grid-cols-2">
          {modules.map((module) => {
            const Icon = module.icon;
            return (
              <AdminCard key={module.href} className="group p-0">
                <Link href={module.href} className="block p-5">
                  <div className="flex items-start gap-4">
                    <span className="flex size-12 shrink-0 items-center justify-center rounded-[14px] bg-[#f7f7f7] text-[#222222] ring-1 ring-[#ebebeb] transition group-hover:text-[#ff385c]">
                      <Icon className="size-5" />
                    </span>
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <h2 className="text-base font-semibold text-[#222222]">
                          {module.title}
                        </h2>
                        <TextStatusPill
                          tone={
                            module.status.includes("Live")
                              ? "success"
                              : "warning"
                          }
                        >
                          {module.status}
                        </TextStatusPill>
                      </div>
                      <p className="mt-2 text-sm leading-6 text-[#6a6a6a]">
                        {module.description}
                      </p>
                      <p className="mt-4 text-sm font-semibold text-[#222222]">
                        Open module
                      </p>
                    </div>
                  </div>
                </Link>
              </AdminCard>
            );
          })}
        </div>
      </div>
    </>
  );
}
