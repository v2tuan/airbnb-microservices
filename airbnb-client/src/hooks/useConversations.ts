import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { fetchConversations } from "@/api/message";
import { notificationAPI } from "@/api/endpoints/notification";
import { useAuth } from "@/hooks/useAuth";
import { useSocket } from "@/hooks/useSocket";

export type Conversation = {
  id: string;
  conversationId: string;
  partnerId: string;
  name: string;
  avatar: string;
  listing: string;
  time: string;
  preview: string;
  unread?: boolean;
};

type ConversationRecord = {
  _id?: string;
  participants?: unknown[];
  lastMessage?: {
    text?: string;
    attachments?: unknown[];
    messageType?: string;
  };
  participantProfiles?: Record<string, { fullName?: string; avatarUrl?: string }>;
  updatedAt?: string;
};

const getParticipantId = (participant: any) => {
  if (!participant) return "";
  if (typeof participant === "string") return participant;
  return participant._id ?? participant.id ?? "";
};

const normalizeUserId = (value: unknown) => {
  if (!value) return "";
  if (typeof value === "string") return value;
  if (typeof value === "object") {
    const record = value as Record<string, any>;
    return String(record._id ?? record.id ?? record.senderId ?? record.userId ?? "");
  }
  return String(value);
};

const formatConversationTime = (value?: string | Date) => {
  const date = value ? new Date(value) : new Date();
  if (Number.isNaN(date.getTime())) {
    return String(value ?? "");
  }
  return date.toLocaleString();
};

const truncatePreview = (value: string, maxLength = 56) => {
  const compact = value.replace(/\s+/g, " ").trim();
  if (compact.length <= maxLength) return compact;
  return `${compact.slice(0, maxLength - 1).trimEnd()}...`;
};

