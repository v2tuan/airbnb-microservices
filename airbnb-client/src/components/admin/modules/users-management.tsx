"use client";

import {
  BadgeCheck,
  Ban,
  ChevronLeft,
  ChevronRight,
  LockOpen,
  RefreshCw,
  ShieldCheck,
  UsersRound,
} from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  type AdminUserRecord,
  blockAdminUser,
  listAdminUsers,
  type PageResponse,
  syncAdminUsersFromKeycloak,
  unblockAdminUser,
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
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { parseJwt } from "@/lib/jwt";

function getInitials(name?: string | null) {
  const source = name?.trim() || "User";
  const parts = source.split(/\s+/).filter(Boolean);

  if (parts.length >= 2) {
    return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
  }

  return source.slice(0, 2).toUpperCase();
}

function roleTone(user: AdminUserRecord) {
  const roles = user.roles ?? [];
  if (roles.includes("ADMIN")) return "danger";
  if (roles.includes("HOST")) return "brand";
  return "neutral";
}

function roleLabel(user: AdminUserRecord) {
  const roles = user.roles ?? [];
  if (roles.includes("ADMIN")) return "ADMIN";
  if (roles.includes("HOST")) return "HOST";

  return "USER";
}

function stripeTone(status?: string | null) {
  if (status === "ACTIVE") return "success";
  if (status === "PENDING") return "warning";
  if (status === "RESTRICTED") return "danger";
  return "neutral";
}

type RoleFilter = "ALL" | "HOST" | "ADMIN" | "USER";

const roleFilters: Array<{ label: string; value: RoleFilter }> = [
  { label: "All", value: "ALL" },
  { label: "Host", value: "HOST" },
  { label: "Admin", value: "ADMIN" },
  { label: "User", value: "USER" },
];

