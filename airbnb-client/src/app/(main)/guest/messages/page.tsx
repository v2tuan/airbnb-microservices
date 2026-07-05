"use client";

import { listingAPI, type ListingResponse, unwrapApiData } from "@/api/endpoints/listing";
import { fetchMessages, sendMessage } from "@/api/message";
import { userAPI } from "@/api/endpoints/user";
import { useAuth } from "@/hooks/useAuth";
import { useConversations } from "@/hooks/useConversations";
import { useSocket } from "@/hooks/useSocket";
import Image from "next/image";
import Link from "next/link";
import { useParams } from "next/navigation";
import { Suspense, useEffect, useRef, useState, type FormEvent } from "react";
import {
  Archive,
  ChevronLeft,
  Link2,
  MapPin,
  Search,
  Send,
  Sparkles,
  Star,
  Tag,
  Users,
} from "lucide-react";

type Conversation = {
  id: string;
  conversationId: string;
  partnerId?: string;
  name: string;
  avatar: string;
  listing: string;
  time: string;
  preview: string;
  unread?: boolean;
};

type ChatMessage = {
  id: string;
  sender: "host" | "guest";
  text: string;
  createdAt: string;
};

type ListingPreview = {
  listingId: string;
  title: string;
  city: string;
  country: string;
  coverImageUrl?: string;
  basePrice: number;
  currency: string;
  maxGuests: number;
};

function isImageUrl(value?: string) {
  return typeof value === "string" && /^https?:\/\//i.test(value);
}

function getInitials(name?: string) {
  const parts = (name ?? "").trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "?";
  return parts
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? "")
    .join("");
}

function normalizeSenderId(value: unknown) {
  if (!value) return "";
  if (typeof value === "string") return value;
  if (typeof value === "object") {
    const record = value as Record<string, unknown>;
    const direct = record._id ?? record.id ?? record.senderId;
    if (typeof direct === "string") return direct;
  }
  return String(value);
}

const listingLinkPattern =
  /(?:https?:\/\/)?(?:[^/\s]+\/)*?(?:rooms|listings)\/([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}|[A-Za-z0-9_-]+)/i;

const extractListingId = (value: string) => value.match(listingLinkPattern)?.[1] ?? null;

const isUuidLike = (value: string) =>
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value);

const extractListingTitle = (value: string) => {
  const listingId = extractListingId(value);
  if (listingId && isUuidLike(listingId)) {
    return "View listing";
  }

  const match = value.match(/\/([A-Za-z0-9_-]+)(?:\?|#|$)/);
  const raw = match?.[1] ?? "listing";

  return raw
    .replace(/[-_]+/g, " ")
    .replace(/\b\w/g, (character) => character.toUpperCase())
    .trim();
};

const summarizeListingMessage = (value: string, listingTitle?: string | null) => {
  const listingId = extractListingId(value);
  if (!listingId) return value.trim();

  if (listingTitle?.trim()) {
    return listingTitle.trim();
  }

  return "Shared a listing";
};

const listingPreviewCache = new Map<string, ListingPreview>();

const fetchListingPreview = async (
  listingId: string,
  fallbackTitle: string,
): Promise<ListingPreview> => {
  const cached = listingPreviewCache.get(listingId);
  if (cached) return cached;

  try {
    const response = await listingAPI.getRoomById(listingId);
    const listing = unwrapApiData(response.data);

    if (listing) {
      const normalized = normalizeListingPreview(listing);
      listingPreviewCache.set(listingId, normalized);
      return normalized;
    }
  } catch {
    // Fall back to a lightweight card when listing API is unavailable.
  }

  return {
    listingId,
    title: fallbackTitle,
    city: "Open listing",
    country: "",
    basePrice: 0,
    currency: "USD",
    maxGuests: 0,
  };
};

const formatCurrency = (amount: number, currency: string) => {
  try {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency,
      maximumFractionDigits: 0,
    }).format(amount);
  } catch {
    return `${currency} ${Math.round(amount)}`;
  }
};

const normalizeListingPreview = (listing: ListingResponse): ListingPreview => ({
  listingId: listing.listingId,
  title: listing.title,
  city: listing.city,
  country: listing.country,
  coverImageUrl: listing.photos?.find((photo) => photo.isCover)?.photoUrl ?? listing.photos?.[0]?.photoUrl,
  basePrice: listing.pricing?.basePrice ?? 0,
  currency: listing.pricing?.currency ?? "USD",
  maxGuests: listing.maxGuests,
});