const summarizeAttachmentPreview = (attachments: unknown[]) => {
  if (!Array.isArray(attachments) || attachments.length === 0) return "";

  const typeCounts = attachments.reduce<Record<string, number>>((counts, attachment) => {
    const type = String((attachment as Record<string, any>)?.type || "file");
    counts[type] = (counts[type] || 0) + 1;
    return counts;
  }, {});

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

const summarizeConversationPreview = (conv: ConversationRecord) => {
  const lastMessage = conv?.lastMessage ?? {};
  const text = typeof lastMessage.text === "string" ? lastMessage.text.trim() : "";
  const attachments = Array.isArray(lastMessage.attachments) ? lastMessage.attachments : [];
  const messageType = typeof lastMessage.messageType === "string" ? lastMessage.messageType : "";

  if (messageType === "media" && attachments.length === 0) {
    return "Sent media";
  }

  if (text && attachments.length > 0) {
    return truncatePreview(`${text} • ${summarizeAttachmentPreview(attachments)}`);
  }

  if (text) {
    return truncatePreview(text);
  }

  const attachmentSummary = summarizeAttachmentPreview(attachments);
  if (attachmentSummary) {
    return attachmentSummary;
  }

  return messageType === "media" ? "Sent media" : "No messages yet";
};

type UseConversationsOptions = {
  activeConversationId?: string | null;
};

export const useConversations = (options: UseConversationsOptions = {}) => {
  const { user } = useAuth();
  const { socket } = useSocket();
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const unreadConversationIdsRef = useRef<Set<string>>(new Set());
  const activeConversationId = options.activeConversationId ?? null;

  const currentUserIds = useMemo(() => {
    return new Set([user?.keycloakUserId].map(normalizeUserId).filter(Boolean));
  }, [user?.keycloakUserId]);

  const currentUserId = currentUserIds.values().next().value ?? null;
  const keycloakUserId = currentUserId;
  const cacheKey = keycloakUserId ? `airbnb:messages:conversations:${keycloakUserId}` : null;

  const updateConversationLastMessage = useCallback(
    (
      conversationId: string,
      text: string,
      createdAt?: string | Date,
      markUnread = true,
    ) => {
      const preview = text.trim();
      if (!conversationId || !preview) return;

      const time = formatConversationTime(createdAt);

      setConversations((current) => {
        const index = current.findIndex((item) => item.conversationId === conversationId);
        if (index === -1) return current;

        const updated = {
          ...current[index],
          preview,
          time,
          unread: markUnread ? true : current[index].unread,
        };

        const next = [...current];
        next.splice(index, 1);
        next.unshift(updated);
        return next;
      });
    },
    [],
  );

  const clearUnreadConversation = useCallback((conversationId: string) => {
    if (!conversationId) return;

    unreadConversationIdsRef.current.delete(conversationId);

    setConversations((current) =>
      current.map((conversation) =>
        conversation.conversationId === conversationId
          ? { ...conversation, unread: false }
          : conversation,
      ),
    );
  }, []);

  useEffect(() => {
    if (!keycloakUserId) {
      setLoading(true);
      return;
    }

    let cancelled = false;

    if (typeof window !== "undefined" && cacheKey) {
      try {
        const cachedRaw = window.sessionStorage.getItem(cacheKey);
        if (cachedRaw) {
          const cached = JSON.parse(cachedRaw);
          if (Array.isArray(cached) && cached.length > 0) {
            setConversations(cached);
          }
        }
      } catch {
        // ignore cache parse errors
      }
    }

    const loadConversations = async () => {
      try {
        setError(null);
        setLoading(true);

        const conversationsRequest = fetchConversations();
        const unreadRequest = notificationAPI.getMyNotifications(true, 100).catch(() => null);

        const response = await conversationsRequest;
        if (cancelled) return;

        const normalized = (response.data || []).map((conv: ConversationRecord) => {
          const participants = Array.isArray(conv.participants) ? conv.participants : [];
          const otherParticipant = participants.find((participant: any) => {
            const pid = getParticipantId(participant);
            return pid && !currentUserIds.has(String(pid));
          });

          const partnerId = getParticipantId(otherParticipant) || "";
          const participantRecord =
            otherParticipant && typeof otherParticipant === "object"
              ? (otherParticipant as Record<string, any>)
              : null;
          const participantProfiles = (conv.participantProfiles ?? {}) as Record<
            string,
            { fullName?: string; avatarUrl?: string }
          >;
          const participantProfile = participantProfiles[partnerId];

          return {
            id: conv._id ?? partnerId,
            conversationId: conv._id ?? partnerId,
            partnerId,
            name:
              participantProfile?.fullName ||
              participantRecord?.fullName ||
              participantRecord?.userName ||
              participantRecord?.name ||
              "Unknown",
            avatar:
              participantProfile?.avatarUrl ||
              participantRecord?.avatar ||
              participantRecord?.avatarUrl ||
              "",
            listing: "Listing",
            time: formatConversationTime(conv.updatedAt),
            preview: summarizeConversationPreview(conv),
            unread: false,
          };
        });

        setConversations(normalized);
        if (typeof window !== "undefined" && cacheKey) {
          try {
            window.sessionStorage.setItem(cacheKey, JSON.stringify(normalized));
          } catch {
            // ignore storage quota / serialization issues
          }
        }
        setLoading(false);

        void unreadRequest.then((unreadResult) => {
          if (cancelled) return;

          const unreadConversationIds = new Set<string>();
          if (unreadResult?.data) {
            const unreadItems = unreadResult.data.items ?? [];
            unreadItems
              .filter((item: any) => {
                const senderId = normalizeUserId(item.meta?.senderId);
                return !senderId || !currentUserIds.has(senderId);
              })
              .map((item: any) => String(item.meta?.conversationId ?? ""))
              .filter(Boolean)
              .forEach((conversationId: string) => unreadConversationIds.add(conversationId));
          }

          unreadConversationIdsRef.current = unreadConversationIds;

          setConversations((current) =>
            current.map((conversation) =>
              unreadConversationIds.has(conversation.conversationId)
                ? { ...conversation, unread: true }
                : conversation,
            ),
          );
        });
      } catch (err) {
        if (!cancelled) {
          console.error("Failed to fetch conversations:", err);
          setError(err instanceof Error ? err.message : "Failed to fetch conversations");
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    };

    void loadConversations();

    return () => {
      cancelled = true;
    };
  }, [keycloakUserId, currentUserIds, cacheKey]);

  useEffect(() => {
    if (!cacheKey || conversations.length === 0 || typeof window === "undefined") {
      return;
    }

    try {
      window.sessionStorage.setItem(cacheKey, JSON.stringify(conversations));
    } catch {
      // ignore storage quota / serialization issues
    }
  }, [cacheKey, conversations]);

  useEffect(() => {
    if (!activeConversationId) return;

    let cancelled = false;

    const syncReadState = async () => {
      try {
        const unreadResponse = await notificationAPI.getMyNotifications(true, 100);
        const unreadItems = unreadResponse.data.items ?? [];
        const matchingItems = unreadItems.filter(
          (item) =>
            String(item.meta?.conversationId ?? "") === activeConversationId &&
            !currentUserIds.has(normalizeUserId(item.meta?.senderId)),
        );

        await Promise.all(matchingItems.map((item) => notificationAPI.markRead(item.id)));

        if (!cancelled) {
          clearUnreadConversation(activeConversationId);
        }
      } catch {
        if (!cancelled) {
          clearUnreadConversation(activeConversationId);
        }
      }
    };

    void syncReadState();

    return () => {
      cancelled = true;
    };
  }, [activeConversationId, clearUnreadConversation, currentUserIds]);

  useEffect(() => {
    if (!socket) return;

    const handleNewMessage = (payload: {
      conversationId?: string;
      message?: { text?: string; createdAt?: string; senderId?: unknown };
    }) => {
      const text = payload.message?.text?.trim() ?? "";
      if (!payload.conversationId || !text) return;

      const senderId = normalizeUserId(payload.message?.senderId);
      const markUnread =
        payload.conversationId !== activeConversationId &&
        !currentUserIds.has(senderId);

      updateConversationLastMessage(
        payload.conversationId,
        text,
        payload.message?.createdAt,
        markUnread,
      );
    };

    socket.on("message:new", handleNewMessage);

    const handleNewNotification = (payload: {
      type?: string;
      message?: string;
      createdAt?: string;
      payload?: { text?: string };
      meta?: Record<string, unknown>;
    }) => {
      if (payload.type !== "MESSAGE") return;

      const conversationId = String(payload.meta?.conversationId ?? "");
      const text = (payload.payload?.text ?? payload.message ?? "").trim();
      if (!conversationId || !text) return;

      const senderId = normalizeUserId(payload.meta?.senderId);
      const markUnread =
        conversationId !== activeConversationId &&
        !currentUserIds.has(senderId);

      updateConversationLastMessage(
        conversationId,
        text,
        payload.createdAt,
        markUnread,
      );
    };

    socket.on("notification:new", handleNewNotification);

    return () => {
      socket.off("message:new", handleNewMessage);
      socket.off("notification:new", handleNewNotification);
    };
  }, [activeConversationId, currentUserIds, socket, updateConversationLastMessage]);

  return {
    conversations,
    loading,
    error,
    updateConversationLastMessage,
    clearUnreadConversation,
  };
};
