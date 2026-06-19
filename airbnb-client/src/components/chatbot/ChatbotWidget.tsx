"use client";

import {
  BedDouble,
  ChevronLeft,
  History,
  ListFilter,
  MessageCircleQuestion,
  Plus,
  SendHorizontal,
  Sparkles,
  Star,
  ThumbsDown,
  ThumbsUp,
} from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { Dialog as DialogPrimitive } from "radix-ui";
import { useEffect, useMemo, useRef, useState } from "react";
import ReactMarkdown, { type Components } from "react-markdown";
import remarkGfm from "remark-gfm";
import {
  type ChatbotListingCard,
  type ChatbotStreamMode,
  streamChatbotResponse,
} from "@/api/endpoints/chatbot";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";

type ChatMessage = {
  id: string;
  role: "assistant" | "user";
  content: string;
  listings?: ChatbotListingCard[];
  isStreaming?: boolean;
};

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

const markdownComponents: Components = {
  p: ({ className, ...props }) => (
    <p className={cn("mb-2 leading-relaxed last:mb-0", className)} {...props} />
  ),
  strong: ({ className, ...props }) => (
    <strong className={cn("font-semibold", className)} {...props} />
  ),
  ul: ({ className, ...props }) => (
    <ul className={cn("my-2 list-disc space-y-1 pl-5", className)} {...props} />
  ),
  ol: ({ className, ...props }) => (
    <ol
      className={cn("my-2 list-decimal space-y-1 pl-5", className)}
      {...props}
    />
  ),
  li: ({ className, ...props }) => (
    <li className={cn("pl-0.5 leading-relaxed", className)} {...props} />
  ),
  a: ({ className, ...props }) => (
    <a
      className={cn("font-medium text-[#006ce4] underline-offset-2", className)}
      rel="noreferrer"
      target="_blank"
      {...props}
    />
  ),
  code: ({ className, ...props }) => (
    <code
      className={cn(
        "rounded bg-black/5 px-1 py-0.5 font-mono text-[0.9em]",
        className,
      )}
      {...props}
    />
  ),
  pre: ({ className, ...props }) => (
    <pre
      className={cn(
        "my-3 overflow-x-auto rounded-lg bg-neutral-950 p-3 text-neutral-50",
        className,
      )}
      {...props}
    />
  ),
  table: ({ className, ...props }) => (
    <div className="my-3 overflow-x-auto">
      <table
        className={cn("w-full min-w-80 border-collapse text-left", className)}
        {...props}
      />
    </div>
  ),
  th: ({ className, ...props }) => (
    <th
      className={cn(
        "border border-neutral-300 px-2 py-1 font-semibold",
        className,
      )}
      {...props}
    />
  ),
  td: ({ className, ...props }) => (
    <td
      className={cn("border border-neutral-300 px-2 py-1", className)}
      {...props}
    />
  ),
};

function ChatMarkdown({ content }: { content: string }) {
  return (
    <ReactMarkdown components={markdownComponents} remarkPlugins={[remarkGfm]}>
      {content}
    </ReactMarkdown>
  );
}

