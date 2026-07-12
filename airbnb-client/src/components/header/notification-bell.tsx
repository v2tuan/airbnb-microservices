"use client";

import Image from "next/image";
import Link from "next/link";
import { Bell, CheckCheck, ChevronRight, RefreshCw } from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useSelector } from "react-redux";

import { notificationAPI, type NotificationItem } from "@/api/endpoints/notification";
import { userAPI } from "@/api/endpoints/user";
import { selectIsAuthenticated } from "@/features/auth/authSelectors";
import { useSocket } from "@/hooks/useSocket";
import { cn } from "@/lib/utils";
import type { RootState } from "@/store";
import { ScrollArea } from "../ui/scroll-area";

type CachedBellState = {
  items: NotificationItem[];
  unreadCount: number;
};

function formatRelativeTime(value?: string) {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";

  const diffMinutes = Math.max(0, Math.floor((Date.now() - date.getTime()) / 60000));
  if (diffMinutes < 1) return "now";
  if (diffMinutes < 60) return `${diffMinutes}m`;
  const diffHours = Math.floor(diffMinutes / 60);
  if (diffHours < 24) return `${diffHours}h`;
  return `${Math.floor(diffHours / 24)}d`;
}

function normalizeStringValue(value: unknown) {
  if (value == null) return "";
  if (typeof value === "string") return value.trim();
  if (typeof value === "number" || typeof value === "boolean") return String(value);
  if (typeof value === "object") {
    const record = value as Record<string, unknown>;
    const direct = record._id ?? record.id ?? record.value;
    if (typeof direct === "string") return direct.trim();
    if (typeof direct === "number" || typeof direct === "boolean") return String(direct);
  }
  return String(value).trim();
}

function normalizeSenderId(value: unknown) {
  if (!value) return "";
  if (typeof value === "string") return value;
  if (typeof value === "object") {
    const record = value as Record<string, unknown>;
    return String(record._id ?? record.id ?? record.senderId ?? record.userId ?? "");
  }
  return String(value);
}

function getInitials(name?: string) {
  const parts = (name ?? "").trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "?";
  return parts.slice(0, 2).map((part) => part[0]?.toUpperCase() ?? "").join("");
}

function buildNotificationId(notification: Partial<NotificationItem> & { _id?: string }) {
  return notification.id || notification._id || "";
}

function parseNotificationTimestamp(value: unknown): number {
  if (value == null) return 0;
  if (value instanceof Date) {
    const time = value.getTime();
    return Number.isNaN(time) ? 0 : time;
  }
  if (typeof value === "number") {
    return Number.isFinite(value) ? value : 0;
  }
  if (typeof value === "string") {
    const trimmed = value.trim();
    if (!trimmed) return 0;

    if (/^\d+$/.test(trimmed)) {
      const numeric = Number(trimmed);
      if (!Number.isFinite(numeric)) return 0;
      return numeric < 1e12 ? numeric * 1000 : numeric;
    }

    const parsed = Date.parse(trimmed);
    if (!Number.isNaN(parsed)) return parsed;
    return 0;
  }
  if (typeof value === "object") {
    const record = value as Record<string, unknown>;
    return (
      parseNotificationTimestamp(record.$date) ||
      parseNotificationTimestamp(record.value) ||
      parseNotificationTimestamp(record.timestamp)
    );
  }
  return 0;
}

function isMongoObjectId(value?: string | null) {
  return typeof value === "string" && /^[a-f\d]{24}$/i.test(value.trim());
}

function getObjectIdTimestamp(value?: string | null) {
  if (!isMongoObjectId(value)) return 0;

  try {
    return new Date(parseInt(String(value).slice(0, 8), 16) * 1000).getTime();
  } catch {
    return 0;
  }
}

