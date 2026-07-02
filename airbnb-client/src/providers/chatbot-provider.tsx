"use client";

import {
  createContext,
  type Dispatch,
  type ReactNode,
  type SetStateAction,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import {
  ChatbotAuthenticationError,
  type ChatbotBookingConfirmation,
  type ChatbotListingCard,
  streamChatbotResponse,
} from "@/api/endpoints/chatbot";

export type ChatMessage = {
  id: string;
  role: "assistant" | "user";
  content: string;
  listings?: ChatbotListingCard[];
  bookingConfirmation?: ChatbotBookingConfirmation;
  isStreaming?: boolean;
};

type ChatbotContextValue = {
  open: boolean;
  setOpen: Dispatch<SetStateAction<boolean>>;
  messages: ChatMessage[];
  input: string;
  setInput: Dispatch<SetStateAction<string>>;
  isStreaming: boolean;
  canSubmit: boolean;
  sendMessage: (rawMessage: string) => Promise<void>;
  startNewChat: () => void;
  askListing: (listing: ChatbotListingCard) => void;
};

const CHATBOT_CONVERSATION_ID_STORAGE_KEY = "airbnb_chatbot_conversation_id";
const STREAM_TOKEN_FLUSH_INTERVAL_MS = 32;

const ChatbotContext = createContext<ChatbotContextValue | null>(null);

const createMessageId = () => {
  return `${Date.now()}-${Math.random().toString(16).slice(2)}`;
};

const createInitialMessages = (): ChatMessage[] => [
  {
    id: createMessageId(),
    role: "assistant",
    content:
      "Xin chào! Mình là **Chat AI**. Bạn có thể hỏi mình về nơi lưu trú, khu vực nên ở hoặc cách lên kế hoạch chuyến đi.",
  },
];

const readStoredConversationId = () => {
  if (typeof window === "undefined") return null;

  return sessionStorage.getItem(CHATBOT_CONVERSATION_ID_STORAGE_KEY);
};

const storeConversationId = (conversationId: string | null) => {
  if (typeof window === "undefined") return;

  // Giữ id theo browser tab để khi chuyển route vẫn gửi đúng conversation
  // cho backend, nhưng không kéo một cuộc chat rất cũ sang tab/ngày khác.
  if (conversationId) {
    sessionStorage.setItem(CHATBOT_CONVERSATION_ID_STORAGE_KEY, conversationId);
    return;
  }

  sessionStorage.removeItem(CHATBOT_CONVERSATION_ID_STORAGE_KEY);
};

export function ChatbotProvider({ children }: { children: ReactNode }) {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>(() =>
    createInitialMessages(),
  );
  const [conversationId, setConversationId] = useState<string | null>(() =>
    readStoredConversationId(),
  );
  const [input, setInput] = useState("");
  const [isStreaming, setIsStreaming] = useState(false);
  const abortRef = useRef<AbortController | null>(null);
  const activeAssistantIdRef = useRef<string | null>(null);
  const pendingTokenBufferRef = useRef("");
  const tokenFlushTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const canSubmit = useMemo(() => {
    return input.trim().length > 0 && !isStreaming;
  }, [input, isStreaming]);

  const updateAssistantMessage = useCallback(
    (assistantId: string, updater: (message: ChatMessage) => ChatMessage) => {
      setMessages((currentMessages) =>
        currentMessages.map((message) =>
          message.id === assistantId ? updater(message) : message,
        ),
      );
    },
    [],
  );

  const clearTokenFlushTimer = useCallback(() => {
    if (tokenFlushTimerRef.current === null) return;

    clearTimeout(tokenFlushTimerRef.current);
    tokenFlushTimerRef.current = null;
  }, []);

  const flushPendingAssistantTokens = useCallback(
    (assistantId: string) => {
      const pendingToken = pendingTokenBufferRef.current;

      if (!pendingToken) return;

      pendingTokenBufferRef.current = "";
      updateAssistantMessage(assistantId, (message) => ({
        ...message,
        content: `${message.content}${pendingToken}`,
      }));
    },
    [updateAssistantMessage],
  );

  const scheduleTokenFlush = useCallback(
    (assistantId: string) => {
      if (tokenFlushTimerRef.current !== null) return;

      // SSE thường trả nhiều chunk rất nhỏ. Gom token theo nhịp ngắn để UI
      // không re-render Markdown trên từng ký tự.
      tokenFlushTimerRef.current = setTimeout(() => {
        tokenFlushTimerRef.current = null;
        flushPendingAssistantTokens(assistantId);
      }, STREAM_TOKEN_FLUSH_INTERVAL_MS);
    },
    [flushPendingAssistantTokens],
  );

  const resetTokenBuffer = useCallback(() => {
    clearTokenFlushTimer();
    pendingTokenBufferRef.current = "";
  }, [clearTokenFlushTimer]);

  const sendMessage = useCallback(
    async (rawMessage: string) => {
      const trimmedMessage = rawMessage.trim();

      if (!trimmedMessage || isStreaming) return;

      abortRef.current?.abort();
      resetTokenBuffer();

      const controller = new AbortController();
      const userMessage: ChatMessage = {
        id: createMessageId(),
        role: "user",
        content: trimmedMessage,
      };
      const assistantMessage: ChatMessage = {
        id: createMessageId(),
        role: "assistant",
        content: "",
        isStreaming: true,
      };

      abortRef.current = controller;
      activeAssistantIdRef.current = assistantMessage.id;
      setInput("");
      setIsStreaming(true);
      setMessages((currentMessages) => [
        ...currentMessages,
        userMessage,
        assistantMessage,
      ]);

      try {
        await streamChatbotResponse({
          message: trimmedMessage,
          conversationId,
          signal: controller.signal,
          onConversationId: (nextConversationId) => {
            if (activeAssistantIdRef.current !== assistantMessage.id) return;

            setConversationId(nextConversationId);
            storeConversationId(nextConversationId);
          },
          onToken: (token) => {
            if (activeAssistantIdRef.current !== assistantMessage.id) return;

            pendingTokenBufferRef.current += token;
            scheduleTokenFlush(assistantMessage.id);
          },
          onListings: (listings) => {
            if (activeAssistantIdRef.current !== assistantMessage.id) return;

            updateAssistantMessage(assistantMessage.id, (message) => ({
              ...message,
              listings,
            }));
          },
          onBookingConfirmation: (bookingConfirmation) => {
            if (activeAssistantIdRef.current !== assistantMessage.id) return;

            updateAssistantMessage(assistantMessage.id, (message) => ({
              ...message,
              bookingConfirmation,
            }));
          },
          onError: (message) => {
            if (activeAssistantIdRef.current !== assistantMessage.id) return;

            clearTokenFlushTimer();
            flushPendingAssistantTokens(assistantMessage.id);
            updateAssistantMessage(assistantMessage.id, (currentMessage) => ({
              ...currentMessage,
              content: currentMessage.content || message,
            }));
          },
        });
      } catch (error) {
        if (
          !(error instanceof DOMException && error.name === "AbortError") &&
          activeAssistantIdRef.current === assistantMessage.id
        ) {
          const fallbackMessage =
            error instanceof ChatbotAuthenticationError
              ? error.message
              : "Xin lỗi, mình chưa thể kết nối Chat AI lúc này. Bạn thử lại sau nhé.";

          clearTokenFlushTimer();
          flushPendingAssistantTokens(assistantMessage.id);
          updateAssistantMessage(assistantMessage.id, (message) => ({
            ...message,
            content: message.content || fallbackMessage,
          }));
        }
      } finally {
        if (activeAssistantIdRef.current === assistantMessage.id) {
          clearTokenFlushTimer();
          flushPendingAssistantTokens(assistantMessage.id);
          updateAssistantMessage(assistantMessage.id, (message) => ({
            ...message,
            isStreaming: false,
          }));
          activeAssistantIdRef.current = null;
          abortRef.current = null;
          setIsStreaming(false);
        }
      }
    },
    [
      clearTokenFlushTimer,
      conversationId,
      flushPendingAssistantTokens,
      isStreaming,
      resetTokenBuffer,
      scheduleTokenFlush,
      updateAssistantMessage,
    ],
  );

  const startNewChat = useCallback(() => {
    abortRef.current?.abort();
    resetTokenBuffer();
    activeAssistantIdRef.current = null;
    abortRef.current = null;
    setIsStreaming(false);
    setInput("");
    setConversationId(null);
    storeConversationId(null);
    setMessages(createInitialMessages());
  }, [resetTokenBuffer]);

  const askListing = useCallback(
    (listing: ChatbotListingCard) => {
      void sendMessage(`Tôi muốn biết thêm về ${listing.title}.`);
    },
    [sendMessage],
  );

  useEffect(() => {
    return () => {
      abortRef.current?.abort();

      if (tokenFlushTimerRef.current !== null) {
        clearTimeout(tokenFlushTimerRef.current);
      }
    };
  }, []);

  const value = useMemo<ChatbotContextValue>(
    () => ({
      open,
      setOpen,
      messages,
      input,
      setInput,
      isStreaming,
      canSubmit,
      sendMessage,
      startNewChat,
      askListing,
    }),
    [
      open,
      messages,
      input,
      isStreaming,
      canSubmit,
      sendMessage,
      startNewChat,
      askListing,
    ],
  );

  return (
    <ChatbotContext.Provider value={value}>{children}</ChatbotContext.Provider>
  );
}

export function useChatbot() {
  const context = useContext(ChatbotContext);

  if (!context) {
    throw new Error("useChatbot must be used inside ChatbotProvider.");
  }

  return context;
}
