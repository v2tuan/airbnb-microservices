"use client";

import { BadgeCheck, UserRound, UsersRound } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import {
  type AdminUserRecord,
  listAdminUsers,
} from "@/api/endpoints/admin";
import { useAdminToken } from "@/components/admin/admin-shell";
import {
  AdminCard,
  AdminEmptyState,
  AdminErrorState,
  AdminLoadingRows,
  AdminMetricCard,
  AdminPageHeader,
  AdminSectionHeader,
  formatAdminDate,
  getAdminErrorMessage,
  TextStatusPill,
} from "@/components/admin/admin-ui";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

function getInitials(name?: string | null) {
  const source = name?.trim() || "User";
  const parts = source.split(/\s+/).filter(Boolean);

  if (parts.length >= 2) {
    return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
  }

  return source.slice(0, 2).toUpperCase();
}

function roleTone(user: AdminUserRecord) {
  return user.host ? "brand" : "neutral";
}

function stripeTone(status?: string | null) {
  if (status === "ACTIVE") return "success";
  if (status === "PENDING") return "warning";
  if (status === "RESTRICTED") return "danger";
  return "neutral";
}

export function UsersManagementModule() {
  const { token } = useAdminToken();
  const [items, setItems] = useState<AdminUserRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    setLoading(true);
    setError(null);

    listAdminUsers(token)
      .then((response) => {
        if (!active) return;
        setItems(response.data ?? []);
      })
      .catch((err) => {
        if (!active) return;
        setItems([]);
        setError(
          getAdminErrorMessage(
            err,
            "Unable to load users from /users/admin/users.",
          ),
        );
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
  }, [token]);

  const metrics = useMemo(
    () => ({
      total: items.length,
      hosts: items.filter((item) => item.host).length,
      stripeActive: items.filter((item) => item.stripeAccountStatus === "ACTIVE")
        .length,
    }),
    [items],
  );

  return (
    <>
      <AdminPageHeader
        eyebrow="User operations"
        title="User management"
        description="Review registered users, host accounts and payment onboarding status from user-service."
      />
      <div className="mx-auto max-w-[1280px] space-y-6 p-5 sm:p-8">
        <div className="grid gap-4 md:grid-cols-3">
          <AdminMetricCard
            label="Users"
            value={metrics.total}
            note="Registered accounts."
            accent="brand"
            icon={UsersRound}
          />
          <AdminMetricCard
            label="Hosts"
            value={metrics.hosts}
            note="Accounts with host profile."
            accent="success"
            icon={UserRound}
          />
          <AdminMetricCard
            label="Stripe active"
            value={metrics.stripeActive}
            note="Hosts ready for payouts."
            accent="warning"
            icon={BadgeCheck}
          />
        </div>

        <AdminCard className="p-0">
          <AdminSectionHeader
            title="User directory"
            description="Read-only account overview. Account lock/unlock should be added when Keycloak admin controls are wired safely."
          />
          <div className="overflow-x-auto p-5">
            {loading ? <AdminLoadingRows rows={6} /> : null}
            {!loading && error ? <AdminErrorState description={error} /> : null}
            {!loading && !error && items.length === 0 ? (
              <AdminEmptyState
                title="No users"
                description="No user records were returned by user-service."
              />
            ) : null}
            {!loading && !error && items.length > 0 ? (
              <Table className="min-w-[860px]">
                <TableHeader>
                  <TableRow className="hover:bg-transparent">
                    <TableHead>User</TableHead>
                    <TableHead>Role</TableHead>
                    <TableHead>Host status</TableHead>
                    <TableHead>Stripe</TableHead>
                    <TableHead>Joined</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {items.map((item) => (
                    <TableRow key={item.userId} className="border-[#eeeeee]">
                      <TableCell>
                        <div className="flex items-center gap-3">
                          <Avatar className="size-10 rounded-[12px]">
                            <AvatarImage
                              src={item.avatarUrl || undefined}
                              alt={item.fullName}
                            />
                            <AvatarFallback className="rounded-[12px] bg-[#f0f0f3] text-[#222222]">
                              {getInitials(item.fullName)}
                            </AvatarFallback>
                          </Avatar>
                          <div className="min-w-0">
                            <p className="truncate font-semibold text-[#222222]">
                              {item.fullName || "Unnamed user"}
                            </p>
                            <p className="truncate text-xs text-[#6a6a6a]">
                              {item.gender || "No gender set"}
                            </p>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <TextStatusPill tone={roleTone(item)}>
                          {item.host ? "Host" : "User"}
                        </TextStatusPill>
                      </TableCell>
                      <TableCell>
                        {item.host ? (
                          item.hostVerificationStatus || "PENDING"
                        ) : (
                          <span className="text-[#6a6a6a]">Not host</span>
                        )}
                      </TableCell>
                      <TableCell>
                        <TextStatusPill tone={stripeTone(item.stripeAccountStatus)}>
                          {item.stripeAccountStatus || "NONE"}
                        </TextStatusPill>
                      </TableCell>
                      <TableCell>{formatAdminDate(item.createdAt)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            ) : null}
          </div>
        </AdminCard>
      </div>
    </>
  );
}