function getNotificationTimestamp(notification: NotificationItem) {
  const candidates = [
    notification.createdAt,
    normalizeStringValue(notification.meta?.createdAt),
    normalizeStringValue(notification.meta?.savedAt),
    normalizeStringValue(notification.meta?.updatedAt),
    normalizeStringValue(notification.meta?.timestamp),
  ];

  for (const candidate of candidates) {
    const time = parseNotificationTimestamp(candidate);
    if (time) return time;
  }

  const objectIdTime = getObjectIdTimestamp(notification.id);
  if (objectIdTime) return objectIdTime;

  return 0;
}

function extractConversationIdFromHref(href?: string | null) {
  if (!href) return "";

  const normalized = href.trim();
  const match = normalized.match(/\/(?:guest|host)\/messages\/([^/?#]+)/i);
  return match?.[1] ?? "";
}

function resolveMessageConversationId(notification: NotificationItem) {
  const meta = notification.meta ?? {};
  const conversationId = normalizeStringValue(meta.conversationId);
  if (conversationId) return conversationId;

  const href = normalizeStringValue(meta.href);
  const fromHref = extractConversationIdFromHref(href);
  if (fromHref) return fromHref;

  return "";
}

function resolveNotificationHref(notification: NotificationItem) {
  const meta = notification.meta ?? {};
  const explicitHref = normalizeStringValue(meta.href) || null;
  const conversationId = resolveMessageConversationId(notification);

  if (notification.type === "MESSAGE" && conversationId) {
    return `/guest/messages/${conversationId}`;
  }

  if (explicitHref) return explicitHref;

  if (notification.type === "LISTING_SUSPENDED" || notification.type === "LISTING_UNSUSPENDED") {
    return "/host/listings";
  }

  return null;
}

function buildPreviewTitle(notification: NotificationItem) {
  const title = notification.title?.trim() ?? "";
  if (notification.type === "MESSAGE") {
    const senderName = normalizeStringValue(notification.meta?.senderName);
    if (senderName) return `${senderName} sent you a message`;
    if (title && !/^new message$/i.test(title) && !/^someone sent you a message$/i.test(title)) {
      return title;
    }
    return "New message";
  }
  return title || "Notification";
}

function mergeHydratedNotifications(
  baseItems: NotificationItem[],
  hydratedItems: NotificationItem[],
) {
  const baseById = new Map(baseItems.map((item) => [item.id, item]));

  return hydratedItems.map((hydratedItem) => {
    const baseItem = baseById.get(hydratedItem.id);
    if (!baseItem) return hydratedItem;

    return {
      ...baseItem,
      ...hydratedItem,
      meta: {
        ...(baseItem.meta ?? {}),
        ...(hydratedItem.meta ?? {}),
      },
    };
  });
}

export default function NotificationBell() {
  const isAuthenticated = useSelector(selectIsAuthenticated);
  const token = useSelector((state: RootState) => state.auth.token);
  const { socket } = useSocket();
  const panelRef = useRef<HTMLDivElement>(null);
  const cacheKey = "airbnb:notifications:bell-cache";

  const [open, setOpen] = useState(false);
  const [items, setItems] = useState<NotificationItem[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(false);
  const [pageSize, setPageSize] = useState(20);
  const senderProfileCacheRef = useRef<Map<string, { fullName?: string; avatarUrl?: string }>>(new Map());
  const loadedCacheRef = useRef(false);

  const sortedItems = useMemo(
    () =>
      [...items].sort((left, right) => {
        const leftTime = getNotificationTimestamp(left);
        const rightTime = getNotificationTimestamp(right);

        if (rightTime !== leftTime) return rightTime - leftTime;

        const leftIdTime = getObjectIdTimestamp(left.id);
        const rightIdTime = getObjectIdTimestamp(right.id);
        return rightIdTime - leftIdTime;
      }),
    [items],
  );

  const normalizeNotificationCreatedAt = useCallback((value?: unknown) => {
    const parsed = parseNotificationTimestamp(value);
    return parsed ? new Date(parsed).toISOString() : new Date().toISOString();
  }, []);

  const sortedVisibleItems = useMemo(
    () =>
      sortedItems.slice(0, pageSize),
    [pageSize, sortedItems],
  );

  const readCache = useCallback((): CachedBellState | null => {
    if (typeof window === "undefined") return null;
    const sources = [window.sessionStorage, window.localStorage];
    for (const source of sources) {
      try {
        const raw = source.getItem(cacheKey);
        if (!raw) continue;
        const parsed = JSON.parse(raw) as Partial<CachedBellState>;
        if (Array.isArray(parsed.items)) {
          return {
            items: parsed.items,
            unreadCount: typeof parsed.unreadCount === "number" ? parsed.unreadCount : 0,
          };
        }
      } catch {
        // ignore parse issues
      }
    }
    return null;
  }, [cacheKey]);

  const writeCache = useCallback(
    (nextItems: NotificationItem[], nextUnreadCount: number) => {
      if (typeof window === "undefined") return;
      const payload = JSON.stringify({
        items: nextItems,
        unreadCount: nextUnreadCount,
        savedAt: Date.now(),
      });
      try {
        window.sessionStorage.setItem(cacheKey, payload);
        window.localStorage.setItem(cacheKey, payload);
      } catch {
        // ignore storage failures
      }
    },
    [cacheKey],
  );

  const resolveSenderProfile = useCallback(async (senderId?: string | null) => {
    const normalized = senderId ? String(senderId) : "";
    if (!normalized) return null;

    const cached = senderProfileCacheRef.current.get(normalized);
    if (cached) return cached;

    try {
      const response = await userAPI.getPublicHostByKeycloakUserId(normalized);
      const profile = {
        fullName: response.data?.fullName,
        avatarUrl: response.data?.avatarUrl,
      };
      senderProfileCacheRef.current.set(normalized, profile);
      return profile;
    } catch {
      try {
        const response = await userAPI.getPublicProfileById(normalized);
        const profile = {
          fullName: response.data?.fullName,
          avatarUrl: response.data?.avatarUrl,
        };
        senderProfileCacheRef.current.set(normalized, profile);
        return profile;
      } catch {
        return null;
      }
    }
  }, []);

  const hydrateMessageNotifications = useCallback(
    async (notifications: NotificationItem[]) => {
      const hydrated = await Promise.all(
        notifications.map(async (notification) => {
          if (notification.type !== "MESSAGE") return notification;

          const senderId = normalizeSenderId(notification.meta?.senderId);
          const senderProfile = await resolveSenderProfile(senderId);
          const senderName =
            senderProfile?.fullName ||
            normalizeStringValue(notification.meta?.senderName) ||
            "Someone";

          return {
            ...notification,
            meta: {
              ...(notification.meta ?? {}),
              senderId,
              senderName,
              senderAvatarUrl:
                senderProfile?.avatarUrl ?? normalizeStringValue(notification.meta?.senderAvatarUrl),
            },
          };
        }),
      );

      return hydrated;
    },
    [resolveSenderProfile],
  );

  const refreshNotifications = useCallback(
    async (limit = pageSize) => {
      if (!isAuthenticated || !token) return;

      setLoading(true);
      try {
        const listResponse = await notificationAPI.getMyNotifications(
          false,
          limit,
        );

        const rawItems = listResponse.data.items ?? [];
        const nextUnread = listResponse.data.totalUnread ?? 0;

        setItems(rawItems);
        setUnreadCount(nextUnread);
        writeCache(rawItems, nextUnread);

        const hasMissingMessageMeta = rawItems.some(
          (notification) =>
            notification.type === "MESSAGE" &&
            (!normalizeStringValue(notification.meta?.senderName) ||
              !normalizeStringValue(notification.meta?.senderAvatarUrl)),
        );

        if (hasMissingMessageMeta) {
          void hydrateMessageNotifications(rawItems)
            .then((hydratedItems) => {
              setItems((current) => {
                const merged = mergeHydratedNotifications(current, hydratedItems);
                writeCache(merged, nextUnread);
                return merged;
              });
            })
            .catch(() => {
              // keep raw items
            });
        }
      } catch {
        // keep current state
      } finally {
        setLoading(false);
      }
    },
    [hydrateMessageNotifications, isAuthenticated, pageSize, token, writeCache],
  );

  useEffect(() => {
    if (!isAuthenticated || !token) {
      setOpen(false);
      setItems([]);
      setUnreadCount(0);
      return;
    }

    if (!loadedCacheRef.current) {
      const cached = readCache();
      if (cached) {
        loadedCacheRef.current = true;
        setItems(cached.items);
        setUnreadCount(cached.unreadCount);
      }
    }

    void refreshNotifications(pageSize);
  }, [isAuthenticated, pageSize, readCache, refreshNotifications, token]);

  useEffect(() => {
    if (!socket || !isAuthenticated) return;

    const syncNotification = async (
      payload: NotificationItem & {
        _id?: string;
        occurredAt?: string;
        payload?: { text?: string; conversationId?: string; messageId?: string };
      },
    ) => {
      const bodyText = (payload.payload?.text || payload.message || "").trim();
      const senderId = normalizeSenderId(payload.meta?.senderId);
      const conversationId = resolveMessageConversationId(payload);
      const senderProfile = payload.type === "MESSAGE" ? await resolveSenderProfile(senderId) : null;
      const senderName =
        senderProfile?.fullName ||
        normalizeStringValue(payload.meta?.senderName) ||
        "Someone";

      const nextNotification: NotificationItem = {
        // Realtime payload may not carry the Mongo notification id yet; messageId
        // is the stable message-side identity we can use to reconcile with the
        // persisted notification document later.
        id:
          buildNotificationId(payload) ||
          normalizeStringValue(payload.meta?.messageId) ||
          normalizeStringValue(payload.payload?.messageId) ||
          `${payload.type}:${payload.createdAt ?? Date.now()}:${payload.message ?? ""}`,
        type: payload.type,
        title:
          payload.type === "MESSAGE"
            ? `${senderName} sent you a message`
            : (payload.title?.trim() || "Notification"),
        message: bodyText,
        meta: {
          ...(payload.meta ?? {}),
          ...(conversationId ? { conversationId } : {}),
          ...(normalizeStringValue(payload.meta?.messageId)
            ? { messageId: normalizeStringValue(payload.meta?.messageId) }
            : {}),
          ...(normalizeStringValue(payload.payload?.messageId)
            ? { messageId: normalizeStringValue(payload.payload?.messageId) }
            : {}),
          senderId,
          senderName,
          senderAvatarUrl: senderProfile?.avatarUrl ?? normalizeStringValue(payload.meta?.senderAvatarUrl),
        },
        read: Boolean(payload.read),
        createdAt: normalizeNotificationCreatedAt(payload.createdAt || payload.occurredAt),
      };

      setItems((current) => {
        const nextItems = [nextNotification, ...current.filter((item) => item.id !== nextNotification.id)].slice(0, 100);
        writeCache(nextItems, Math.max(0, unreadCount + (nextNotification.read ? 0 : 1)));
        return nextItems;
      });
      if (!nextNotification.read) {
        setUnreadCount((current) => current + 1);
      }
    };

    const handleNewNotification = (payload: NotificationItem & { _id?: string }) => {
      void syncNotification(payload);
    };

    socket.on("notification:new", handleNewNotification);
    return () => {
      socket.off("notification:new", handleNewNotification);
    };
  }, [isAuthenticated, items, resolveSenderProfile, socket, unreadCount, writeCache]);

  useEffect(() => {
    if (!isAuthenticated || !token) return;

    const interval = window.setInterval(() => {
      void refreshNotifications(pageSize);
    }, 30000);

    return () => window.clearInterval(interval);
  }, [isAuthenticated, pageSize, refreshNotifications, token]);

  useEffect(() => {
    const handleOutsideClick = (event: MouseEvent) => {
      if (!panelRef.current?.contains(event.target as Node)) {
        setOpen(false);
      }
    };

    document.addEventListener("mousedown", handleOutsideClick);
    return () => document.removeEventListener("mousedown", handleOutsideClick);
  }, []);

  const handleMarkAllRead = async () => {
    if (unreadCount <= 0) return;
    setUnreadCount(0);
    setItems((current) => {
      const nextItems = current.map((item) => ({ ...item, read: true }));
      writeCache(nextItems, 0);
      return nextItems;
    });
    try {
      await notificationAPI.markAllRead();
    } catch {
      void refreshNotifications(pageSize);
    }
  };

  const handleNotificationClick = async (notification: NotificationItem) => {
    const persistedNotificationId = isMongoObjectId(notification.id)
      ? notification.id
      : "";

    if (!notification.read) {
      setUnreadCount((current) => Math.max(0, current - 1));
      setItems((current) =>
        current.map((item) => (item.id === notification.id ? { ...item, read: true } : item)),
      );

      const markReadRequest = persistedNotificationId
        ? notificationAPI.markRead(persistedNotificationId)
        : (async () => {
            const messageId = normalizeStringValue(notification.meta?.messageId);
            if (messageId) {
              const response = await notificationAPI.getMyNotifications(true, 100);
              const matched = (response.data.items ?? []).find(
                (item) => normalizeStringValue(item.meta?.messageId) === messageId,
              );
              if (matched?.id) {
                await notificationAPI.markRead(matched.id);
                return;
              }
            }

            const conversationId = resolveMessageConversationId(notification);
            if (conversationId) {
              const response = await notificationAPI.getMyNotifications(true, 100);
              const matched = (response.data.items ?? []).find(
                (item) =>
                  normalizeStringValue(item.meta?.conversationId) === conversationId &&
                  normalizeSenderId(item.meta?.senderId) === normalizeSenderId(notification.meta?.senderId),
              );
              if (matched?.id) {
                await notificationAPI.markRead(matched.id);
              }
            }
          })();

      void markReadRequest.catch(() => {
        void refreshNotifications(pageSize);
      });
    }

    setOpen(false);
  };

  const renderNotificationItem = useCallback(
    (notification: NotificationItem) => {
      const containerClass = cn(
        "flex w-full gap-3 px-4 py-3 text-left transition hover:bg-zinc-50",
        notification.read ? "bg-white" : "border-l-4 border-l-rose-500 bg-rose-50/70",
      );

      const avatarNode = (
        <div className="mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-full bg-zinc-900 text-white">
          {notification.type === "MESSAGE" && typeof notification.meta?.senderAvatarUrl === "string" && notification.meta.senderAvatarUrl ? (
            <Image
              src={notification.meta.senderAvatarUrl}
              alt={String(notification.meta?.senderName ?? "Sender")}
              width={40}
              height={40}
              unoptimized
              className="h-full w-full object-cover"
            />
          ) : notification.type === "MESSAGE" ? (
            <span className="text-[11px] font-semibold">{getInitials(normalizeStringValue(notification.meta?.senderName))}</span>
          ) : (
            <Bell className="h-4 w-4" />
          )}
        </div>
      );

      const bodyNode = (
        <>
          {avatarNode}
          <div className="min-w-0 flex-1">
            <div className="flex items-start justify-between gap-3">
              <div className="flex min-w-0 items-start gap-2">
                {!notification.read ? <span className="mt-1.5 h-2.5 w-2.5 shrink-0 rounded-full bg-rose-500" /> : null}
                <p className={cn("truncate text-sm", notification.read ? "font-medium text-zinc-900" : "font-semibold text-zinc-950")}>
                  {buildPreviewTitle(notification)}
                </p>
              </div>
              <span className="shrink-0 text-[11px] text-zinc-500">{formatRelativeTime(notification.createdAt)}</span>
            </div>
            <p className={cn("mt-1 line-clamp-2 text-sm", notification.read ? "text-zinc-600" : "font-medium text-zinc-700")}>
              {notification.message}
            </p>
          </div>

          {notification.read ? <ChevronRight className="mt-1 h-4 w-4 shrink-0 text-zinc-300" /> : null}
        </>
      );

      return resolveNotificationHref(notification) ? (
        <Link
          href={resolveNotificationHref(notification) as string}
          onClick={() => void handleNotificationClick(notification)}
          className={containerClass}
        >
          {bodyNode}
        </Link>
      ) : (
        <button
          type="button"
          onClick={() => void handleNotificationClick(notification)}
          className={containerClass}
        >
          {bodyNode}
        </button>
      );
    },
    [handleNotificationClick],
  );

  const handleLoadMore = async () => {
    const nextSize = Math.min(pageSize + 20, 100);
    setPageSize(nextSize);
    await refreshNotifications(nextSize);
  };

  if (!isAuthenticated) return null;

  return (
    <div ref={panelRef} className="relative">
      <button
        type="button"
        onClick={() => setOpen((current) => !current)}
        className={cn(
          "relative flex h-9 w-9 items-center justify-center rounded-full border border-zinc-200 bg-white text-zinc-700 transition hover:border-zinc-900 hover:text-zinc-900",
          open ? "border-zinc-900 text-zinc-900" : "",
        )}
        aria-label="Notifications"
      >
        <Bell className="h-4 w-4" />
        {unreadCount > 0 ? (
          <span className="absolute -right-1 -top-1 min-w-5 rounded-full bg-rose-500 px-1.5 py-0.5 text-[10px] font-semibold leading-none text-white">
            {unreadCount > 99 ? "99+" : unreadCount}
          </span>
        ) : null}
      </button>

      {open ? (
        <div className="absolute right-0 top-full z-50 mt-3 w-[420px] overflow-hidden rounded-[20px] border border-zinc-200 bg-white shadow-[0_18px_60px_rgba(15,23,42,0.16)]">
          <div className="border-b border-zinc-100 bg-zinc-50/80 px-4 py-3">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-sm font-semibold text-zinc-900">Notifications</p>
                <p className="text-xs text-zinc-500">{unreadCount > 0 ? `${unreadCount} unread` : "All caught up"}</p>
              </div>

              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={() => void refreshNotifications(pageSize)}
                  className="inline-flex h-8 w-8 items-center justify-center rounded-full text-zinc-500 transition hover:bg-zinc-100 hover:text-zinc-900"
                  aria-label="Refresh notifications"
                >
                  <RefreshCw className={cn("h-4 w-4", loading ? "animate-spin" : "")} />
                </button>
                <button
                  type="button"
                  onClick={() => void handleMarkAllRead()}
                  className={cn(
                    "inline-flex h-8 items-center gap-1.5 rounded-full px-3 text-xs font-semibold transition",
                    unreadCount > 0 ? "bg-rose-500 text-white hover:bg-rose-600" : "bg-zinc-100 text-zinc-400",
                  )}
                  aria-label="Mark all notifications as read"
                >
                  <CheckCheck className="h-3.5 w-3.5" />
                  Mark all read
                </button>
                <button
                  type="button"
                  onClick={() => setOpen(false)}
                  className="inline-flex h-8 w-8 items-center justify-center rounded-full text-zinc-500 transition hover:bg-zinc-100 hover:text-zinc-900"
                  aria-label="Close notifications"
                >
                  <ChevronRight className="h-4 w-4 rotate-90" />
                </button>
              </div>
            </div>
          </div>

          <ScrollArea className="h-[min(520px,calc(100vh-120px))]">
            <div className="divide-y divide-zinc-100 pr-1">
              {sortedVisibleItems.length > 0 ? (
                sortedVisibleItems.map((notification) => (
                  <div key={notification.id}>{renderNotificationItem(notification)}</div>
                ))
              ) : (
                <div className="px-4 py-10 text-center text-sm text-zinc-500">No notifications yet.</div>
              )}
            </div>

            {sortedItems.length > pageSize ? (
              <div className="border-t border-zinc-100 px-4 py-3">
                <button
                  type="button"
                  onClick={() => void handleLoadMore()}
                  className="w-full rounded-full border border-zinc-200 px-3 py-2 text-xs font-semibold text-zinc-700 transition hover:border-zinc-900 hover:text-zinc-900"
                >
                  Load more
                </button>
              </div>
            ) : null}
          </ScrollArea>
        </div>
      ) : null}
    </div>
  );
}
