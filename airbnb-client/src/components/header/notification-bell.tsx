"use client";

import Image from "next/image";
import { Bell, CheckCheck, ChevronRight, MessageSquare, RefreshCw } from "lucide-react";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useSelector } from "react-redux";

import { notificationAPI, type NotificationItem } from "@/api/endpoints/notification";
import { userAPI } from "@/api/endpoints/user";
import { selectIsAuthenticated } from "@/features/auth/authSelectors";
import { useSocket } from "@/hooks/useSocket";
import { cn } from "@/lib/utils";
import type { RootState } from "@/store";
import { ScrollArea } from "../ui/scroll-area";

function formatRelativeTime(value?: string) {
  if (!value) return "";

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return "";
  }

  const diffMinutes = Math.max(0, Math.floor((Date.now() - date.getTime()) / 60000));
  if (diffMinutes < 1) return "now";
  if (diffMinutes < 60) return `${diffMinutes}m`;

  const diffHours = Math.floor(diffMinutes / 60);
  if (diffHours < 24) return `${diffHours}h`;

  const diffDays = Math.floor(diffHours / 24);
  return `${diffDays}d`;
}

function resolveNotificationHref(notification: NotificationItem) {
  const meta = notification.meta ?? {};
  const explicitHref = typeof meta.href === "string" ? meta.href : null;
  if (explicitHref) return explicitHref;

  const conversationId =
    typeof meta.conversationId === "string" ? meta.conversationId : null;

  if (notification.type === "MESSAGE" && conversationId) {
    return `/guest/messages/${conversationId}`;
  }

  if (
    notification.type === "LISTING_SUSPENDED" ||
    notification.type === "LISTING_UNSUSPENDED"
  ) {
    return "/host/listings";
  }

  return null;
}

function buildPreviewTitle(notification: NotificationItem) {
  const title = notification.title?.trim() ?? "";
  if (notification.type === "MESSAGE") {
    const senderName = typeof notification.meta?.senderName === "string" ? notification.meta.senderName.trim() : "";
    if (title && !/^new message$/i.test(title) && !/^someone sent you a message$/i.test(title)) {
      return title;
    }
    return senderName ? `${senderName} sent you a message` : "New message";
  }

  return title || "Notification";
}