function ChatbotListingCards({
  listings,
  onAskListing,
}: {
  listings: ChatbotListingCard[];
  onAskListing: (listing: ChatbotListingCard) => void;
}) {
  if (listings.length === 0) return null;

  return (
    <div className="mt-4 space-y-3">
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        {listings.map((listing) => (
          <article
            className="overflow-hidden rounded-lg border border-neutral-200 bg-white shadow-sm"
            key={listing.id}
          >
            <div className="relative aspect-[4/3] bg-neutral-100">
              <Image
                src={listing.imageUrl}
                alt={listing.title}
                fill
                className="object-cover"
                sizes="(max-width: 640px) 92vw, 250px"
              />
              {listing.badge ? (
                <span className="absolute left-2 top-2 rounded-full bg-white px-2 py-1 text-[11px] font-semibold text-neutral-950 shadow-sm">
                  {listing.badge}
                </span>
              ) : null}
            </div>

            <div className="space-y-3 p-3">
              <div>
                <div className="flex items-center gap-0.5 text-[#febb02]">
                  {Array.from({ length: 5 }).map((_, index) => (
                    <Star
                      className="size-3 fill-current"
                      key={`${listing.id}-star-${index}`}
                    />
                  ))}
                </div>
                <h3 className="mt-1 line-clamp-2 min-h-10 text-sm font-bold leading-5 text-neutral-950">
                  {listing.title}
                </h3>
                <p className="line-clamp-1 text-xs text-neutral-500">
                  {listing.location}
                </p>
              </div>

              <div className="flex items-center gap-2">
                {typeof listing.rating === "number" ? (
                  <span className="rounded bg-[#003b95] px-1.5 py-1 text-xs font-bold text-white">
                    {listing.rating.toFixed(1)}
                  </span>
                ) : null}
                <span className="line-clamp-1 text-xs text-neutral-600">
                  {listing.reviewCount
                    ? `Tuyệt hảo · ${listing.reviewCount} đánh giá`
                    : listing.priceLabel}
                </span>
              </div>

              {listing.priceLabel ? (
                <p className="line-clamp-1 text-xs font-semibold text-neutral-950">
                  {listing.priceLabel}
                </p>
              ) : null}
            </div>

            <div className="border-t border-neutral-200">
              <Button
                asChild
                className="h-10 w-full justify-start rounded-none px-3 text-[#006ce4]"
                variant="ghost"
              >
                <Link href={listing.href ?? "/search"}>
                  <BedDouble className="size-4" />
                  Xem chi tiết
                </Link>
              </Button>
              <Button
                className="h-10 w-full justify-start rounded-none border-t border-neutral-100 px-3 text-[#006ce4]"
                onClick={() => onAskListing(listing)}
                type="button"
                variant="ghost"
              >
                <MessageCircleQuestion className="size-4" />
                Đặt câu hỏi
              </Button>
            </div>
          </article>
        ))}
      </div>

      <Button
        asChild
        className="h-9 px-0 font-semibold text-[#006ce4]"
        variant="ghost"
      >
        <Link href="/search">
          <ListFilter className="size-4" />
          Xem tất cả kết quả
        </Link>
      </Button>
    </div>
  );
}

function MessageBubble({
  message,
  onAskListing,
}: {
  message: ChatMessage;
  onAskListing: (listing: ChatbotListingCard) => void;
}) {
  const isUser = message.role === "user";

  return (
    <div
      className={cn("flex w-full", isUser ? "justify-end" : "justify-start")}
    >
      <div
        className={cn(
          "max-w-[92%] text-sm leading-relaxed",
          isUser
            ? "rounded-2xl rounded-br-md bg-[#d9d9d9] px-4 py-3 text-neutral-950"
            : "w-full",
        )}
      >
        {isUser ? (
          <p className="whitespace-pre-wrap">{message.content}</p>
        ) : (
          <div className="space-y-2">
            {message.content ? (
              <div className="rounded-2xl rounded-tl-md bg-[#f3f3f3] px-4 py-3 text-neutral-900">
                <ChatMarkdown content={message.content} />
                {message.isStreaming ? (
                  <span className="ml-1 inline-flex size-1.5 animate-pulse rounded-full bg-neutral-500" />
                ) : null}
              </div>
            ) : (
              <div className="inline-flex items-center gap-1.5 rounded-2xl rounded-tl-md bg-[#f3f3f3] px-4 py-3">
                <span className="size-1.5 animate-bounce rounded-full bg-neutral-500 [animation-delay:-0.2s]" />
                <span className="size-1.5 animate-bounce rounded-full bg-neutral-500 [animation-delay:-0.1s]" />
                <span className="size-1.5 animate-bounce rounded-full bg-neutral-500" />
              </div>
            )}

            <ChatbotListingCards
              listings={message.listings ?? []}
              onAskListing={onAskListing}
            />
          </div>
        )}
      </div>
    </div>
  );
}

