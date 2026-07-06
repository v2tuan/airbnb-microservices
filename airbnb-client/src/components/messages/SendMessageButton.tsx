"use client"

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useSelector } from "react-redux";
import { createOrGetConversation } from "@/api/message";
import { selectCurrentUser } from "@/features/auth/authSelectors";

export default function SendMessageButton({ otherUserId }: { otherUserId: string }) {
  const [isLoading, setIsLoading] = useState(false);
  const router = useRouter();
  const currentUser = useSelector(selectCurrentUser);

  const currentUserId =
    currentUser?.keycloakUserId ?? null;

  if (!currentUserId || !otherUserId) {
    return null;
  }

  if (currentUserId && otherUserId && String(currentUserId) === String(otherUserId)) {
    return null;
  }

  const extractConversationId = (res: any): string | null => {
    if (!res) return null;
    const d = res.data ?? res;
    // common shapes: { data: { _id } }, { _id }, { conversation: { _id } }, { data: { conversation: { _id } } }
    return (
      d?._id ||
      d?.id ||
      d?.conversationId ||
      d?.conversation?._id ||
      d?.data?._id ||
      d?.data?.conversation?._id ||
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

      if (conversationId) {
        // navigate using path segment so URL becomes /guest/messages/:id
        router.push(`/guest/messages/${conversationId}`);
      } else {
        console.warn("No conversation id returned from backend", res);
        const triedUrl = `${process.env.NEXT_PUBLIC_API_BASE_URL}${process.env.NEXT_PUBLIC_PREFIX}/conversations`;
        window.alert(`Không thể mở cuộc hội thoại: server trả dữ liệu không hợp lệ. Request tried: ${triedUrl}`);
        router.push(`/guest/messages`);
      }
    } catch (error: any) {
      console.error("Failed to create/get conversation", error);
      const status = error?.response?.status ?? "(no status)";
      const data = error?.response?.data ?? error?.message ?? "(no data)";
      const triedUrl = `${process.env.NEXT_PUBLIC_API_BASE_URL}${process.env.NEXT_PUBLIC_PREFIX}/conversations`;
      window.alert(`Failed to open conversation (status ${status}). Request: ${triedUrl}. Response: ${JSON.stringify(data)}`);
      router.push(`/guest/messages`);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <button
      type="button"
      onClick={handleClick}
      disabled={isLoading}
      className={`mt-6 inline-flex w-full items-center justify-center gap-2 rounded-full px-5 py-3.5 text-sm font-semibold text-white transition ${
        isLoading ? "bg-zinc-700/60 cursor-not-allowed" : "bg-[#ff385c] hover:bg-[#e61e4d]"
      }`}
    >
      {isLoading ? "Opening..." : "Send message"}
    </button>
  );
}
