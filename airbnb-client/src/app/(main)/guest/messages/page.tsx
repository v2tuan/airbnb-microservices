"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useState, type FormEvent } from "react";
import {
  Archive,
  CircleDot,
  Link2,
  LoaderCircle,
  MapPin,
  Search,
  Send,
  Sparkles,
  Star,
  Tag,
  Users,
} from "lucide-react";
import { listingAPI, type ListingResponse, unwrapApiData } from "@/api/endpoints/listing";
import { useSocket } from "@/hooks/useSocket";

type Conversation = {
  id: string;
  conversationId: string;
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

const conversations: Conversation[] = [
  {
    id: "c1",
    conversationId: "c1",
    name: "Lina Trinh",
    avatar: "LT",
    listing: "Modern loft in District 1",
    time: "2m ago",
    preview: "Sure, early check-in at 1pm works for you.",
    unread: true,
  },
  {
    id: "c2",
    conversationId: "c2",
    name: "Aiden Park",
    avatar: "AP",
    listing: "Ocean-view apartment",
    time: "1h ago",
    preview: "I've shared the self check-in guide and parking map.",
  },
  {
    id: "c3",
    conversationId: "c3",
    name: "Mia Nguyen",
    avatar: "MN",
    listing: "Cozy studio near Ben Thanh",
    time: "Yesterday",
    preview: "Thanks for staying, let me know if you need a late checkout.",
  },
  {
    id: "c4",
    conversationId: "c4",
    name: "Noah Kim",
    avatar: "NK",
    listing: "Sunlit penthouse",
    time: "Apr 22",
    preview: "Can you confirm the Wi-Fi speed for work calls?",
  },
];

const initialMessages: ChatMessage[] = [
  {
    id: "m1",
    sender: "host",
    text: "Hi! Looking forward to your trip. Let me know your arrival time and I will prepare the keys.",
    createdAt: "09:12",
  },
  {
    id: "m2",
    sender: "guest",
    text: "Thanks Lina. I land at 12:15 and should reach your place around 1pm.",
    createdAt: "09:13",
  },
  {
    id: "m3",
    sender: "host",
    text: "Perfect. I enabled early check-in for you and sent the exact pin location above.",
    createdAt: "09:14",
  },
  {
    id: "m4",
    sender: "guest",
    text: "https://example.com/rooms/demo-loft-301",
    createdAt: "09:15",
  },
];

const listingLinkPattern = /(?:https?:\/\/)?(?:[^\s/]+\/)?(?:rooms|listings)\/([A-Za-z0-9_-]+)/i;

const extractListingId = (value: string) => value.match(listingLinkPattern)?.[1] ?? null;

const extractListingTitle = (value: string) => {
  const match = value.match(/\/([A-Za-z0-9_-]+)(?:\?|#|$)/);
  const raw = match?.[1] ?? "listing";

  return raw
    .replace(/[-_]+/g, " ")
    .replace(/\b\w/g, (character) => character.toUpperCase())
    .trim();
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
            <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-zinc-500">House link preview</p>
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

export default function GuestMessagesPage() {
  const { socket } = useSocket();
  const activeConversation = conversations[0];

  const [messages, setMessages] = useState<ChatMessage[]>(initialMessages);
  const [draftText, setDraftText] = useState("");
  const [isRemoteTyping, setIsRemoteTyping] = useState(false);
  const [draftPreview, setDraftPreview] = useState<ListingPreview | null>(null);
  const [draftPreviewLoading, setDraftPreviewLoading] = useState(false);

  const draftListingId = extractListingId(draftText);

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
      message?: { _id?: string; text?: string; createdAt?: string };
    }) => {
      const message = payload.message;
      const messageText = message?.text?.trim() ?? "";

      if (payload.conversationId !== activeConversation.conversationId || !message || !messageText) {
        return;
      }

      setMessages((currentMessages) => [
        ...currentMessages,
        {
          id: message._id ?? String(Date.now()),
          sender: "host",
          text: messageText,
          createdAt: message.createdAt ?? "now",
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
  }, [activeConversation.conversationId, socket]);

  useEffect(() => {
    if (!socket) return;

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
  }, [activeConversation.conversationId, draftText, socket]);

  useEffect(() => {
    if (!draftListingId) {
      setDraftPreview(null);
      setDraftPreviewLoading(false);
      return;
    }

    let cancelled = false;
    setDraftPreviewLoading(true);

    const timeout = window.setTimeout(async () => {
      try {
        const response = await listingAPI.getRoomById(draftListingId);
        const listing = unwrapApiData(response.data);

        if (!cancelled && listing) {
          setDraftPreview(normalizeListingPreview(listing));
          setDraftPreviewLoading(false);
          return;
        }
      } catch {
        // Use a fallback preview frame when the room cannot be resolved.
      }

      if (!cancelled) {
        setDraftPreview({
          listingId: draftListingId,
          title: extractListingTitle(draftText),
          city: "Open listing",
          country: "",
          basePrice: 0,
          currency: "USD",
          maxGuests: 0,
        });
        setDraftPreviewLoading(false);
      }
    }, 350);

    return () => {
      cancelled = true;
      window.clearTimeout(timeout);
    };
  }, [draftListingId, draftText]);

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    const text = draftText.trim();
    if (!text) return;

    setMessages((currentMessages) => [
      ...currentMessages,
      {
        id: String(Date.now()),
        sender: "guest",
        text,
        createdAt: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
      },
    ]);

    setDraftText("");
    setDraftPreview(null);
    setDraftPreviewLoading(false);
  };

  return (
    <main className="min-h-[calc(100vh-130px)] bg-[radial-gradient(circle_at_top_left,rgba(255,56,92,0.06),transparent_32%),linear-gradient(180deg,#fff_0%,#fff_55%,#f8fafc_100%)] px-4 pb-10 pt-6 sm:px-6 lg:px-10">
      <section className="mx-auto w-full max-w-7xl">
        <div className="mb-6 animate-in fade-in slide-in-from-top-2 duration-500">
          <p className="text-xs font-semibold uppercase tracking-[0.15em] text-zinc-500">Guest inbox</p>
          <h1 className="mt-2 text-3xl font-semibold text-zinc-900 sm:text-4xl">Messages</h1>
          <p className="mt-2 text-sm text-zinc-600">Stay in touch with hosts and keep trip details in one place.</p>
        </div>

        <div className="overflow-hidden rounded-3xl border border-zinc-200 bg-white shadow-[0_12px_45px_rgba(15,23,42,0.08)]">
          <div className="grid min-h-[68vh] grid-cols-1 lg:grid-cols-[360px_1fr]">
            <aside className="border-b border-zinc-200 lg:border-b-0 lg:border-r">
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
                  <button className="rounded-full border border-zinc-300 px-3 py-1.5 transition hover:border-zinc-900 hover:text-zinc-900">All</button>
                  <button className="rounded-full border border-zinc-200 px-3 py-1.5 transition hover:border-zinc-900 hover:text-zinc-900">Unread</button>
                  <button className="rounded-full border border-zinc-200 px-3 py-1.5 transition hover:border-zinc-900 hover:text-zinc-900">Archived</button>
                </div>
              </div>

              <div className="max-h-[48vh] overflow-y-auto lg:max-h-[60vh]">
                {conversations.map((conversation, index) => {
                  const isActive = index === 0;

                  return (
                    <button
                      key={conversation.id}
                      type="button"
                      className={`group w-full border-b border-zinc-100 px-4 py-4 text-left transition sm:px-5 ${
                        isActive ? "bg-zinc-50" : "hover:bg-zinc-50"
                      }`}
                    >
                      <div className="flex items-start gap-3">
                        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-zinc-900 text-xs font-semibold text-white">
                          {conversation.avatar}
                        </div>

                        <div className="min-w-0 flex-1">
                          <div className="flex items-center justify-between gap-3">
                            <p className="truncate text-sm font-semibold text-zinc-900">{conversation.name}</p>
                            <span className="shrink-0 text-xs text-zinc-500">{conversation.time}</span>
                          </div>
                          <p className="truncate text-xs text-zinc-500">{conversation.listing}</p>
                          <p className="mt-1 truncate text-sm text-zinc-700">{conversation.preview}</p>
                        </div>

                        {conversation.unread ? <CircleDot className="mt-1 h-4 w-4 shrink-0 text-rose-500" /> : null}
                      </div>
                    </button>
                  );
                })}
              </div>
            </aside>

            <section className="flex flex-col">
              <header className="border-b border-zinc-200 px-4 py-4 sm:px-6">
                <div className="flex items-center justify-between gap-4">
                  <div>
                    <p className="text-lg font-semibold text-zinc-900">{activeConversation.name}</p>
                    <p className="text-sm text-zinc-500">{activeConversation.listing}</p>
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

                  <div className="flex items-center gap-2 text-zinc-500">
                    <button type="button" className="rounded-full border border-zinc-200 p-2.5 transition hover:border-zinc-900 hover:text-zinc-900" aria-label="Star conversation">
                      <Star className="h-4 w-4" />
                    </button>
                    <button type="button" className="rounded-full border border-zinc-200 p-2.5 transition hover:border-zinc-900 hover:text-zinc-900" aria-label="Label conversation">
                      <Tag className="h-4 w-4" />
                    </button>
                    <button type="button" className="rounded-full border border-zinc-200 p-2.5 transition hover:border-zinc-900 hover:text-zinc-900" aria-label="Archive conversation">
                      <Archive className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              </header>

              <div className="relative flex-1 overflow-y-auto px-4 py-6 sm:px-6">
                <div className="pointer-events-none absolute inset-x-0 top-0 h-16 bg-linear-to-b from-white to-transparent" />

                <div className="mx-auto flex max-w-3xl flex-col gap-4">
                  {messages.map((message) => {
                    const listingId = extractListingId(message.text);
                    const fallbackTitle = extractListingTitle(message.text);
                    const isGuestMessage = message.sender === "guest";

                    return (
                      <div
                        key={message.id}
                        className={`max-w-[88%] ${isGuestMessage ? "ml-auto" : "mr-auto"} animate-in fade-in duration-500`}
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
                              <ListingFrame
                                listing={null}
                                fallbackTitle={fallbackTitle}
                                href={`/rooms/${listingId}`}
                              />
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
                  })}
                </div>
              </div>

              <footer className="border-t border-zinc-200 p-4 sm:p-5">
                {draftListingId ? (
                  <div className="mb-3">
                    <ListingFrame
                      listing={draftPreview}
                      fallbackTitle={draftPreview?.title ?? extractListingTitle(draftText)}
                      loading={draftPreviewLoading}
                      href={draftPreview ? `/rooms/${draftPreview.listingId}` : undefined}
                    />
                  </div>
                ) : null}

                <form className="flex items-end gap-3" onSubmit={handleSubmit}>
                  <textarea
                    rows={2}
                    value={draftText}
                    onChange={(event) => setDraftText(event.target.value)}
                    placeholder="Write a message"
                    className="max-h-40 min-h-11.5 flex-1 resize-y rounded-2xl border border-zinc-300 px-4 py-3 text-sm text-zinc-800 outline-none transition focus:border-zinc-900"
                  />
                  <button
                    type="submit"
                    className="inline-flex h-11 items-center gap-2 rounded-xl bg-zinc-900 px-5 text-sm font-medium text-white transition hover:bg-zinc-700"
                  >
                    <Send className="h-4 w-4" />
                    Send
                  </button>
                </form>

                {draftListingId ? (
                  <p className="mt-2 flex items-center gap-2 text-xs text-zinc-500">
                    {draftPreviewLoading ? <LoaderCircle className="h-3.5 w-3.5 animate-spin" /> : <Sparkles className="h-3.5 w-3.5" />}
                    {draftPreviewLoading ? "Loading room preview..." : "Room preview ready to send"}
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