export default function ChatbotWidget() {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>(() =>
    createInitialMessages(),
  );
  const [input, setInput] = useState("");
  const [isStreaming, setIsStreaming] = useState(false);
  const [streamMode, setStreamMode] = useState<ChatbotStreamMode>("live");
  const scrollRef = useRef<HTMLDivElement | null>(null);
  const abortRef = useRef<AbortController | null>(null);
  const activeAssistantIdRef = useRef<string | null>(null);

  const canSubmit = useMemo(() => {
    return input.trim().length > 0 && !isStreaming;
  }, [input, isStreaming]);

  useEffect(() => {
    const lastMessage = messages.at(-1);

    if (!open) return;
    if (!lastMessage) return;

    scrollRef.current?.scrollTo({
      top: scrollRef.current.scrollHeight,
      behavior: "smooth",
    });
  }, [messages, open]);

  useEffect(() => {
    return () => {
      abortRef.current?.abort();
    };
  }, []);

  const updateAssistantMessage = (
    assistantId: string,
    updater: (message: ChatMessage) => ChatMessage,
  ) => {
    setMessages((currentMessages) =>
      currentMessages.map((message) =>
        message.id === assistantId ? updater(message) : message,
      ),
    );
  };

  const sendMessage = async (rawMessage: string) => {
    const trimmedMessage = rawMessage.trim();

    if (!trimmedMessage || isStreaming) return;

    abortRef.current?.abort();

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
        signal: controller.signal,
        onModeChange: setStreamMode,
        onToken: (token) => {
          if (activeAssistantIdRef.current !== assistantMessage.id) return;

          updateAssistantMessage(assistantMessage.id, (message) => ({
            ...message,
            content: `${message.content}${token}`,
          }));
        },
        onListings: (listings) => {
          if (activeAssistantIdRef.current !== assistantMessage.id) return;

          updateAssistantMessage(assistantMessage.id, (message) => ({
            ...message,
            listings,
          }));
        },
      });
    } catch (error) {
      if (
        !(error instanceof DOMException && error.name === "AbortError") &&
        activeAssistantIdRef.current === assistantMessage.id
      ) {
        updateAssistantMessage(assistantMessage.id, (message) => ({
          ...message,
          content:
            message.content ||
            "Xin lỗi, mình chưa thể kết nối Chat AI lúc này. Bạn thử lại sau nhé.",
        }));
      }
    } finally {
      if (activeAssistantIdRef.current === assistantMessage.id) {
        updateAssistantMessage(assistantMessage.id, (message) => ({
          ...message,
          isStreaming: false,
        }));
        activeAssistantIdRef.current = null;
        abortRef.current = null;
        setIsStreaming(false);
      }
    }
  };

  const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    void sendMessage(input);
  };

  const handleNewChat = () => {
    abortRef.current?.abort();
    activeAssistantIdRef.current = null;
    abortRef.current = null;
    setIsStreaming(false);
    setInput("");
    setMessages(createInitialMessages());
    setStreamMode("live");
  };

  const handleAskListing = (listing: ChatbotListingCard) => {
    void sendMessage(`Tôi muốn biết thêm về ${listing.title}.`);
  };

  const handleInputKeyDown = (
    event: React.KeyboardEvent<HTMLTextAreaElement>,
  ) => {
    if (event.key === "Enter" && !event.shiftKey) {
      event.preventDefault();

      if (canSubmit) {
        void sendMessage(input);
      }
    }
  };

  return (
    <DialogPrimitive.Root onOpenChange={setOpen} open={open}>
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <DialogPrimitive.Trigger asChild>
              <Button
                className="fixed bottom-6 right-6 z-40 h-12 gap-2 bg-[#006ce4] px-4 text-white shadow-lg hover:bg-[#0057b8]"
                size="lg"
                type="button"
              >
                <Sparkles className="size-4" />
                <span className="hidden sm:inline">Chat AI</span>
              </Button>
            </DialogPrimitive.Trigger>
          </TooltipTrigger>
          <TooltipContent side="left" sideOffset={8}>
            Mở Chat AI
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>

      <DialogPrimitive.Portal>
        <DialogPrimitive.Overlay className="fixed inset-0 z-50 bg-black/55 data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:animate-in data-[state=open]:fade-in-0" />
        <DialogPrimitive.Content
          className="fixed inset-y-0 right-0 z-50 flex h-dvh w-full flex-col border-l border-neutral-200 bg-white shadow-2xl outline-none data-[state=closed]:animate-out data-[state=closed]:slide-out-to-right-10 data-[state=open]:animate-in data-[state=open]:slide-in-from-right-10 sm:max-w-[480px] lg:max-w-[560px]"
          onOpenAutoFocus={(event) => event.preventDefault()}
        >
          <header className="relative flex h-16 shrink-0 items-center justify-between border-b border-neutral-200 px-4">
            <DialogPrimitive.Close asChild>
              <Button
                aria-label="Đóng Chat AI"
                size="icon-sm"
                type="button"
                variant="ghost"
              >
                <ChevronLeft className="size-5" />
              </Button>
            </DialogPrimitive.Close>

            <DialogPrimitive.Title className="absolute left-1/2 -translate-x-1/2 text-base font-bold text-neutral-950">
              Chat AI (beta)
            </DialogPrimitive.Title>

            <div className="flex items-center gap-1">
              {streamMode === "mock" ? (
                <span className="hidden rounded-full bg-amber-100 px-2 py-1 text-[11px] font-semibold text-amber-800 sm:inline">
                  Mock
                </span>
              ) : null}
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      aria-label="Lịch sử chat"
                      size="icon-sm"
                      type="button"
                      variant="ghost"
                    >
                      <History className="size-5" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent side="bottom">Lịch sử chat</TooltipContent>
                </Tooltip>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      aria-label="Tạo cuộc trò chuyện mới"
                      onClick={handleNewChat}
                      size="icon-sm"
                      type="button"
                      variant="ghost"
                    >
                      <Plus className="size-5" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent side="bottom">Chat mới</TooltipContent>
                </Tooltip>
              </TooltipProvider>
            </div>
          </header>

          <div className="flex-1 overflow-y-auto px-4 py-5" ref={scrollRef}>
            <div className="mx-auto flex w-full max-w-[520px] flex-col gap-4">
              {messages.map((message) => (
                <MessageBubble
                  key={message.id}
                  message={message}
                  onAskListing={handleAskListing}
                />
              ))}

              {!isStreaming && messages.length > 1 ? (
                <div className="flex justify-end gap-2 pr-1 text-[#006ce4]">
                  <Button
                    aria-label="Đánh giá tốt"
                    className="size-8"
                    size="icon-sm"
                    type="button"
                    variant="ghost"
                  >
                    <ThumbsUp className="size-4" />
                  </Button>
                  <Button
                    aria-label="Đánh giá chưa tốt"
                    className="size-8"
                    size="icon-sm"
                    type="button"
                    variant="ghost"
                  >
                    <ThumbsDown className="size-4" />
                  </Button>
                </div>
              ) : null}
            </div>
          </div>

          <form
            className="shrink-0 border-t border-neutral-200 bg-white px-4 py-4"
            onSubmit={handleSubmit}
          >
            <div className="relative mx-auto max-w-[520px]">
              <Textarea
                aria-label="Soạn tin nhắn"
                className="min-h-16 max-h-32 rounded-md border-neutral-300 bg-white pb-3 pr-12 text-sm shadow-none focus-visible:border-[#006ce4] focus-visible:ring-[#006ce4]/20"
                disabled={isStreaming}
                onChange={(event) => setInput(event.target.value)}
                onKeyDown={handleInputKeyDown}
                placeholder="Soạn tin nhắn"
                rows={1}
                value={input}
              />
              <Button
                aria-label="Gửi tin nhắn"
                className="absolute bottom-3 right-3 size-8 text-[#006ce4] hover:bg-[#eaf3ff]"
                disabled={!canSubmit}
                size="icon-sm"
                type="submit"
                variant="ghost"
              >
                <SendHorizontal className="size-5" />
              </Button>
            </div>
            <p className="mx-auto mt-3 max-w-[520px] text-center text-xs text-neutral-500">
              Output may be inaccurate. Read{" "}
              <Link className="font-medium text-[#006ce4]" href="/">
                privacy & usage terms
              </Link>
              .
            </p>
          </form>
        </DialogPrimitive.Content>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  );
}
