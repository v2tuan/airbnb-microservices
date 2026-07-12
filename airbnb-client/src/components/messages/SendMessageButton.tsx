"use client";

import { MessageSquare } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { useSelector } from "react-redux";
import { createOrGetConversation } from "@/api/message";
import { selectCurrentUser } from "@/features/auth/authSelectors";

type ConversationQueryValue = string | number | boolean | null | undefined;

export default function SendMessageButton({
  otherUserId,
  className = "",
  label = "Send message",
  compact = false,
  conversationQuery,
}: {
  otherUserId: string;
  className?: string;
  label?: string;
  compact?: boolean;
  conversationQuery?: Record<string, ConversationQueryValue>;
}) {
  const [isLoading, setIsLoading] = useState(false);
  const router = useRouter();
  const currentUser = useSelector(selectCurrentUser);

  const currentUserId = currentUser?.keycloakUserId ?? null;

  if (!currentUserId || !otherUserId) {
    return null;
  }

  if (
    currentUserId &&
    otherUserId &&
    String(currentUserId) === String(otherUserId)
  ) {
    return null;
  }

  const buildConversationQueryString = () => {
    if (!conversationQuery) return "";

    const params = new URLSearchParams();
    Object.entries(conversationQuery).forEach(([key, value]) => {
      if (value === null || value === undefined) return;

      const normalizedValue =
        typeof value === "boolean"
          ? value
            ? "true"
            : "false"
          : String(value).trim();

      if (!normalizedValue) return;
      params.set(key, normalizedValue);
    });

    const queryString = params.toString();
    return queryString ? `?${queryString}` : "";
  };

  const isRecord = (value: unknown): value is Record<string, unknown> => {
    return typeof value === "object" && value !== null;
  };

  const extractConversationId = (res: unknown): string | null => {
    if (!res) return null;

    const data = isRecord(res) && "data" in res ? res.data : res;
    const d = isRecord(data) ? data : null;
    return (
      (typeof d?._id === "string" ? d._id : null) ||
      (typeof d?.id === "string" ? d.id : null) ||
      (typeof d?.conversationId === "string" ? d.conversationId : null) ||
      (isRecord(d?.conversation) && typeof d.conversation._id === "string"
        ? d.conversation._id
        : null) ||
      null
    );
  };

  const handleClick = async () => {
    if (isLoading) return;
    setIsLoading(true);

    try {
      const res = await createOrGetConversation(otherUserId);
      console.debug("createOrGetConversation response:", res);

      const conversationId = extractConversationId(res);
      const queryString = buildConversationQueryString();

      if (conversationId) {
        router.push(`/guest/messages/${conversationId}${queryString}`);
      } else {
        console.warn("No conversation id returned from backend", res);
        const triedUrl = `${process.env.NEXT_PUBLIC_API_BASE_URL}${process.env.NEXT_PUBLIC_PREFIX}/conversations`;
        window.alert(
          `Cannot open the conversation: the server returned invalid data. Request tried: ${triedUrl}`,
        );
        router.push(`/guest/messages${queryString}`);
      }
    } catch (error: unknown) {
      console.error("Failed to create/get conversation", error);
      const response =
        isRecord(error) && isRecord(error.response) ? error.response : null;
      const status =
        response &&
        "status" in response &&
        response.status !== undefined &&
        response.status !== null
          ? String(response.status)
          : "(no status)";
      const data =
        response && "data" in response
          ? (response.data ?? "(no data)")
          : isRecord(error) && typeof error.message === "string"
            ? error.message
            : "(no data)";
      const triedUrl = `${process.env.NEXT_PUBLIC_API_BASE_URL}${process.env.NEXT_PUBLIC_PREFIX}/conversations`;
      const queryString = buildConversationQueryString();
      window.alert(
        `Failed to open conversation (status ${status}). Request: ${triedUrl}. Response: ${JSON.stringify(data)}`,
      );
      router.push(`/guest/messages${queryString}`);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <button
      type="button"
      onClick={handleClick}
      disabled={isLoading}
      className={`inline-flex items-center justify-center gap-2 rounded-full text-sm font-semibold text-white transition ${
        compact ? "px-4 py-2.5" : "w-full px-5 py-3.5"
      } ${
        isLoading
          ? "cursor-not-allowed bg-zinc-700/60"
          : "bg-[#ff385c] hover:bg-[#e61e4d]"
      } ${className}`}
    >
      <MessageSquare className="h-4 w-4" />
      {isLoading ? "Opening..." : label}
    </button>
  );
}
