"use client";

import {
  BedDouble,
  ChevronLeft,
  ChevronRight,
  History,
  ListFilter,
  MessageCircleQuestion,
  Plus,
  SendHorizontal,
  Sparkles,
  ThumbsDown,
  ThumbsUp,
} from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { Dialog as DialogPrimitive } from "radix-ui";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import ReactMarkdown, { type Components } from "react-markdown";
import remarkGfm from "remark-gfm";
import type { ChatbotListingCard } from "@/api/endpoints/chatbot";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import { type ChatMessage, useChatbot } from "@/providers/chatbot-provider";

const AUTO_SCROLL_BOTTOM_THRESHOLD_PX = 96;

const markdownComponents: Components = {
  h1: ({ className, ...props }) => (
    <h1 className={cn("mb-2 text-lg font-bold", className)} {...props} />
  ),
  h2: ({ className, ...props }) => (
    <h2 className={cn("mb-2 text-base font-bold", className)} {...props} />
  ),
  h3: ({ className, ...props }) => (
    <h3 className={cn("mb-2 text-sm font-bold", className)} {...props} />
  ),
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

function formatLabel(value?: string) {
  return value?.replaceAll("_", " ").toLowerCase();
}

function ChatbotListingCardItem({
  listing,
  onAskListing,
}: {
  listing: ChatbotListingCard;
  onAskListing: (listing: ChatbotListingCard) => void;
}) {
  return (
    <article
      className="flex min-h-[330px] w-[78%] min-w-[220px] max-w-[260px] shrink-0 snap-start flex-col overflow-hidden rounded-lg border border-neutral-200 bg-white shadow-sm sm:w-[238px] sm:min-w-[238px]"
      data-chatbot-listing-card
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

      <div className="flex flex-1 flex-col space-y-3 p-3">
        <div>
          <h3 className="line-clamp-2 min-h-10 text-sm font-bold leading-5 text-neutral-950">
            {listing.title}
          </h3>
          <p className="line-clamp-1 text-xs text-neutral-500">
            {listing.location}
          </p>
        </div>

        <div className="space-y-1 text-xs text-neutral-600">
          {listing.maxGuests ? <p>{listing.maxGuests} khách</p> : null}
          <p className="line-clamp-1">
            {[formatLabel(listing.roomType), formatLabel(listing.propertyType)]
              .filter(Boolean)
              .join(" · ")}
          </p>
        </div>

        {listing.priceLabel ? (
          <p className="mt-auto line-clamp-1 text-xs font-semibold text-neutral-950">
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
          <Link href={listing.href}>
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
          Hỏi về phòng này
        </Button>
      </div>
    </article>
  );
}

function ChatbotListingCards({
  listings,
  onAskListing,
}: {
  listings: ChatbotListingCard[];
  onAskListing: (listing: ChatbotListingCard) => void;
}) {
  const scrollContainerRef = useRef<HTMLDivElement | null>(null);
  const [canScrollPrevious, setCanScrollPrevious] = useState(false);
  const [canScrollNext, setCanScrollNext] = useState(false);

  const updateScrollState = useCallback(() => {
    const container = scrollContainerRef.current;

    if (!container) {
      setCanScrollPrevious(false);
      setCanScrollNext(false);
      return;
    }

    const maxScrollLeft = container.scrollWidth - container.clientWidth;

    setCanScrollPrevious(container.scrollLeft > 4);
    setCanScrollNext(container.scrollLeft < maxScrollLeft - 4);
  }, []);

  useEffect(() => {
    updateScrollState();
  });

  useEffect(() => {
    window.addEventListener("resize", updateScrollState);

    return () => {
      window.removeEventListener("resize", updateScrollState);
    };
  }, [updateScrollState]);

  const scrollListingCards = useCallback((direction: "previous" | "next") => {
    const container = scrollContainerRef.current;

    if (!container) return;

    const firstCard = container.querySelector<HTMLElement>(
      "[data-chatbot-listing-card]",
    );
    const cardGap = 12;
    const distance =
      (firstCard?.offsetWidth ?? container.clientWidth * 0.82) + cardGap;

    container.scrollBy({
      left: direction === "previous" ? -distance : distance,
      behavior: "smooth",
    });
  }, []);

  if (listings.length === 0) return null;

  return (
    <div className="mt-4 w-full min-w-0 space-y-3">
      <section
        aria-label="Danh sach phong goi y"
        aria-roledescription="carousel"
        className="relative w-full min-w-0"
      >
        <div
          className="flex w-full snap-x snap-mandatory gap-3 overflow-x-auto scroll-smooth pb-2 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
          onScroll={updateScrollState}
          ref={scrollContainerRef}
        >
          {listings.map((listing) => (
            <ChatbotListingCardItem
              key={listing.id}
              listing={listing}
              onAskListing={onAskListing}
            />
          ))}
        </div>

        <Button
          aria-label="Cuon danh sach phong sang trai"
          className="absolute left-1 top-1/2 z-10 size-8 -translate-y-1/2 rounded-full border-neutral-200 bg-white/95 text-neutral-950 shadow-md hover:bg-white disabled:hidden"
          disabled={!canScrollPrevious}
          onClick={() => scrollListingCards("previous")}
          size="icon-sm"
          type="button"
          variant="outline"
        >
          <ChevronLeft className="size-4" />
        </Button>

        <Button
          aria-label="Cuon danh sach phong sang phai"
          className="absolute right-1 top-1/2 z-10 size-8 -translate-y-1/2 rounded-full border-neutral-200 bg-white/95 text-neutral-950 shadow-md hover:bg-white disabled:hidden"
          disabled={!canScrollNext}
          onClick={() => scrollListingCards("next")}
          size="icon-sm"
          type="button"
          variant="outline"
        >
          <ChevronRight className="size-4" />
        </Button>
      </section>

      <Button
        asChild
        className="h-9 px-0 font-semibold text-[#006ce4]"
        variant="ghost"
      >
        <Link href="/search">
          <ListFilter className="size-4" />
          Xem thêm trên trang tìm kiếm
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
          "text-sm leading-relaxed",
          isUser
            ? "max-w-[92%] rounded-2xl rounded-br-md bg-[#d9d9d9] px-4 py-3 text-neutral-950"
            : "w-full min-w-0",
        )}
      >
        {isUser ? (
          <p className="whitespace-pre-wrap">{message.content}</p>
        ) : (
          <div className="space-y-2">
            {message.content ? (
              <div className="max-w-[92%] rounded-2xl rounded-tl-md bg-[#f3f3f3] px-4 py-3 text-neutral-900">
                <ChatMarkdown content={message.content} />
                {message.isStreaming ? (
                  <span className="ml-1 inline-flex size-1.5 animate-pulse rounded-full bg-neutral-500" />
                ) : null}
              </div>
            ) : (
              <div className="inline-flex max-w-[92%] items-center gap-1.5 rounded-2xl rounded-tl-md bg-[#f3f3f3] px-4 py-3">
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
  const {
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
  } = useChatbot();
  const scrollRef = useRef<HTMLDivElement | null>(null);
  const scrollFrameRef = useRef<number | null>(null);
  const shouldAutoScrollRef = useRef(true);

  const latestMessageLayoutKey = useMemo(() => {
    const latestMessage = messages[messages.length - 1];

    if (!latestMessage) return "";

    return [
      latestMessage.id,
      latestMessage.content.length,
      latestMessage.listings?.length ?? 0,
      latestMessage.isStreaming ? "streaming" : "done",
    ].join(":");
  }, [messages]);

  const isNearChatBottom = useCallback(() => {
    const container = scrollRef.current;

    if (!container) return true;

    return (
      container.scrollHeight - container.scrollTop - container.clientHeight <
      AUTO_SCROLL_BOTTOM_THRESHOLD_PX
    );
  }, []);

  const handleMessagesScroll = useCallback(() => {
    shouldAutoScrollRef.current = isNearChatBottom();
  }, [isNearChatBottom]);

  useEffect(() => {
    if (!open) return;
    if (!latestMessageLayoutKey) return;
    if (!shouldAutoScrollRef.current && isStreaming) return;

    if (scrollFrameRef.current !== null) {
      cancelAnimationFrame(scrollFrameRef.current);
    }

    scrollFrameRef.current = requestAnimationFrame(() => {
      const container = scrollRef.current;

      scrollFrameRef.current = null;

      if (!container) return;

      // During streaming, avoid stacking smooth-scroll animations on every
      // token flush. This keeps the reading position stable like ChatGPT.
      container.scrollTo({
        top: container.scrollHeight,
        behavior: isStreaming ? "auto" : "smooth",
      });
    });
  }, [latestMessageLayoutKey, open, isStreaming]);

  useEffect(() => {
    return () => {
      if (scrollFrameRef.current !== null) {
        cancelAnimationFrame(scrollFrameRef.current);
      }
    };
  }, []);

  const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    shouldAutoScrollRef.current = true;
    void sendMessage(input);
  };

  const handleNewChat = () => {
    shouldAutoScrollRef.current = true;
    startNewChat();
  };

  const handleAskListing = (listing: ChatbotListingCard) => {
    shouldAutoScrollRef.current = true;
    askListing(listing);
  };

  const handleInputKeyDown = (
    event: React.KeyboardEvent<HTMLTextAreaElement>,
  ) => {
    if (event.key === "Enter" && !event.shiftKey) {
      event.preventDefault();

      if (canSubmit) {
        shouldAutoScrollRef.current = true;
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
              Chat AI
            </DialogPrimitive.Title>

            <div className="flex items-center gap-1">
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

          <div
            className="flex-1 overflow-y-auto px-4 py-5"
            onScroll={handleMessagesScroll}
            ref={scrollRef}
          >
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
              Nội dung AI có thể chưa chính xác. Vui lòng kiểm tra lại thông tin
              trước khi đặt phòng.
            </p>
          </form>
        </DialogPrimitive.Content>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  );
}