function buildNotificationId(notification: Partial<NotificationItem> & { _id?: string }) {
  return notification.id || notification._id || "";
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

function buildNotificationKey(notification: Partial<NotificationItem> & { _id?: string; occurredAt?: string }) {
  const meta = notification.meta ?? {};
  const messageId = typeof meta.messageId === "string" ? meta.messageId : "";
  const conversationId = typeof meta.conversationId === "string" ? meta.conversationId : "";
  const senderId = typeof meta.senderId === "string" ? meta.senderId : "";
  const bookingId = typeof meta.bookingId === "string" ? meta.bookingId : "";
  const listingId = typeof meta.listingId === "string" ? meta.listingId : "";
  const href = typeof meta.href === "string" ? meta.href : "";
  const message = typeof notification.message === "string" ? notification.message : "";
  const title = typeof notification.title === "string" ? notification.title : "";

  return [
    notification.type || "",
    messageId,
    conversationId,
    senderId,
    bookingId,
    listingId,
    href,
    title.trim(),
    message.trim(),
  ].join("|");
}

export default function NotificationBell() {
  const isAuthenticated = useSelector(selectIsAuthenticated);
  const token = useSelector((state: RootState) => state.auth.token);
  const { socket } = useSocket();
  const router = useRouter();
  const panelRef = useRef<HTMLDivElement>(null);

  const [open, setOpen] = useState(false);
  const [items, setItems] = useState<NotificationItem[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(false);
  const seenNotificationKeysRef = useRef<Set<string>>(new Set());
  const senderProfileCacheRef = useRef<Map<string, { fullName?: string; avatarUrl?: string }>>(new Map());

  const sortedItems = useMemo(
    () =>
      [...items].sort((left, right) => {
        const leftTime = left.createdAt ? new Date(left.createdAt).getTime() : 0;
        const rightTime = right.createdAt ? new Date(right.createdAt).getTime() : 0;
        return rightTime - leftTime;
      }),
    [items],
  );

  const resolveSenderProfile = useCallback(async (senderId?: string | null) => {
    const normalized = senderId ? String(senderId) : "";
    if (!normalized) return null;

    const cached = senderProfileCacheRef.current.get(normalized);
    if (cached) return cached;

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
  }, []);

  const hydrateMessageNotifications = useCallback(
    async (notifications: NotificationItem[]) => {
      const hydrated = await Promise.all(
        notifications.map(async (notification) => {
          if (notification.type !== "MESSAGE") {
            return notification;
          }

          const senderId = normalizeSenderId(notification.meta?.senderId);
          const senderProfile = await resolveSenderProfile(senderId);

          return {
            ...notification,
            meta: {
              ...(notification.meta ?? {}),
              senderId,
              senderName: senderProfile?.fullName ?? notification.meta?.senderName,
              senderAvatarUrl: senderProfile?.avatarUrl ?? notification.meta?.senderAvatarUrl,
            },
          };
        }),
      );

      return hydrated;
    },
    [resolveSenderProfile],
  );

  const refreshNotifications = useCallback(async () => {
    if (!isAuthenticated || !token) return;

    setLoading(true);
    try {
      const [listResponse, countResponse] = await Promise.all([
        notificationAPI.getMyNotifications(false, 100),
        notificationAPI.getUnreadCount(),
      ]);

      const hydratedItems = await hydrateMessageNotifications(listResponse.data.items ?? []);
      setItems(hydratedItems);
      setUnreadCount(countResponse.data.count ?? listResponse.data.totalUnread ?? 0);
      seenNotificationKeysRef.current = new Set(
        hydratedItems.map((item) =>
          buildNotificationKey({
            ...item,
            createdAt: item.createdAt,
          }),
        ),
      );
    } catch {
      // Keep the last known state; transient auth/transport issues should not
      // erase a notification that has already been rendered locally.
    } finally {
      setLoading(false);
    }
  }, [hydrateMessageNotifications, isAuthenticated, token]);

  useEffect(() => {
    if (!isAuthenticated || !token) {
      setOpen(false);
      setItems([]);
      setUnreadCount(0);
      return;
    }

    void refreshNotifications();
  }, [isAuthenticated, token, refreshNotifications]);

  useEffect(() => {
    if (!socket || !isAuthenticated) return;

    const syncNotification = async (payload: NotificationItem & { _id?: string; occurredAt?: string; payload?: { text?: string } }) => {
      const bodyText = (payload.payload?.text || payload.message || "").trim();
      const senderId = normalizeSenderId(payload.meta?.senderId);
      const senderProfile = payload.type === "MESSAGE" ? await resolveSenderProfile(senderId) : null;

      const nextNotification: NotificationItem = {
        id: buildNotificationId(payload) || `${payload.type}:${payload.createdAt ?? Date.now()}:${payload.message ?? ""}`,
        type: payload.type,
        title: (() => {
          const baseTitle = payload.title?.trim() || "";
          if (payload.type !== "MESSAGE") {
            return baseTitle || "Notification";
          }

          if (baseTitle && !/^new message$/i.test(baseTitle) && !/^someone sent you a message$/i.test(baseTitle)) {
            return baseTitle;
          }

          const senderName =
            senderProfile?.fullName ||
            (typeof payload.meta?.senderName === "string" ? payload.meta.senderName : "") ||
            "Someone";

          return `${senderName} sent you a message`;
        })(),
        message: bodyText,
        meta: {
          ...(payload.meta ?? {}),
          senderId,
          senderName: senderProfile?.fullName ?? payload.meta?.senderName,
          senderAvatarUrl: senderProfile?.avatarUrl ?? payload.meta?.senderAvatarUrl,
        },
        read: Boolean(payload.read),
        createdAt: payload.createdAt || payload.occurredAt,
      };

      const nextKey = buildNotificationKey({
        ...nextNotification,
        _id: payload._id,
        occurredAt: payload.occurredAt,
      });

      if (seenNotificationKeysRef.current.has(nextKey)) {
        return;
      }
      seenNotificationKeysRef.current.add(nextKey);

      setItems((current) => {
        const nextId = buildNotificationId(nextNotification);
        if (!nextId) return current;

        const filtered = current.filter((item) => item.id !== nextId);
        return [nextNotification, ...filtered].slice(0, 100);
      });

      if (!nextNotification.read) {
        setUnreadCount((current) => current + 1);
      }

      window.setTimeout(() => {
        void refreshNotifications();
      }, 1200);
    };

    const handleNewNotification = (payload: NotificationItem & { _id?: string }) => {
      void syncNotification(payload);
    };

    socket.on("notification:new", handleNewNotification);
    return () => {
      socket.off("notification:new", handleNewNotification);
    };
  }, [isAuthenticated, refreshNotifications, resolveSenderProfile, socket]);

  useEffect(() => {
    if (!isAuthenticated || !token) return;

    const interval = window.setInterval(() => {
      void refreshNotifications();
    }, 20000);

    return () => window.clearInterval(interval);
  }, [isAuthenticated, refreshNotifications, token]);

  useEffect(() => {
    const handleOutsideClick = (event: MouseEvent) => {
      if (!panelRef.current?.contains(event.target as Node)) {
        setOpen(false);
      }
    };

    document.addEventListener("mousedown", handleOutsideClick);
    return () => document.removeEventListener("mousedown", handleOutsideClick);
  }, []);

  const handleOpen = () => {
    setOpen((current) => !current);
  };

  const handleMarkAllRead = async () => {
    if (unreadCount <= 0) return;

    try {
      await notificationAPI.markAllRead();
      setUnreadCount(0);
      setItems((current) => current.map((item) => ({ ...item, read: true })));
      await refreshNotifications();
    } catch {
      // ignore read state sync failures
    }
  };

  const handleNotificationClick = async (notification: NotificationItem) => {
    const href = resolveNotificationHref(notification);
    if (href) {
      router.push(href);
    }

    try {
      if (!notification.read) {
        await notificationAPI.markRead(notification.id);
        setItems((current) =>
          current.map((item) =>
            item.id === notification.id ? { ...item, read: true } : item,
          ),
        );
        await refreshNotifications();
      }
    } catch {
      // ignore
    }

    setOpen(false);
  };

  if (!isAuthenticated) {
    return null;
  }

  return (
    <div ref={panelRef} className="relative">
      <button
        type="button"
        onClick={handleOpen}
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
                <p className="text-xs text-zinc-500">
                  {unreadCount > 0 ? `${unreadCount} unread` : "All caught up"}
                </p>
              </div>

              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={() => void refreshNotifications()}
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
                    unreadCount > 0
                      ? "bg-rose-500 text-white hover:bg-rose-600"
                      : "bg-zinc-100 text-zinc-400",
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

          <ScrollArea className="max-h-[520px]">
            <div className="divide-y divide-zinc-100">
              {sortedItems.length > 0 ? (
                sortedItems.map((notification) => {
                  const content = (
                    <button
                      type="button"
                      onClick={() => void handleNotificationClick(notification)}
                      className={cn(
                        "flex w-full gap-3 px-4 py-3 text-left transition hover:bg-zinc-50",
                        notification.read
                          ? "bg-white"
                          : "border-l-4 border-l-rose-500 bg-rose-50/70",
                      )}
                    >
                      <div className="mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-full bg-zinc-900 text-white">
                        {notification.type === "MESSAGE" &&
                        typeof notification.meta?.senderAvatarUrl === "string" &&
                        notification.meta.senderAvatarUrl ? (
                          <Image
                            src={notification.meta.senderAvatarUrl}
                            alt={String(notification.meta?.senderName ?? "Sender")}
                            width={40}
                            height={40}
                            unoptimized
                            className="h-full w-full object-cover"
                          />
                        ) : notification.type === "MESSAGE" ? (
                          <MessageSquare className="h-4 w-4" />
                        ) : (
                          <Bell className="h-4 w-4" />
                        )}
                      </div>

                      <div className="min-w-0 flex-1">
                        <div className="flex items-start justify-between gap-3">
                          <div className="flex min-w-0 items-start gap-2">
                            {!notification.read ? (
                              <span className="mt-1.5 h-2.5 w-2.5 shrink-0 rounded-full bg-rose-500" />
                            ) : null}
                            <p
                              className={cn(
                                "truncate text-sm",
                                notification.read
                                  ? "font-medium text-zinc-900"
                                  : "font-semibold text-zinc-950",
                              )}
                            >
                              {buildPreviewTitle(notification)}
                            </p>
                          </div>
                          <span className="shrink-0 text-[11px] text-zinc-500">
                            {formatRelativeTime(notification.createdAt)}
                          </span>
                        </div>
                        <p
                          className={cn(
                            "mt-1 line-clamp-2 text-sm",
                            notification.read ? "text-zinc-600" : "font-medium text-zinc-700",
                          )}
                        >
                          {notification.message}
                        </p>
                      </div>

                      {notification.read ? (
                        <ChevronRight className="mt-1 h-4 w-4 shrink-0 text-zinc-300" />
                      ) : null}
                    </button>
                  );

                  return (
                    <div key={notification.id}>
                      {content}
                    </div>
                  );
                })
              ) : (
                <div className="px-4 py-10 text-center text-sm text-zinc-500">
                  No notifications yet.
                </div>
              )}
            </div>
          </ScrollArea>
        </div>
      ) : null}
    </div>
  );
}