function ListingFrame({
  listing,
  fallbackTitle,
  loading = false,
  href,
}: {
  listing?: ListingPreview | null;
  fallbackTitle: string;
  loading?: boolean;
  href?: string;
}) {
  const body = (
    <div className="relative flex gap-3 p-3">
      <div className="relative h-24 w-28 shrink-0 overflow-hidden rounded-xl bg-linear-to-br from-zinc-200 via-zinc-100 to-rose-100">
        {listing?.coverImageUrl ? (
          <Image
            src={listing.coverImageUrl}
            alt={listing.title}
            fill
            className="object-cover transition duration-300 group-hover:scale-105"
            sizes="112px"
          />
        ) : null}
        <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(15,23,42,0.04),rgba(15,23,42,0.42))]" />
        <div className="absolute left-2 top-2 inline-flex items-center gap-1 rounded-full bg-white/90 px-2 py-1 text-[10px] font-semibold text-zinc-700 shadow-sm">
          <Link2 className="h-3 w-3" />
          {loading ? "Loading" : "Listing"}
        </div>
      </div>

      <div className="min-w-0 flex-1 py-1 pr-1">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-zinc-500">
              House link preview
            </p>
            <h3 className="mt-1 truncate text-sm font-semibold text-zinc-900">
              {listing?.title ?? fallbackTitle}
            </h3>
          </div>

          <div className="rounded-full bg-zinc-900 px-2.5 py-1 text-[10px] font-semibold text-white">
            Preview
          </div>
        </div>

        <p className="mt-2 flex items-center gap-1.5 truncate text-xs text-zinc-500">
          <MapPin className="h-3.5 w-3.5 shrink-0" />
          {listing ? `${listing.city}, ${listing.country}` : "Open the listing to load details"}
        </p>

        <div className="mt-2 flex flex-wrap items-center gap-2 text-[11px] text-zinc-600">
          {listing ? (
            <>
              <span className="inline-flex items-center gap-1 rounded-full bg-zinc-100 px-2 py-1 font-medium">
                <Users className="h-3.5 w-3.5" />
                Up to {listing.maxGuests}
              </span>
              <span className="inline-flex items-center gap-1 rounded-full bg-rose-50 px-2 py-1 font-semibold text-rose-600">
                {formatCurrency(listing.basePrice, listing.currency)}
              </span>
            </>
          ) : (
            <span className="inline-flex items-center gap-1 rounded-full bg-zinc-100 px-2 py-1 font-medium">
              <Sparkles className="h-3.5 w-3.5" />
              Paste a room link to preview
            </span>
          )}
        </div>
      </div>
    </div>
  );

  const shell = (
    <div className="group block overflow-hidden rounded-2xl border border-zinc-200 bg-white shadow-[0_14px_40px_rgba(15,23,42,0.08)] transition hover:-translate-y-0.5 hover:shadow-[0_18px_50px_rgba(15,23,42,0.12)]">
      {body}
    </div>
  );

  if (!href) {
    return shell;
  }

  return (
    <Link href={href} className="block">
      {shell}
    </Link>
  );
}

function ListingLinkPreview({
  listingId,
  fallbackTitle,
  debounceMs = 0,
}: {
  listingId: string;
  fallbackTitle: string;
  debounceMs?: number;
}) {
  const [listing, setListing] = useState<ListingPreview | null>(
    () => listingPreviewCache.get(listingId) ?? null,
  );
  const [loading, setLoading] = useState(!listingPreviewCache.has(listingId));

  useEffect(() => {
    let cancelled = false;
    setLoading(!listingPreviewCache.has(listingId));

    const timeout = window.setTimeout(() => {
      void fetchListingPreview(listingId, fallbackTitle).then((preview) => {
        if (!cancelled) {
          setListing(preview);
          setLoading(false);
        }
      });
    }, debounceMs);

    return () => {
      cancelled = true;
      window.clearTimeout(timeout);
    };
  }, [listingId, fallbackTitle, debounceMs]);

  return (
    <ListingFrame
      listing={listing}
      fallbackTitle={fallbackTitle}
      loading={loading}
      href={`/rooms/${listingId}`}
    />
  );
}

