import { authStorage } from "@/lib/auth-storage";

export type ChatbotListingCard = {
  id: string;
  listingId: string;
  title: string;
  location: string;
  imageUrl: string;
  priceLabel?: string;
  href: string;
  badge?: string;
  maxGuests?: number;
  roomType?: string;
  propertyType?: string;
  instantBook?: boolean;
};

export type ChatbotStreamOptions = {
  message: string;
  signal?: AbortSignal;
  onToken: (token: string) => void;
  onListings?: (listings: ChatbotListingCard[]) => void;
  onError?: (message: string) => void;
};

type StreamPayload = {
  token?: string;
  delta?: string;
  content?: string;
  text?: string;
  answer?: string;
  listings?: unknown;
  data?: unknown;
};

type SseFrame = {
  event: string;
  data: string;
};

type AuthRefreshResponse = {
  access_token?: string;
  accessToken?: string;
  data?: {
    access_token?: string;
    accessToken?: string;
  };
};

export class ChatbotAuthenticationError extends Error {
  constructor(message = "Bạn cần đăng nhập để sử dụng Chat AI.") {
    super(message);
    this.name = "ChatbotAuthenticationError";
  }
}

const fallbackImage =
  "https://images.unsplash.com/photo-1566073771259-6a8506099945?q=80&w=1200&auto=format&fit=crop";

const isAbortError = (error: unknown) => {
  return error instanceof DOMException && error.name === "AbortError";
};

const isRecord = (value: unknown): value is Record<string, unknown> => {
  return typeof value === "object" && value !== null;
};

const toStringValue = (value: unknown) => {
  return typeof value === "string" && value.trim().length > 0
    ? value.trim()
    : null;
};

const toNumberValue = (value: unknown) => {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value !== "string") return null;

  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
};

const formatCurrency = (amount: number, currency = "VND") => {
  return new Intl.NumberFormat("vi-VN", {
    style: "currency",
    currency,
    maximumFractionDigits: 0,
  }).format(amount);
};

const getApiBaseUrl = () => {
  return (process.env.NEXT_PUBLIC_API_BASE_URL ?? "").replace(/\/+$/, "");
};

const getApiPrefix = () => {
  const prefix = process.env.NEXT_PUBLIC_PREFIX ?? "/api/v1";
  return prefix.startsWith("/") ? prefix : `/${prefix}`;
};

const getChatbotStreamUrl = () => {
  return `${getApiBaseUrl()}${getApiPrefix()}/chatbot/stream`;
};

const getRefreshUrl = () => {
  return `${getApiBaseUrl()}${getApiPrefix()}/users/auth/refresh`;
};

const extractAccessToken = (payload: AuthRefreshResponse | null) => {
  return (
    payload?.data?.access_token ??
    payload?.data?.accessToken ??
    payload?.access_token ??
    payload?.accessToken ??
    null
  );
};

const refreshAccessToken = async () => {
  const response = await fetch(getRefreshUrl(), {
    method: "POST",
    headers: {
      Accept: "application/json",
      "Content-Type": "application/json",
    },
    body: "{}",
    credentials: "include",
  });

  if (!response.ok) return null;

  const payload = (await response
    .json()
    .catch(() => null)) as AuthRefreshResponse | null;
  const token = extractAccessToken(payload);

  if (token) {
    authStorage.setAccessToken(token);
  }

  return token;
};

const normalizeListing = (value: unknown): ChatbotListingCard | null => {
  if (!isRecord(value)) return null;

  const listingId =
    toStringValue(value.listingId) ?? toStringValue(value.id) ?? null;
  if (!listingId) return null;

  const title =
    toStringValue(value.title) ?? toStringValue(value.name) ?? "Nơi lưu trú";
  const imageUrl =
    toStringValue(value.imageUrl) ??
    toStringValue(value.coverPhoto) ??
    toStringValue(value.coverImageUrl) ??
    toStringValue(value.thumbnailUrl) ??
    fallbackImage;
  const city = toStringValue(value.city);
  const country = toStringValue(value.country);
  const basePrice = toNumberValue(value.basePrice);
  const currency = toStringValue(value.currency) ?? "VND";
  const instantBook = value.instantBook === true;

  return {
    id: listingId,
    listingId,
    title,
    location:
      toStringValue(value.location) ??
      [city, country].filter(Boolean).join(", ") ??
      "Việt Nam",
    imageUrl,
    priceLabel:
      toStringValue(value.priceLabel) ??
      (basePrice !== null
        ? `${formatCurrency(basePrice, currency)}/đêm`
        : undefined),
    href: `/rooms/${encodeURIComponent(listingId)}`,
    badge:
      toStringValue(value.badge) ?? (instantBook ? "Instant Book" : undefined),
    maxGuests: toNumberValue(value.maxGuests) ?? undefined,
    roomType: toStringValue(value.roomType) ?? undefined,
    propertyType: toStringValue(value.propertyType) ?? undefined,
    instantBook,
  };
};