export function UsersManagementModule() {
  const { token } = useAdminToken();
  const currentAdminUserId = useMemo(
    () => (token ? (parseJwt(token)?.sub ?? null) : null),
    [token],
  );
  const [items, setItems] = useState<AdminUserRecord[]>([]);
  const [pageData, setPageData] =
    useState<PageResponse<AdminUserRecord> | null>(null);
  const [page, setPage] = useState(0);
  const [roleFilter, setRoleFilter] = useState<RoleFilter>("ALL");
  const pageSize = 10;
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [actionMessage, setActionMessage] = useState<string | null>(null);
  const [updatingUserId, setUpdatingUserId] = useState<string | null>(null);
  const [syncing, setSyncing] = useState(false);

  const loadUsers = useCallback(
    (active: () => boolean = () => true) => {
      setLoading(true);
      setError(null);

      return listAdminUsers(token, { page, size: pageSize, role: roleFilter })
        .then((response) => {
          if (!active()) return;
          const data = response.data;
          setPageData(data ?? null);
          setItems(data?.content ?? []);
          setActionMessage(null);
        })
        .catch((err) => {
          if (!active()) return;
          setItems([]);
          setPageData(null);
          setError(
            getAdminErrorMessage(
              err,
              "Unable to load users from /users/admin/users.",
            ),
          );
        })
        .finally(() => {
          if (active()) setLoading(false);
        });
    },
    [page, roleFilter, token],
  );

  useEffect(() => {
    let active = true;
    void loadUsers(() => active);

    return () => {
      active = false;
    };
  }, [loadUsers]);

  const metrics = useMemo(
    () => ({
      total: pageData?.totalElements ?? items.length,
      stripeActive: items.filter(
        (item) => item.stripeAccountStatus === "ACTIVE",
      ).length,
    }),
    [items, pageData?.totalElements],
  );

  const totalPages = Math.max(pageData?.totalPages ?? 1, 1);
  const displayPage = Math.min(page + 1, totalPages);
  const firstItem =
    pageData && pageData.totalElements > 0 ? page * pageSize + 1 : 0;
  const lastItem = pageData
    ? Math.min((page + 1) * pageSize, pageData.totalElements)
    : items.length;

  async function updateUserBlocked(item: AdminUserRecord, blocked: boolean) {
    if (blocked && item.keycloakUserId === currentAdminUserId) {
      setActionMessage("You cannot block your own admin account.");
      return;
    }

    setUpdatingUserId(item.keycloakUserId);
    setActionMessage(null);
    try {
      if (blocked) {
        await blockAdminUser(token, item.keycloakUserId);
      } else {
        await unblockAdminUser(token, item.keycloakUserId);
      }
      setItems((current) =>
        current.map((user) =>
          user.keycloakUserId === item.keycloakUserId
            ? { ...user, enabled: !blocked }
            : user,
        ),
      );
      setActionMessage(
        blocked
          ? `${item.fullName || "User"} has been blocked.`
          : `${item.fullName || "User"} has been unblocked.`,
      );
    } catch (err) {
      setActionMessage(
        getAdminErrorMessage(
          err,
          blocked ? "Block user failed." : "Unblock user failed.",
        ),
      );
    } finally {
      setUpdatingUserId(null);
    }
  }

  async function syncKeycloakUsers() {
    setSyncing(true);
    setActionMessage(null);
    try {
      const response = await syncAdminUsersFromKeycloak(token);
      await loadUsers();
      setActionMessage(
        `${response.data ?? 0} user account${response.data === 1 ? "" : "s"} synced from Keycloak.`,
      );
    } catch (err) {
      setActionMessage(
        getAdminErrorMessage(err, "Sync users from Keycloak failed."),
      );
    } finally {
      setSyncing(false);
    }
  }

  return (
    <>
      <AdminPageHeader
        eyebrow="User operations"
        title="User management"
        description="Review registered users, host accounts and payment onboarding status from user-service."
      />
      <div className="mx-auto max-w-[1280px] space-y-6 p-5 sm:p-8">
        <div className="grid gap-4 md:grid-cols-2">
          <AdminMetricCard
            label="Users"
            value={metrics.total}
            note="Registered accounts."
            accent="brand"
            icon={UsersRound}
          />
          <AdminMetricCard
            label="Stripe active on page"
            value={metrics.stripeActive}
            note="Current page only."
            accent="warning"
            icon={BadgeCheck}
          />
        </div>

        <AdminCard className="p-0">
          <AdminSectionHeader
            title="User directory"
            description="Review accounts, roles, payment onboarding and Keycloak account access."
          />
          <div className="overflow-x-auto p-5">
            <div className="mb-4 flex flex-wrap gap-2">
              <div className="flex flex-1 flex-wrap gap-2">
                {roleFilters.map((filter) => (
                  <Button
                    key={filter.value}
                    type="button"
                    variant={
                      roleFilter === filter.value ? "default" : "outline"
                    }
                    size="sm"
                    onClick={() => {
                      setRoleFilter(filter.value);
                      setPage(0);
                    }}
                  >
                    {filter.label}
                  </Button>
                ))}
              </div>
              <Button
                type="button"
                variant="outline"
                size="sm"
                disabled={syncing || loading}
                onClick={() => void syncKeycloakUsers()}
                className="gap-2"
              >
                <RefreshCw
                  className={`size-4 ${syncing ? "animate-spin" : ""}`}
                />
                Sync Keycloak
              </Button>
            </div>
            {actionMessage ? (
              <p className="mb-4 text-sm leading-6 text-[#6a6a6a]">
                {actionMessage}
              </p>
            ) : null}
            {loading ? <AdminLoadingRows rows={6} /> : null}
            {!loading && error ? <AdminErrorState description={error} /> : null}
            {!loading && !error && items.length === 0 ? (
              <AdminEmptyState
                title="No users"
                description="No user records were returned by user-service."
              />
            ) : null}
            {!loading && !error && items.length > 0 ? (
              <Table className="min-w-[980px]">
                <TableHeader>
                  <TableRow className="hover:bg-transparent">
                    <TableHead>User</TableHead>
                    <TableHead>Role</TableHead>
                    <TableHead>Account</TableHead>
                    <TableHead>Stripe</TableHead>
                    <TableHead>Joined</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {items.map((item) => {
                    const isCurrentAdmin =
                      item.keycloakUserId === currentAdminUserId;

                    return (
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
                            <span className="inline-flex items-center gap-1">
                              <ShieldCheck className="size-3.5" />
                              {roleLabel(item)}
                            </span>
                          </TextStatusPill>
                        </TableCell>
                        <TableCell>
                          <TextStatusPill
                            tone={item.enabled === false ? "danger" : "success"}
                          >
                            {item.enabled === false ? "BLOCKED" : "ACTIVE"}
                          </TextStatusPill>
                        </TableCell>
                        <TableCell>
                          <TextStatusPill
                            tone={stripeTone(item.stripeAccountStatus)}
                          >
                            {item.stripeAccountStatus || "NONE"}
                          </TextStatusPill>
                        </TableCell>
                        <TableCell>{formatAdminDate(item.createdAt)}</TableCell>
                        <TableCell className="text-right">
                          {isCurrentAdmin ? (
                            <TextStatusPill tone="neutral">
                              Current admin
                            </TextStatusPill>
                          ) : (
                            <Button
                              type="button"
                              variant={
                                item.enabled === false
                                  ? "outline"
                                  : "destructive"
                              }
                              size="sm"
                              disabled={updatingUserId === item.keycloakUserId}
                              onClick={() =>
                                updateUserBlocked(item, item.enabled !== false)
                              }
                              className="gap-2"
                            >
                              {item.enabled === false ? (
                                <LockOpen className="size-4" />
                              ) : (
                                <Ban className="size-4" />
                              )}
                              {item.enabled === false ? "Unblock" : "Block"}
                            </Button>
                          )}
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            ) : null}
            {!loading && !error && pageData && pageData.totalElements > 0 ? (
              <div className="mt-4 flex flex-col gap-3 border-t border-[#eeeeee] pt-4 sm:flex-row sm:items-center sm:justify-between">
                <p className="text-sm text-[#6a6a6a]">
                  Showing {firstItem}-{lastItem} of {pageData.totalElements}
                </p>
                <div className="flex items-center gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    size="icon"
                    disabled={page <= 0 || loading}
                    aria-label="Previous users page"
                    onClick={() =>
                      setPage((current) => Math.max(0, current - 1))
                    }
                  >
                    <ChevronLeft className="size-4" />
                  </Button>
                  <span className="min-w-20 text-center text-sm font-medium text-[#222222]">
                    {displayPage} / {totalPages}
                  </span>
                  <Button
                    type="button"
                    variant="outline"
                    size="icon"
                    disabled={page >= totalPages - 1 || loading}
                    aria-label="Next users page"
                    onClick={() =>
                      setPage((current) =>
                        Math.min(totalPages - 1, current + 1),
                      )
                    }
                  >
                    <ChevronRight className="size-4" />
                  </Button>
                </div>
              </div>
            ) : null}
          </div>
        </AdminCard>
      </div>
    </>
  );
}
