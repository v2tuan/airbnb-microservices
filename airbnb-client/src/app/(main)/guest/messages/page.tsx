"use client";

import {
  listingAPI,
  type ListingResponse,
  unwrapApiData,
} from "@/api/endpoints/listing";
import { fetchMessages, sendMessage } from "@/api/message";
import { userAPI } from "@/api/endpoints/user";
import { useAuth } from "@/hooks/useAuth";
import { useConversations } from "@/hooks/useConversations";
import { useSocket } from "@/hooks/useSocket";
import Image from "next/image";
import Link from "next/link";
import { useParams } from "next/navigation";
import {
  Suspense,
  useCallback,
  useEffect,
  useRef,
  useState,
  type FormEvent,
} from "react";
import {
  Archive,
  ChevronLeft,
  FileText,
  Link2,
  Paperclip,
  MapPin,
  Mic,
  Play,
  Search,
  Send,
  Sparkles,
  Star,
  Tag,
  Video,
  X,
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
  attachments?: ChatAttachment[];
  messageType?: "text" | "media" | "mixed";
};

type ChatAttachment = {
  url: string;
  type: "image" | "file" | "audio" | "video";
  filename?: string;
  mimetype?: string;
  size?: number;
};

type PendingAttachment = {
  id: string;
  file: File;
  url: string;
  type: ChatAttachment["type"];
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

const extractListingId = (value: string) =>
  value.match(listingLinkPattern)?.[1] ?? null;

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

const summarizeListingMessage = (
  value: string,
  listingTitle?: string | null,
) => {
  const listingId = extractListingId(value);
  if (!listingId) return value.trim();

  if (listingTitle?.trim()) {
    return listingTitle.trim();
  }

  return "Shared a listing";
};

const truncatePreview = (value: string, maxLength = 56) => {
  const compact = value.replace(/\s+/g, " ").trim();
  if (compact.length <= maxLength) return compact;
  return `${compact.slice(0, maxLength - 1).trimEnd()}…`;
};

const summarizeConversationPreview = (value: {
  lastMessage?: {
    text?: string;
    attachments?: any[];
  };
}) => {
  const lastMessage = value.lastMessage ?? {};
  const text =
    typeof lastMessage.text === "string" ? lastMessage.text.trim() : "";
  const attachments = Array.isArray(lastMessage.attachments)
    ? lastMessage.attachments
    : [];

  if (text && attachments.length > 0) {
    return truncatePreview(
      `${text} • ${summarizeAttachmentPreview(attachments)}`,
    );
  }

  if (text) {
    return truncatePreview(text);
  }

  const attachmentSummary = summarizeAttachmentPreview(attachments);
  if (attachmentSummary) {
    return attachmentSummary;
  }

  return "No messages yet";
};

const resolveAttachmentType = (file: File): ChatAttachment["type"] => {
  if (file.type.startsWith("image/")) return "image";
  if (file.type.startsWith("video/")) return "video";
  if (file.type.startsWith("audio/")) return "audio";
  return "file";
};

const normalizeAttachment = (attachment: any): ChatAttachment | null => {
  const url = typeof attachment?.url === "string" ? attachment.url : "";
  if (!url) return null;

  const rawType = String(attachment?.type || "file");
  const type: ChatAttachment["type"] =
    rawType === "image" || rawType === "video" || rawType === "audio"
      ? rawType
      : "file";

  return {
    url,
    type,
    filename:
      typeof attachment?.filename === "string"
        ? attachment.filename
        : undefined,
    mimetype:
      typeof attachment?.mimetype === "string"
        ? attachment.mimetype
        : undefined,
    size: typeof attachment?.size === "number" ? attachment.size : undefined,
  };
};

const normalizeAttachments = (attachments: any): ChatAttachment[] => {
  if (!Array.isArray(attachments)) return [];
  return attachments
    .map(normalizeAttachment)
    .filter(Boolean) as ChatAttachment[];
};

const summarizeAttachmentPreview = (attachments: ChatAttachment[]) => {
  if (!Array.isArray(attachments) || attachments.length === 0) return "";

  const typeCounts = attachments.reduce<Record<string, number>>(
    (counts, attachment) => {
      const type = String(attachment?.type || "file");
      counts[type] = (counts[type] || 0) + 1;
      return counts;
    },
    {},
  );

  const parts = Object.entries(typeCounts).map(([type, count]) => {
    const label =
      type === "image"
        ? "image"
        : type === "video"
          ? "video"
          : type === "audio"
            ? "voice"
            : "file";

    return count > 1 ? `${label}s (${count})` : label;
  });

  if (parts.length === 1) {
    return `Sent ${parts[0]}`;
  }

  return `Sent ${parts.slice(0, 2).join(", ")}${parts.length > 2 ? ` +${parts.length - 2}` : ""}`;
};

const formatFileSize = (size?: number) => {
  if (!size || size < 0) return "";
  if (size < 1024) return `${size} B`;
  if (size < 1024 * 1024) return `${Math.round(size / 1024)} KB`;
  return `${(size / (1024 * 1024)).toFixed(1)} MB`;
};

const getAttachmentDisplayLabel = (attachment: ChatAttachment) => {
  switch (attachment.type) {
    case "image":
      return "Image";
    case "video":
      return "Video";
    case "audio":
      return "Voice";
    default:
      return "File";
  }
};

const listingPreviewCache = new Map<string, ListingPreview>();

const QUICK_MESSAGE_SUGGESTIONS = [
  "Phòng này gần chợ không ạ?",
  "Có cho nuôi thú cưng không?",
  "Giờ check-in và check-out là mấy giờ?",
  "Phòng này có chỗ đậu xe không?",
  "Có thể xem thêm ảnh phòng được không?",
];

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
  coverImageUrl:
    listing.photos?.find((photo) => photo.isCover)?.photoUrl ??
    listing.photos?.[0]?.photoUrl,
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
          {listing
            ? `${listing.city}, ${listing.country}`
            : "Open the listing to load details"}
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
    conversationId &&
    conversations.find(
      (conversation) => conversation.conversationId === conversationId,
    )
      ? conversations.find(
          (conversation) => conversation.conversationId === conversationId,
        )!
      : emptyConversation;

  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [draftText, setDraftText] = useState("");
  const [isRemoteTyping, setIsRemoteTyping] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [pendingAttachments, setPendingAttachments] = useState<
    PendingAttachment[]
  >([]);
  const [partnerAvatarUrl, setPartnerAvatarUrl] = useState("");
  const [partnerDisplayName, setPartnerDisplayName] = useState("");
  const messagesScrollRef = useRef<HTMLDivElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const attachmentInputRef = useRef<HTMLInputElement>(null);

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

  const currentUserIds = new Set(
    [user?.keycloakUserId].filter(Boolean).map(String),
  );

  const isOwnMessage = (senderId?: string) => {
    if (!senderId) return false;
    return currentUserIds.has(String(senderId));
  };

  const resolveSenderRole = (senderId?: string): ChatMessage["sender"] =>
    isOwnMessage(senderId) ? "guest" : "host";

  const scrollMessagesToBottom = (behavior: ScrollBehavior = "auto") => {
    messagesEndRef.current?.scrollIntoView({ behavior, block: "end" });
  };

  const renderAttachment = (
    attachment: ChatAttachment,
    isGuestMessage: boolean,
    key: string,
  ) => {
    const shellClass = isGuestMessage
      ? "border border-white/10 bg-white/5 text-white"
      : "border border-zinc-200 bg-white text-zinc-900";
    const labelClass = isGuestMessage ? "text-zinc-300" : "text-zinc-500";
    const titleClass = isGuestMessage ? "text-white" : "text-zinc-900";
    const metaClass = isGuestMessage ? "text-zinc-300" : "text-zinc-500";

    if (attachment.type === "image") {
      return (
        <a
          key={key}
          href={attachment.url}
          target="_blank"
          rel="noreferrer"
          className={`block overflow-hidden rounded-2xl ${shellClass}`}
        >
          <div className="relative aspect-[4/3] w-full overflow-hidden">
            <Image
              src={attachment.url}
              alt={attachment.filename ?? "Attachment image"}
              fill
              className="object-cover"
              sizes="(max-width: 640px) 80vw, 360px"
            />
          </div>
          <div
            className={`flex items-center justify-between gap-3 px-3 py-2 text-xs ${labelClass}`}
          >
            <span className="truncate font-medium">
              {attachment.filename ?? "Image"}
            </span>
            {attachment.size ? (
              <span className="shrink-0">
                {formatFileSize(attachment.size)}
              </span>
            ) : null}
          </div>
        </a>
      );
    }

    if (attachment.type === "video") {
      return (
        <div key={key} className={`overflow-hidden rounded-2xl ${shellClass}`}>
          <video controls className="max-h-80 w-full bg-black">
            <source src={attachment.url} />
          </video>
          <div className="flex items-center gap-2 px-3 py-2 text-xs">
            <Play className={`h-3.5 w-3.5 ${labelClass}`} />
            <div className="min-w-0">
              <p className={`truncate font-medium ${titleClass}`}>
                {attachment.filename ?? "Video"}
              </p>
              <p className={metaClass}>{formatFileSize(attachment.size)}</p>
            </div>
          </div>
        </div>
      );
    }

    if (attachment.type === "audio") {
      return (
        <div
          key={key}
          className={`overflow-hidden rounded-2xl p-3 ${shellClass}`}
        >
          <div className="mb-2 flex items-center gap-2 text-xs">
            <Mic className={`h-3.5 w-3.5 ${labelClass}`} />
            <div className="min-w-0">
              <p className={`truncate font-medium ${titleClass}`}>
                {attachment.filename ?? "Voice note"}
              </p>
              <p className={metaClass}>{formatFileSize(attachment.size)}</p>
            </div>
          </div>
          <audio controls className="w-full">
            <source src={attachment.url} />
          </audio>
        </div>
      );
    }

    return (
      <a
        key={key}
        href={attachment.url}
        target="_blank"
        rel="noreferrer"
        className={`flex items-center gap-3 rounded-2xl px-3 py-3 ${shellClass}`}
      >
        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-zinc-100">
          <FileText className={`h-4 w-4 ${labelClass}`} />
        </div>
        <div className="min-w-0 flex-1">
          <p className={`truncate text-sm font-semibold ${titleClass}`}>
            {attachment.filename ?? "File"}
          </p>
          <p className={`truncate text-xs ${metaClass}`}>
            {getAttachmentDisplayLabel(attachment)}
            {attachment.size ? ` • ${formatFileSize(attachment.size)}` : ""}
          </p>
        </div>
      </a>
    );
  };

  const addPendingAttachments = useCallback((files: FileList | File[]) => {
    const nextAttachments = Array.from(files)
      .filter(Boolean)
      .slice(0, 10)
      .map((file) => ({
        id: `${file.name}-${file.size}-${file.lastModified}-${crypto.randomUUID()}`,
        file,
        url: URL.createObjectURL(file),
        type: resolveAttachmentType(file),
      }));

    if (!nextAttachments.length) return;

    setPendingAttachments((current) =>
      [...current, ...nextAttachments].slice(0, 10),
    );
  }, []);

  const removePendingAttachment = useCallback((id: string) => {
    setPendingAttachments((current) => {
      const target = current.find((attachment) => attachment.id === id);
      if (target) {
        URL.revokeObjectURL(target.url);
      }
      return current.filter((attachment) => attachment.id !== id);
    });
  }, []);

  const clearPendingAttachments = useCallback(() => {
    setPendingAttachments((current) => {
      current.forEach((attachment) => URL.revokeObjectURL(attachment.url));
      return [];
    });
  }, []);

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
        const normalized = (Array.isArray(payload) ? payload : []).map(
          (message: any) => {
            const attachments = normalizeAttachments(message.attachments);
            const text = typeof message.text === "string" ? message.text : "";
            const messageType =
              message.messageType === "media" || message.messageType === "mixed"
                ? message.messageType
                : attachments.length > 0
                  ? text.trim()
                    ? "mixed"
                    : "media"
                  : "text";

            return {
              id: message._id ?? message.id ?? String(Date.now()),
              sender: resolveSenderRole(normalizeSenderId(message.senderId)),
              text,
              createdAt: formatMessageTime(message.createdAt),
              attachments,
              messageType,
            };
          },
        );

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
        const response = await userAPI.getPublicProfileById(
          activeConversation.partnerId,
        );
        if (cancelled) return;

        const profile = response.data ?? null;
        setPartnerAvatarUrl(profile?.avatarUrl ?? "");
        setPartnerDisplayName(
          profile?.fullName ?? activeConversation.name ?? "",
        );
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

    socket.emit("conversation:join", {
      conversationId: activeConversation.conversationId,
    });

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
      message?: {
        _id?: string;
        text?: string;
        createdAt?: string;
        senderId?: string;
        attachments?: unknown[];
        messageType?: "text" | "media" | "mixed";
      };
    }) => {
      const message = payload.message;
      const messageText = message?.text?.trim() ?? "";
      const attachments = normalizeAttachments(message?.attachments);
      const senderId = normalizeSenderId(message?.senderId);
      const currentUserId = user?.keycloakUserId ?? null;

      if (
        payload.conversationId !== activeConversation.conversationId ||
        !message ||
        (!messageText && attachments.length === 0)
      ) {
        return;
      }

      if (
        currentUserId &&
        senderId &&
        String(senderId) === String(currentUserId)
      ) {
        return;
      }

      setMessages((currentMessages) => [
        ...currentMessages,
        ...(message._id &&
        currentMessages.some((item) => item.id === message._id)
          ? []
          : [
              {
                id: message._id ?? String(Date.now()),
                sender: resolveSenderRole(senderId),
                text: messageText,
                createdAt: formatMessageTime(message.createdAt),
                attachments,
                messageType:
                  message.messageType ||
                  (attachments.length
                    ? messageText
                      ? "mixed"
                      : "media"
                    : "text"),
              },
            ]),
      ]);
    };

    socket.on("typing:start", handleTypingStart);
    socket.on("typing:stop", handleTypingStop);
    socket.on("message:new", handleNewMessage);

    return () => {
      socket.emit("conversation:leave", {
        conversationId: activeConversation.conversationId,
      });
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
    return () => {
      pendingAttachments.forEach((attachment) =>
        URL.revokeObjectURL(attachment.url),
      );
    };
  }, [pendingAttachments]);

  useEffect(() => {
    if (!socket || !conversationId) return;

    const text = draftText.trim();

    if (!text) {
      socket.emit("typing:stop", {
        conversationId: activeConversation.conversationId,
      });
      return;
    }

    socket.emit("typing:start", {
      conversationId: activeConversation.conversationId,
    });

    const typingTimeout = window.setTimeout(() => {
      socket.emit("typing:stop", {
        conversationId: activeConversation.conversationId,
      });
    }, 900);

    return () => {
      window.clearTimeout(typingTimeout);
      socket.emit("typing:stop", {
        conversationId: activeConversation.conversationId,
      });
    };
  }, [activeConversation.conversationId, conversationId, draftText, socket]);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!conversationId) return;

    const text = draftText.trim();
    const hasAttachments = pendingAttachments.length > 0;
    if (!text && !hasAttachments) return;

    const tmpId = `tmp-${Date.now()}`;
    const tmpCreatedAt = new Date().toLocaleTimeString([], {
      hour: "2-digit",
      minute: "2-digit",
    });
    const optimisticAttachments: ChatAttachment[] = pendingAttachments.map(
      (attachment) => ({
        url: attachment.url,
        type: attachment.type,
        filename: attachment.file.name,
        mimetype: attachment.file.type,
        size: attachment.file.size,
      }),
    );
    const optimisticMessageType: ChatMessage["messageType"] = hasAttachments
      ? text
        ? "mixed"
        : "media"
      : "text";

    setMessages((currentMessages) => [
      ...currentMessages,
      {
        id: tmpId,
        sender: "guest",
        text,
        createdAt: tmpCreatedAt,
        attachments: optimisticAttachments,
        messageType: optimisticMessageType,
      },
    ]);

    if (draftListingId && text) {
      void fetchListingPreview(draftListingId, extractListingTitle(text)).then(
        (preview) => {
          updateConversationLastMessage(
            activeConversation.conversationId,
            summarizeListingMessage(text, preview.title),
            undefined,
            false,
          );
        },
      );
    } else if (text) {
      updateConversationLastMessage(
        activeConversation.conversationId,
        text,
        undefined,
        false,
      );
    } else if (hasAttachments) {
      updateConversationLastMessage(
        activeConversation.conversationId,
        summarizeConversationPreview({
          lastMessage: {
            text: "",
            attachments: optimisticAttachments,
          },
        }),
        undefined,
        false,
      );
    }

    setDraftText("");

    try {
      socket?.emit("typing:stop", {
        conversationId: activeConversation.conversationId,
      });
    } catch {
      // ignore socket cleanup errors
    }

    setIsSending(true);

    try {
      const payload = new FormData();
      payload.append("conversationId", activeConversation.conversationId);
      if (text) {
        payload.append("text", text);
      }
      pendingAttachments.forEach((attachment) => {
        payload.append("files", attachment.file);
      });

      const res = await sendMessage(payload);
      const serverMsg = res?.data ?? null;

      if (serverMsg && serverMsg._id) {
        const serverCreatedAt = serverMsg.createdAt
          ? new Date(serverMsg.createdAt).toLocaleTimeString([], {
              hour: "2-digit",
              minute: "2-digit",
            })
          : tmpCreatedAt;

        setMessages((curr) =>
          curr.map((message) =>
            message.id === tmpId
              ? {
                  id: serverMsg._id,
                  sender: "guest",
                  text: serverMsg.text ?? text,
                  createdAt: serverCreatedAt,
                  attachments: normalizeAttachments(serverMsg.attachments),
                  messageType:
                    serverMsg.messageType ||
                    (normalizeAttachments(serverMsg.attachments).length
                      ? (serverMsg.text ?? text)
                        ? "mixed"
                        : "media"
                      : "text"),
                }
              : message,
          ),
        );

        const serverPreview = summarizeConversationPreview({
          lastMessage: {
            text: serverMsg.text ?? text,
            attachments: serverMsg.attachments,
          },
        });

        updateConversationLastMessage(
          activeConversation.conversationId,
          serverPreview,
          serverMsg.createdAt ?? serverCreatedAt,
          false,
        );
      }
    } catch (error) {
      setMessages((curr) => curr.filter((message) => message.id !== tmpId));
      console.error("Failed to send message", error);
    } finally {
      clearPendingAttachments();
      setIsSending(false);
    }
  };

  return (
    <main className="h-[calc(100dvh-130px)] overflow-hidden bg-[radial-gradient(circle_at_top_left,rgba(255,56,92,0.06),transparent_32%),linear-gradient(180deg,#fff_0%,#fff_55%,#f8fafc_100%)] px-3 pb-6 pt-4 sm:px-6 lg:px-10">
      <section className="mx-auto flex h-full w-full max-w-7xl flex-col">
        <div className="mb-4 animate-in fade-in slide-in-from-top-2 duration-500 sm:mb-6">
          <p className="text-[11px] font-semibold uppercase tracking-[0.15em] text-zinc-500">
            Guest inbox
          </p>
          <h1 className="mt-1 text-2xl font-semibold text-zinc-900 sm:mt-2 sm:text-4xl">
            Messages
          </h1>
        </div>

        <div className="min-h-0 flex-1 overflow-hidden rounded-2xl border border-zinc-200 bg-white shadow-[0_12px_45px_rgba(15,23,42,0.08)] sm:rounded-3xl">
          <div className="grid h-full min-h-0 grid-cols-1 lg:grid-cols-[340px_1fr]">
            <aside
              className={`min-h-0 border-b border-zinc-200 lg:border-b-0 lg:border-r ${isMobileConversationOpen ? "hidden lg:block" : "block"}`}
            >
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

              <div className="min-h-0 overflow-y-auto lg:h-full">
                <div className="min-h-0">
                  {conversations.length > 0 ? (
                    conversations.map((conversation) => {
                      const isActive =
                        conversation.conversationId ===
                        activeConversation.conversationId;

                      return (
                        <Link
                          key={conversation.id}
                          href={`/guest/messages/${conversation.conversationId}`}
                          className={`group block border-b border-zinc-100 px-4 py-4 text-left transition sm:px-5 ${
                            isActive
                              ? "bg-zinc-50"
                              : conversation.unread
                                ? "bg-rose-50/40 hover:bg-rose-50/60"
                                : "hover:bg-zinc-50"
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
                                <p
                                  className={`truncate text-sm ${conversation.unread ? "font-bold text-zinc-950" : "font-semibold text-zinc-900"}`}
                                >
                                  {conversation.name}
                                </p>
                                <span
                                  className={`shrink-0 text-xs ${conversation.unread ? "font-semibold text-rose-600" : "text-zinc-500"}`}
                                >
                                  {conversation.time}
                                </span>
                              </div>
                              <p
                                className={`truncate text-xs ${conversation.unread ? "font-medium text-zinc-700" : "text-zinc-500"}`}
                              >
                                {conversation.listing}
                              </p>
                              <p
                                className={`mt-1 truncate text-sm ${conversation.unread ? "font-semibold text-zinc-900" : "text-zinc-700"}`}
                              >
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
                    <div className="px-4 py-10 text-sm text-zinc-500">
                      No conversations yet.
                    </div>
                  )}
                </div>
              </div>
            </aside>

            <section
              className={`flex min-h-0 flex-col ${isMobileConversationOpen ? "flex" : "hidden lg:flex"}`}
            >
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
                      <p className="truncate text-base font-semibold text-zinc-900 sm:text-lg">
                        {activeAvatarLabel}
                      </p>
                    </div>
                    <p className="truncate text-xs text-zinc-500 sm:text-sm">
                      {activeConversation.listing}
                    </p>
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

                <div
                  ref={messagesScrollRef}
                  className="relative min-h-0 flex-1 overflow-y-auto pr-2 sm:pr-3"
                >
                  <div className="mx-auto flex max-w-3xl flex-col gap-4 pb-3">
                    {conversationId ? (
                      messages.length > 0 ? (
                        messages.map((message) => {
                          const listingId = extractListingId(message.text);
                          const fallbackTitle = extractListingTitle(
                            message.text,
                          );
                          const attachments = message.attachments ?? [];
                          const hasAttachments = attachments.length > 0;
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
                                <div className="space-y-3">
                                  {message.text ? (
                                    <p className="whitespace-pre-wrap leading-6">
                                      {message.text}
                                    </p>
                                  ) : null}

                                  {hasAttachments ? (
                                    <div className="space-y-3">
                                      {attachments.map((attachment, index) =>
                                        renderAttachment(
                                          attachment,
                                          isGuestMessage,
                                          `${message.id}-${attachment.url}-${index}`,
                                        ),
                                      )}
                                    </div>
                                  ) : null}

                                  {listingId ? (
                                    <div className="space-y-3">
                                      <p
                                        className={`text-xs ${isGuestMessage ? "text-zinc-300" : "text-zinc-500"}`}
                                      >
                                        Shared a room link
                                      </p>
                                      <ListingLinkPreview
                                        listingId={listingId}
                                        fallbackTitle={fallbackTitle}
                                      />
                                      <Link
                                        href={`/rooms/${listingId}`}
                                        className={`inline-flex items-center gap-1 text-xs font-medium underline-offset-2 hover:underline ${
                                          isGuestMessage
                                            ? "text-rose-200 hover:text-white"
                                            : "text-rose-600 hover:text-rose-700"
                                        }`}
                                      >
                                        <Link2 className="h-3.5 w-3.5" />
                                        Open listing
                                      </Link>
                                    </div>
                                  ) : null}
                                </div>
                              </div>

                              <p
                                className={`mt-1 text-[11px] ${isGuestMessage ? "text-right text-zinc-400" : "text-zinc-500"}`}
                              >
                                {message.createdAt}
                              </p>
                            </div>
                          );
                        })
                      ) : (
                        <div className="flex min-h-60 flex-col items-center justify-center rounded-2xl border border-dashed border-zinc-200 bg-zinc-50 px-6 py-8 text-center text-sm text-zinc-500">
                          <p className="font-medium text-zinc-700">
                            No messages in this conversation yet.
                          </p>
                          <p className="mt-1 max-w-md text-xs text-zinc-500">
                            Start with a quick question or send a room link.
                          </p>

                          <div className="mt-5 flex flex-wrap justify-center gap-2">
                            {QUICK_MESSAGE_SUGGESTIONS.map((suggestion) => (
                              <button
                                key={suggestion}
                                type="button"
                                onClick={() => setDraftText(suggestion)}
                                className="rounded-full border border-zinc-200 bg-white px-3 py-2 text-left text-xs font-medium text-zinc-700 transition hover:border-zinc-900 hover:text-zinc-900"
                              >
                                {suggestion}
                              </button>
                            ))}
                          </div>
                        </div>
                      )
                    ) : (
                      <div className="flex min-h-60 items-center justify-center rounded-2xl border border-dashed border-zinc-200 bg-zinc-50 px-6 text-center text-sm text-zinc-500">
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

                {pendingAttachments.length > 0 ? (
                  <div className="mb-3 grid gap-2 sm:grid-cols-2">
                    {pendingAttachments.map((attachment) => (
                      <div
                        key={attachment.id}
                        className="flex items-center gap-3 rounded-2xl border border-zinc-200 bg-zinc-50 px-3 py-3"
                      >
                        <div className="flex h-11 w-11 shrink-0 items-center justify-center overflow-hidden rounded-xl bg-white text-zinc-600">
                          {attachment.type === "image" ? (
                            <Image
                              src={attachment.url}
                              alt={attachment.file.name}
                              width={44}
                              height={44}
                              className="h-full w-full object-cover"
                            />
                          ) : attachment.type === "video" ? (
                            <Video className="h-4 w-4" />
                          ) : attachment.type === "audio" ? (
                            <Mic className="h-4 w-4" />
                          ) : (
                            <FileText className="h-4 w-4" />
                          )}
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-sm font-medium text-zinc-900">
                            {attachment.file.name}
                          </p>
                          <p className="truncate text-xs text-zinc-500">
                            {getAttachmentDisplayLabel({
                              type: attachment.type,
                              url: attachment.url,
                              filename: attachment.file.name,
                              mimetype: attachment.file.type,
                              size: attachment.file.size,
                            })}
                            {attachment.file.size
                              ? ` • ${formatFileSize(attachment.file.size)}`
                              : ""}
                          </p>
                        </div>
                        <button
                          type="button"
                          onClick={() => removePendingAttachment(attachment.id)}
                          className="rounded-full border border-zinc-200 p-2 text-zinc-500 transition hover:border-zinc-900 hover:text-zinc-900"
                          aria-label={`Remove ${attachment.file.name}`}
                        >
                          <X className="h-4 w-4" />
                        </button>
                      </div>
                    ))}
                  </div>
                ) : null}

                <form
                  className="flex items-end gap-2 sm:gap-3"
                  onSubmit={handleSubmit}
                >
                  <input
                    ref={attachmentInputRef}
                    type="file"
                    multiple
                    accept="image/*,video/*,audio/*,application/pdf"
                    className="hidden"
                    onChange={(event) => {
                      if (event.target.files?.length) {
                        addPendingAttachments(event.target.files);
                        event.target.value = "";
                      }
                    }}
                  />
                  <button
                    type="button"
                    onClick={() => attachmentInputRef.current?.click()}
                    className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-zinc-300 text-zinc-600 transition hover:border-zinc-900 hover:text-zinc-900"
                    aria-label="Attach files"
                  >
                    <Paperclip className="h-4 w-4" />
                  </button>
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
                    disabled={
                      isSending ||
                      (!draftText.trim() && pendingAttachments.length === 0) ||
                      !conversationId
                    }
                    className={`inline-flex h-11 items-center gap-2 rounded-xl px-4 text-sm font-medium text-white transition sm:px-5 ${
                      isSending ||
                      (!draftText.trim() && pendingAttachments.length === 0) ||
                      !conversationId
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
                    Room link detected - preview will be sent as a clickable
                    listing card
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