const normalizeListings = (value: unknown): ChatbotListingCard[] => {
  if (!Array.isArray(value)) return [];

  return value
    .map((listing) => normalizeListing(listing))
    .filter((listing): listing is ChatbotListingCard => Boolean(listing));
};

const emitLegacyPayload = (
  data: string,
  options: Pick<ChatbotStreamOptions, "onToken" | "onListings">,
) => {
  const trimmed = data.trim();
  if (trimmed === "[DONE]") return;

  if (trimmed.startsWith("{") && trimmed.endsWith("}")) {
    try {
      const payload = JSON.parse(trimmed) as StreamPayload;
      const listings = normalizeListings(payload.listings ?? payload.data);

      if (listings.length > 0) {
        options.onListings?.(listings);
      }

      const token =
        payload.token ??
        payload.delta ??
        payload.content ??
        payload.text ??
        payload.answer;

      if (typeof token === "string") {
        options.onToken(token);
      }

      return;
    } catch {
      options.onToken(data);
      return;
    }
  }

  options.onToken(data);
};

const parseSseFrame = (frame: string): SseFrame | null => {
  let event = "message";
  const dataLines: string[] = [];

  for (const rawLine of frame.split("\n")) {
    if (rawLine.startsWith("event:")) {
      event = rawLine.slice("event:".length).trim() || "message";
      continue;
    }

    if (rawLine.startsWith("data:")) {
      const rawData = rawLine.slice("data:".length);
      dataLines.push(rawData.startsWith(" ") ? rawData.slice(1) : rawData);
    }
  }

  if (dataLines.length === 0) {
    const rawFrame = frame.trim();
    return rawFrame ? { event: "message", data: rawFrame } : null;
  }

  return {
    event,
    data: dataLines.join("\n"),
  };
};

const readSseFrame = (
  frame: string,
  options: Pick<ChatbotStreamOptions, "onToken" | "onListings" | "onError">,
) => {
  const parsedFrame = parseSseFrame(frame);
  if (!parsedFrame) return;

  if (parsedFrame.event === "done" || parsedFrame.data.trim() === "[DONE]") {
    return;
  }

  if (parsedFrame.event === "error") {
    options.onError?.(parsedFrame.data);
    return;
  }

  if (parsedFrame.event === "listing_cards") {
    const listings = normalizeListings(JSON.parse(parsedFrame.data));
    if (listings.length > 0) {
      options.onListings?.(listings);
    }
    return;
  }

  // Backend mới gửi event `message` là token Markdown thuần. Nhánh legacy giữ lại
  // để client vẫn chịu được payload JSON cũ nếu môi trường chưa deploy đồng bộ.
  emitLegacyPayload(parsedFrame.data, options);
};

const consumeSseStream = async (
  body: ReadableStream<Uint8Array>,
  options: Pick<
    ChatbotStreamOptions,
    "signal" | "onToken" | "onListings" | "onError"
  >,
) => {
  const reader = body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";

  while (true) {
    if (options.signal?.aborted) {
      throw new DOMException("The stream was aborted.", "AbortError");
    }

    const { value, done } = await reader.read();
    if (done) break;

    buffer += decoder.decode(value, { stream: true }).replace(/\r\n/g, "\n");

    let frameEnd = buffer.indexOf("\n\n");
    while (frameEnd !== -1) {
      const frame = buffer.slice(0, frameEnd);
      buffer = buffer.slice(frameEnd + 2);
      readSseFrame(frame, options);
      frameEnd = buffer.indexOf("\n\n");
    }
  }

  const remaining = `${buffer}${decoder.decode()}`.trim();
  if (remaining.length > 0) {
    readSseFrame(remaining, options);
  }
};

const requestChatbotStream = async (
  options: ChatbotStreamOptions,
  token: string,
) => {
  return fetch(getChatbotStreamUrl(), {
    method: "POST",
    headers: {
      Accept: "text/event-stream",
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({ message: options.message }),
    credentials: "include",
    signal: options.signal,
  });
};

export const streamChatbotResponse = async (
  options: ChatbotStreamOptions,
): Promise<void> => {
  let token = authStorage.getAccessToken();

  if (!token) {
    throw new ChatbotAuthenticationError();
  }

  let response = await requestChatbotStream(options, token);

  if (response.status === 401) {
    token = await refreshAccessToken();

    if (!token) {
      throw new ChatbotAuthenticationError();
    }

    response = await requestChatbotStream(options, token);
  }

  const contentType = response.headers.get("content-type") ?? "";

  if (!response.ok) {
    if (response.status === 401 || response.status === 403) {
      throw new ChatbotAuthenticationError();
    }

    throw new Error("Chatbot stream endpoint is not available.");
  }

  if (!response.body || !contentType.includes("text/event-stream")) {
    throw new Error("Chatbot response is not a valid SSE stream.");
  }

  try {
    await consumeSseStream(response.body, options);
  } catch (error) {
    if (isAbortError(error) || options.signal?.aborted) {
      throw error;
    }

    throw error;
  }
};