function GuestMessagesPageContent() {
  const { user } = useAuth();
  const { socket } = useSocket();
  const params = useParams<{ id?: string }>();
  const conversationId = typeof params?.id === "string" ? params.id : null;
  const { conversations, updateConversationLastMessage } = useConversations({
    activeConversationId: conversationId,
  });
  const isMobileConversationOpen = !!conversationId;

  const emptyConversation: Conversation = {
    id: "empty",
    conversationId: "empty",
    partnerId: undefined,
    name: conversationId ? "Conversation not found" : "Select a conversation",
    avatar: "",
    listing: "",
    time: "",
    preview: "",
  };

  const activeConversation =
    conversationId && conversations.find((conversation) => conversation.conversationId === conversationId)
      ? conversations.find((conversation) => conversation.conversationId === conversationId)!
      : emptyConversation;

  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [draftText, setDraftText] = useState("");
  const [isRemoteTyping, setIsRemoteTyping] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [partnerAvatarUrl, setPartnerAvatarUrl] = useState("");
  const [partnerDisplayName, setPartnerDisplayName] = useState("");
  const messagesScrollRef = useRef<HTMLDivElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const activeAvatarUrl =
    partnerAvatarUrl ||
    (isImageUrl(activeConversation.avatar) ? activeConversation.avatar : "");
  const activeAvatarLabel =
    partnerDisplayName || activeConversation.name || "Conversation";

  const draftListingId = extractListingId(draftText);

  const formatMessageTime = (value?: string | Date) => {
    if (!value) return "";

    const date = new Date(value);
    if (Number.isNaN(date.getTime())) {
      return String(value);
    }

    return date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  };

  const currentUserIds = new Set([user?.keycloakUserId].filter(Boolean).map(String));

  const isOwnMessage = (senderId?: string) => {
    if (!senderId) return false;
    return currentUserIds.has(String(senderId));
  };

  const resolveSenderRole = (senderId?: string): ChatMessage["sender"] =>
    isOwnMessage(senderId) ? "guest" : "host";

  const scrollMessagesToBottom = (behavior: ScrollBehavior = "auto") => {
    messagesEndRef.current?.scrollIntoView({ behavior, block: "end" });
  };

  useEffect(() => {
    if (!conversationId || !user?.keycloakUserId) {
      setMessages([]);
      return;
    }

    let cancelled = false;

    const loadMessages = async () => {
      try {
        const response = await fetchMessages(conversationId);
        const payload = response.data?.messages ?? response.data ?? [];
        const normalized = (Array.isArray(payload) ? payload : []).map((message: any) => ({
          id: message._id ?? message.id ?? String(Date.now()),
          sender: resolveSenderRole(normalizeSenderId(message.senderId)),
          text: message.text ?? "",
          createdAt: formatMessageTime(message.createdAt),
        }));

        if (!cancelled) {
          setMessages(normalized);
        }
      } catch (error) {
        console.error("Failed to fetch messages:", error);
        if (!cancelled) {
          setMessages([]);
        }
      }
    };

    void loadMessages();

    return () => {
      cancelled = true;
    };
  }, [conversationId, user?.keycloakUserId]);

  useEffect(() => {
    let cancelled = false;

    const loadPartnerProfile = async () => {
      if (!activeConversation.partnerId) {
        setPartnerAvatarUrl("");
        setPartnerDisplayName(activeConversation.name ?? "");
        return;
      }

      try {
        const response = await userAPI.getPublicProfileById(activeConversation.partnerId);
        if (cancelled) return;

        const profile = response.data ?? null;
        setPartnerAvatarUrl(profile?.avatarUrl ?? "");
        setPartnerDisplayName(profile?.fullName ?? activeConversation.name ?? "");
      } catch {
        if (cancelled) return;
        setPartnerAvatarUrl("");
        setPartnerDisplayName(activeConversation.name ?? "");
      }
    };

    void loadPartnerProfile();

    return () => {
      cancelled = true;
    };
  }, [activeConversation.name, activeConversation.partnerId]);

  useEffect(() => {
    if (!conversationId) return;

    const frame = window.requestAnimationFrame(() => {
      scrollMessagesToBottom("auto");
    });

    return () => window.cancelAnimationFrame(frame);
  }, [conversationId]);

  useEffect(() => {
    if (!socket) return;

    socket.emit("conversation:join", { conversationId: activeConversation.conversationId });

    const handleTypingStart = (payload: { conversationId?: string }) => {
      if (payload.conversationId === activeConversation.conversationId) {
        setIsRemoteTyping(true);
      }
    };

    const handleTypingStop = (payload: { conversationId?: string }) => {
      if (payload.conversationId === activeConversation.conversationId) {
        setIsRemoteTyping(false);
      }
    };

    const handleNewMessage = (payload: {
      conversationId?: string;
      message?: { _id?: string; text?: string; createdAt?: string; senderId?: string };
    }) => {
      const message = payload.message;
      const messageText = message?.text?.trim() ?? "";
      const senderId = normalizeSenderId(message?.senderId);

      if (payload.conversationId !== activeConversation.conversationId || !message || !messageText) {
        return;
      }

      setMessages((currentMessages) => [
        ...currentMessages,
        {
          id: message._id ?? String(Date.now()),
          sender: resolveSenderRole(senderId),
          text: messageText,
          createdAt: formatMessageTime(message.createdAt),
        },
      ]);
    };

    socket.on("typing:start", handleTypingStart);
    socket.on("typing:stop", handleTypingStop);
    socket.on("message:new", handleNewMessage);

    return () => {
      socket.emit("conversation:leave", { conversationId: activeConversation.conversationId });
      socket.off("typing:start", handleTypingStart);
      socket.off("typing:stop", handleTypingStop);
      socket.off("message:new", handleNewMessage);
    };
  }, [activeConversation.conversationId, socket, user?.keycloakUserId]);

  useEffect(() => {
    if (!conversationId) return;

    const frame = window.requestAnimationFrame(() => {
      scrollMessagesToBottom("smooth");
    });

    return () => window.cancelAnimationFrame(frame);
  }, [conversationId, messages]);

  useEffect(() => {
    if (!socket || !conversationId) return;

    const text = draftText.trim();

    if (!text) {
      socket.emit("typing:stop", { conversationId: activeConversation.conversationId });
      return;
    }

    socket.emit("typing:start", { conversationId: activeConversation.conversationId });

    const typingTimeout = window.setTimeout(() => {
      socket.emit("typing:stop", { conversationId: activeConversation.conversationId });
    }, 900);

    return () => {
      window.clearTimeout(typingTimeout);
      socket.emit("typing:stop", { conversationId: activeConversation.conversationId });
    };
  }, [activeConversation.conversationId, conversationId, draftText, socket]);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!conversationId) return;

    const text = draftText.trim();
    if (!text) return;

    const tmpId = `tmp-${Date.now()}`;
    const tmpCreatedAt = new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });

    setMessages((currentMessages) => [
      ...currentMessages,
      {
        id: tmpId,
        sender: "guest",
        text,
        createdAt: tmpCreatedAt,
      },
    ]);

    if (draftListingId) {
      void fetchListingPreview(draftListingId, extractListingTitle(text)).then((preview) => {
        updateConversationLastMessage(
          activeConversation.conversationId,
          summarizeListingMessage(text, preview.title),
          undefined,
          false,
        );
      });
    } else {
      updateConversationLastMessage(activeConversation.conversationId, text, undefined, false);
    }

    setDraftText("");

    try {
      socket?.emit("typing:stop", { conversationId: activeConversation.conversationId });
    } catch {
      // ignore socket cleanup errors
    }

    setIsSending(true);

    try {
      const payload = {
        conversationId: activeConversation.conversationId,
        text,
      };

      const res = await sendMessage(payload);
      const serverMsg = res?.data ?? null;

      if (serverMsg && serverMsg._id) {
        const serverCreatedAt = serverMsg.createdAt
          ? new Date(serverMsg.createdAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
          : tmpCreatedAt;

        setMessages((curr) =>
          curr.map((message) =>
            message.id === tmpId
              ? {
                  id: serverMsg._id,
                  sender: "guest",
                  text: serverMsg.text ?? text,
                  createdAt: serverCreatedAt,
                }
              : message,
          ),
        );

        updateConversationLastMessage(
          activeConversation.conversationId,
          serverMsg.text ?? text,
          serverMsg.createdAt ?? serverCreatedAt,
          false,
        );
      }
    } catch (error) {
      setMessages((curr) => curr.filter((message) => message.id !== tmpId));
      console.error("Failed to send message", error);
    } finally {
      setIsSending(false);
    }
  };

  return (
    <main className="min-h-[calc(100vh-130px)] bg-[radial-gradient(circle_at_top_left,rgba(255,56,92,0.06),transparent_32%),linear-gradient(180deg,#fff_0%,#fff_55%,#f8fafc_100%)] px-3 pb-6 pt-4 sm:px-6 lg:px-10">
      <section className="mx-auto w-full max-w-7xl">
        <div className="mb-4 animate-in fade-in slide-in-from-top-2 duration-500 sm:mb-6">
          <p className="text-[11px] font-semibold uppercase tracking-[0.15em] text-zinc-500">Guest inbox</p>
          <h1 className="mt-1 text-2xl font-semibold text-zinc-900 sm:mt-2 sm:text-4xl">Messages</h1>
          <p className="mt-2 max-w-2xl text-sm text-zinc-600">Stay in touch with hosts and keep trip details in one place.</p>
        </div>

        <div className="overflow-hidden rounded-2xl border border-zinc-200 bg-white shadow-[0_12px_45px_rgba(15,23,42,0.08)] sm:rounded-3xl">
          <div className="grid h-[calc(100dvh-170px)] min-h-[72vh] grid-cols-1 lg:grid-cols-[340px_1fr]">
            <aside className={`min-h-0 border-b border-zinc-200 lg:border-b-0 lg:border-r ${isMobileConversationOpen ? "hidden lg:block" : "block"}`}>
              <div className="space-y-4 border-b border-zinc-200 p-4 sm:p-5">
                <div className="relative">
                  <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-400" />
                  <input
                    type="text"
                    placeholder="Search messages"
                    className="h-11 w-full rounded-xl border border-zinc-300 bg-zinc-50 pl-10 pr-3 text-sm text-zinc-800 outline-none transition focus:border-zinc-900 focus:bg-white"
                  />
                </div>

                <div className="flex items-center gap-2 text-xs font-medium text-zinc-600">
                  <button className="rounded-full border border-zinc-300 px-3 py-1.5 transition hover:border-zinc-900 hover:text-zinc-900">
                    All
                  </button>
                  <button className="rounded-full border border-zinc-200 px-3 py-1.5 transition hover:border-zinc-900 hover:text-zinc-900">
                    Unread
                  </button>
                  <button className="rounded-full border border-zinc-200 px-3 py-1.5 transition hover:border-zinc-900 hover:text-zinc-900">
                    Archived
                  </button>
                </div>
              </div>

              <div className="h-[calc(100dvh-320px)] min-h-0 overflow-y-auto lg:h-[calc(100dvh-304px)]">
                <div className="min-h-0">
                  {conversations.length > 0 ? (
                    conversations.map((conversation) => {
                      const isActive = conversation.conversationId === activeConversation.conversationId;

                      return (
                        <Link
                          key={conversation.id}
                          href={`/guest/messages/${conversation.conversationId}`}
                          className={`group block border-b border-zinc-100 px-4 py-4 text-left transition sm:px-5 ${
                            isActive ? "bg-zinc-50" : "hover:bg-zinc-50"
                          }`}
                        >
                          <div className="flex items-start gap-3">
                            <div className="flex h-11 w-11 shrink-0 items-center justify-center overflow-hidden rounded-full bg-zinc-900 text-xs font-semibold text-white">
                              {isImageUrl(conversation.avatar) ? (
                                <Image
                                  src={conversation.avatar}
                                  alt={conversation.name}
                                  width={44}
                                  height={44}
                                  className="h-full w-full object-cover"
                                />
                              ) : (
                                <span>{getInitials(conversation.name)}</span>
                              )}
                            </div>

                            <div className="min-w-0 flex-1">
                              <div className="flex items-center justify-between gap-3">
                                <p className={`truncate text-sm ${conversation.unread ? "font-bold text-zinc-950" : "font-semibold text-zinc-900"}`}>
                                  {conversation.name}
                                </p>
                                <span className={`shrink-0 text-xs ${conversation.unread ? "font-semibold text-rose-600" : "text-zinc-500"}`}>
                                  {conversation.time}
                                </span>
                              </div>
                              <p className={`truncate text-xs ${conversation.unread ? "font-medium text-zinc-700" : "text-zinc-500"}`}>
                                {conversation.listing}
                              </p>
                              <p className={`mt-1 truncate text-sm ${conversation.unread ? "font-semibold text-zinc-900" : "text-zinc-700"}`}>
                                {conversation.preview}
                              </p>
                            </div>

                            {conversation.unread ? (
                              <span className="mt-2 h-2.5 w-2.5 shrink-0 rounded-full bg-rose-500" />
                            ) : null}
                          </div>
                        </Link>
                      );
                    })
                  ) : (
                    <div className="px-4 py-10 text-sm text-zinc-500">No conversations yet.</div>
                  )}
                </div>
              </div>
            </aside>

            <section className={`flex min-h-0 flex-col ${isMobileConversationOpen ? "flex" : "hidden lg:flex"}`}>
              <header className="border-b border-zinc-200 px-4 py-3 sm:px-6 sm:py-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <div className="flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-full bg-zinc-900 text-xs font-semibold text-white">
                        {activeAvatarUrl ? (
                          <Image
                            src={activeAvatarUrl}
                            alt={activeAvatarLabel}
                            width={40}
                            height={40}
                            className="h-full w-full object-cover"
                          />
                        ) : (
                          <span>{getInitials(activeAvatarLabel)}</span>
                        )}
                      </div>
                      <Link
                        href="/guest/messages"
                        className="inline-flex h-8 w-8 items-center justify-center rounded-full border border-zinc-200 text-zinc-600 transition hover:border-zinc-900 hover:text-zinc-900 lg:hidden"
                        aria-label="Back to conversations"
                      >
                        <ChevronLeft className="h-4 w-4" />
                      </Link>
                      <p className="truncate text-base font-semibold text-zinc-900 sm:text-lg">{activeAvatarLabel}</p>
                    </div>
                    <p className="truncate text-xs text-zinc-500 sm:text-sm">{activeConversation.listing}</p>
                    {isRemoteTyping ? (
                      <p className="mt-1 inline-flex items-center gap-2 rounded-full bg-rose-50 px-2.5 py-1 text-xs font-medium text-rose-600">
                        <span className="flex gap-1">
                          <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-rose-500" />
                          <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-rose-500 [animation-delay:120ms]" />
                          <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-rose-500 [animation-delay:240ms]" />
                        </span>
                        typing
                      </p>
                    ) : null}
                  </div>

                  <div className="hidden items-center gap-2 text-zinc-500 sm:flex">
                    <button
                      type="button"
                      className="rounded-full border border-zinc-200 p-2.5 transition hover:border-zinc-900 hover:text-zinc-900"
                      aria-label="Star conversation"
                    >
                      <Star className="h-4 w-4" />
                    </button>
                    <button
                      type="button"
                      className="rounded-full border border-zinc-200 p-2.5 transition hover:border-zinc-900 hover:text-zinc-900"
                      aria-label="Label conversation"
                    >
                      <Tag className="h-4 w-4" />
                    </button>
                    <button
                      type="button"
                      className="rounded-full border border-zinc-200 p-2.5 transition hover:border-zinc-900 hover:text-zinc-900"
                      aria-label="Archive conversation"
                    >
                      <Archive className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              </header>

              <div className="relative flex min-h-0 flex-1 flex-col px-3 py-4 sm:px-6 sm:py-6">
                <div className="pointer-events-none absolute inset-x-0 top-0 h-16 bg-linear-to-b from-white to-transparent" />

                <div ref={messagesScrollRef} className="relative min-h-0 flex-1 overflow-y-auto pr-2 sm:pr-3">
                  <div className="mx-auto flex max-w-3xl flex-col gap-4 pb-3">
                    {conversationId ? (
                      messages.length > 0 ? (
                        messages.map((message) => {
                          const listingId = extractListingId(message.text);
                          const fallbackTitle = extractListingTitle(message.text);
                          const isGuestMessage = message.sender === "guest";

                          return (
                            <div
                              key={message.id}
                              className={`max-w-[92%] sm:max-w-[88%] ${isGuestMessage ? "ml-auto" : "mr-auto"} animate-in fade-in duration-500`}
                            >
                              <div
                                className={`rounded-2xl px-4 py-3 text-sm shadow-sm ${
                                  isGuestMessage
                                    ? "rounded-br-md bg-zinc-900 text-white"
                                    : "rounded-bl-md bg-zinc-100 text-zinc-800"
                                }`}
                              >
                                {listingId ? (
                                  <div className="space-y-3">
                                    <p className={`text-xs ${isGuestMessage ? "text-zinc-300" : "text-zinc-500"}`}>
                                      Shared a room link
                                    </p>
                                    <ListingLinkPreview listingId={listingId} fallbackTitle={fallbackTitle} />
                                    <Link
                                      href={`/rooms/${listingId}`}
                                      className={`inline-flex items-center gap-1 text-xs font-medium underline-offset-2 hover:underline ${
                                        isGuestMessage ? "text-rose-200 hover:text-white" : "text-rose-600 hover:text-rose-700"
                                      }`}
                                    >
                                      <Link2 className="h-3.5 w-3.5" />
                                      Open listing
                                    </Link>
                                  </div>
                                ) : (
                                  <p className="whitespace-pre-wrap leading-6">{message.text}</p>
                                )}
                              </div>

                              <p className={`mt-1 text-[11px] ${isGuestMessage ? "text-right text-zinc-400" : "text-zinc-500"}`}>
                                {message.createdAt}
                              </p>
                            </div>
                          );
                        })
                      ) : (
                        <div className="flex min-h-[240px] items-center justify-center rounded-2xl border border-dashed border-zinc-200 bg-zinc-50 px-6 text-center text-sm text-zinc-500">
                          No messages in this conversation yet.
                        </div>
                      )
                    ) : (
                      <div className="flex min-h-[240px] items-center justify-center rounded-2xl border border-dashed border-zinc-200 bg-zinc-50 px-6 text-center text-sm text-zinc-500">
                        Select a conversation to open its thread.
                      </div>
                    )}
                    <div ref={messagesEndRef} />
                  </div>
                </div>
              </div>

              <footer className="border-t border-zinc-200 p-3 sm:p-5">
                {draftListingId ? (
                  <div className="mb-3">
                    <ListingLinkPreview
                      listingId={draftListingId}
                      fallbackTitle={extractListingTitle(draftText)}
                      debounceMs={350}
                    />
                  </div>
                ) : null}

                <form className="flex items-end gap-2 sm:gap-3" onSubmit={handleSubmit}>
                  <textarea
                    rows={2}
                    value={draftText}
                    onChange={(event) => setDraftText(event.target.value)}
                    placeholder="Write a message"
                    className="max-h-40 min-h-11.5 flex-1 resize-y rounded-2xl border border-zinc-300 px-3 py-2.5 text-sm text-zinc-800 outline-none transition focus:border-zinc-900 sm:px-4 sm:py-3"
                    disabled={!conversationId}
                  />
                  <button
                    type="submit"
                    disabled={isSending || !draftText.trim() || !conversationId}
                    className={`inline-flex h-11 items-center gap-2 rounded-xl px-4 text-sm font-medium text-white transition sm:px-5 ${
                      isSending || !draftText.trim() || !conversationId
                        ? "cursor-not-allowed bg-zinc-700/60"
                        : "bg-zinc-900 hover:bg-zinc-700"
                    }`}
                  >
                    <Send className="h-4 w-4" />
                    {isSending ? "Sending..." : "Send"}
                  </button>
                </form>

                {draftListingId ? (
                  <p className="mt-2 flex items-center gap-2 text-xs text-zinc-500">
                    <Sparkles className="h-3.5 w-3.5" />
                    Room link detected - preview will be sent as a clickable listing card
                  </p>
                ) : null}
              </footer>
            </section>
          </div>
        </div>
      </section>
    </main>
  );
}

export default function GuestMessagesPage() {
  return (
    <Suspense fallback={<main className="min-h-screen bg-[#f7f4ef]" />}>
      <GuestMessagesPageContent />
    </Suspense>
  );
}
