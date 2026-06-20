export type ChatbotStreamMode = "live" | "mock";

export type ChatbotListingCard = {
  id: string;
  title: string;
  location: string;
  imageUrl: string;
  rating?: number;
  reviewCount?: number;
  priceLabel?: string;
  href?: string;
  badge?: string;
};

export type ChatbotStreamOptions = {
  message: string;
  signal?: AbortSignal;
  onToken: (token: string) => void;
  onListings?: (listings: ChatbotListingCard[]) => void;
  onModeChange?: (mode: ChatbotStreamMode) => void;
};

type StreamPayload = {
  type?: string;
  token?: string;
  delta?: string;
  content?: string;
  text?: string;
  answer?: string;
  listings?: unknown;
  data?: unknown;
};

const fallbackImage =
  "https://images.unsplash.com/photo-1566073771259-6a8506099945?q=80&w=1200&auto=format&fit=crop";

const mockListings: ChatbotListingCard[] = [
  {
    id: "mock-riverside-suite",
    title: "Riverside Suite Saigon",
    location: "TP. Hồ Chí Minh, Quận 1",
    imageUrl:
      "https://images.unsplash.com/photo-1566073771259-6a8506099945?q=80&w=1200&auto=format&fit=crop",
    rating: 9.1,
    reviewCount: 284,
    priceLabel: "Từ 1.250.000đ/đêm",
    href: "/search?city=Ho%20Chi%20Minh",
    badge: "Gần trung tâm",
  },
  {
    id: "mock-garden-resort",
    title: "Garden Pool Resort",
    location: "Đà Nẵng, Ngũ Hành Sơn",
    imageUrl:
      "https://images.unsplash.com/photo-1582719478250-c89cae4dc85b?q=80&w=1200&auto=format&fit=crop",
    rating: 8.8,
    reviewCount: 167,
    priceLabel: "Từ 1.780.000đ/đêm",
    href: "/search?city=Da%20Nang",
    badge: "Hồ bơi riêng",
  },
];

const isAbortError = (error: unknown) => {
  return error instanceof DOMException && error.name === "AbortError";
};

const isRecord = (value: unknown): value is Record<string, unknown> => {
  return typeof value === "object" && value !== null;
};

const toStringValue = (value: unknown) => {
  return typeof value === "string" && value.trim().length > 0 ? value : null;
};

const toNumberValue = (value: unknown) => {
  return typeof value === "number" && Number.isFinite(value) ? value : null;
};

const formatCurrency = (amount: number, currency = "VND") => {
  return new Intl.NumberFormat("vi-VN", {
    style: "currency",
    currency,
    maximumFractionDigits: 0,
  }).format(amount);
};

const getChatbotStreamUrl = () => {
  const baseUrl = process.env.NEXT_PUBLIC_API_BASE_URL ?? "";
  const prefix = process.env.NEXT_PUBLIC_PREFIX ?? "/api/v1";
  const normalizedBaseUrl = baseUrl.replace(/\/+$/, "");
  const normalizedPrefix = prefix.startsWith("/") ? prefix : `/${prefix}`;

  return `${normalizedBaseUrl}${normalizedPrefix}/chatbot/stream`;
};

const normalizeListing = (value: unknown): ChatbotListingCard | null => {
  if (!isRecord(value)) return null;

  const id = toStringValue(value.id) ?? toStringValue(value.listingId);
  const title =
    toStringValue(value.title) ?? toStringValue(value.name) ?? "Nơi lưu trú";
  const imageUrl =
    toStringValue(value.imageUrl) ??
    toStringValue(value.coverImageUrl) ??
    toStringValue(value.thumbnailUrl) ??
    fallbackImage;
  const city = toStringValue(value.city);
  const country = toStringValue(value.country);
  const location =
    toStringValue(value.location) ||
    [city, country].filter(Boolean).join(", ") ||
    "Việt Nam";
  const basePrice = toNumberValue(value.basePrice);
  const currency = toStringValue(value.currency) ?? "VND";
  const priceLabel =
    toStringValue(value.priceLabel) ??
    (basePrice ? `${formatCurrency(basePrice, currency)}/đêm` : undefined);

  return {
    id: id ?? title,
    title,
    location,
    imageUrl,
    rating: toNumberValue(value.rating) ?? undefined,
    reviewCount: toNumberValue(value.reviewCount) ?? undefined,
    priceLabel,
    href:
      toStringValue(value.href) ??
      (id ? `/rooms/${encodeURIComponent(id)}` : "/search"),
    badge: toStringValue(value.badge) ?? undefined,
  };
};

const normalizeListings = (value: unknown): ChatbotListingCard[] => {
  if (!Array.isArray(value)) return [];

  return value
    .map((listing) => normalizeListing(listing))
    .filter((listing): listing is ChatbotListingCard => Boolean(listing));
};

const emitPayload = (
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

const readSseFrame = (
  frame: string,
  options: Pick<ChatbotStreamOptions, "onToken" | "onListings">,
) => {
  const lines = frame.split("\n");
  const dataLines = lines
    .filter((line) => line.startsWith("data:"))
    .map((line) => line.slice("data:".length));

  if (dataLines.length === 0) {
    const rawFrame = frame.trim();

    if (rawFrame.length > 0) {
      emitPayload(rawFrame, options);
    }

    return;
  }

  emitPayload(dataLines.join("\n"), options);
};

const consumeSseStream = async (
  body: ReadableStream<Uint8Array>,
  options: Pick<ChatbotStreamOptions, "signal" | "onToken" | "onListings">,
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

const createMockResponse = (message: string) => {
  const normalizedMessage = message
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/đ/g, "d");
  const destination = normalizedMessage.includes("da nang")
    ? "Đà Nẵng"
    : normalizedMessage.includes("nha trang")
      ? "Nha Trang"
      : normalizedMessage.includes("ha noi")
        ? "Hà Nội"
        : "TP. Hồ Chí Minh";

  return `Mình tìm được một vài gợi ý phù hợp cho chuyến đi đến **${destination}**.

**Tiêu chí nên ưu tiên**
- Vị trí thuận tiện để di chuyển và gần khu ăn uống.
- Điểm đánh giá từ khách trước đó từ 8.5 trở lên.
- Chính sách hủy linh hoạt nếu lịch trình có thể thay đổi.

Bên dưới là một số lựa chọn mẫu để bạn kiểm tra UI listing cards trong chat.`;
};

const sleep = (duration: number) =>
  new Promise((resolve) => window.setTimeout(resolve, duration));

const streamMockChatbotResponse = async (options: ChatbotStreamOptions) => {
  const response = createMockResponse(options.message);
  const tokens = response.match(/\S+\s*/g) ?? [response];
  let listingsEmitted = false;

  for (const [index, token] of tokens.entries()) {
    if (options.signal?.aborted) {
      throw new DOMException("The stream was aborted.", "AbortError");
    }

    if (!listingsEmitted && index > 24) {
      options.onListings?.(mockListings);
      listingsEmitted = true;
    }

    options.onToken(token);
    await sleep(24);
  }

  if (!listingsEmitted) {
    options.onListings?.(mockListings);
  }
};

export const streamChatbotResponse = async (
  options: ChatbotStreamOptions,
): Promise<ChatbotStreamMode> => {
  const forceMock = process.env.NEXT_PUBLIC_CHATBOT_MOCK_STREAMING === "true";

  if (forceMock) {
    options.onModeChange?.("mock");
    await streamMockChatbotResponse(options);
    return "mock";
  }

  try {
    const response = await fetch(getChatbotStreamUrl(), {
      method: "POST",
      headers: {
        Accept: "text/event-stream",
        "Content-Type": "application/json",
        Authorization: `Bearer eyJhbGciOiJSUzI1NiIsInR5cCIgOiAiSldUIiwia2lkIiA6ICJ5dm1TVHRCbkxsakhaTHVSS3Y3eUtvSDJkeG5YcUxHeTRYYWpKWS12a2RRIn0.eyJleHAiOjE3ODE4OTg2ODUsImlhdCI6MTc4MTg5Njk0NSwianRpIjoib25ydHJvOjNkMjRjNzE5LWU4NjctNjc4MS0zZGVjLTE2NWE4ZDUyNDg2MiIsImlzcyI6Imh0dHA6Ly9sb2NhbGhvc3Q6ODA4MC9yZWFsbXMvYWlyYm5iIiwiYXVkIjoiYWNjb3VudCIsInN1YiI6ImUwNTg4ZDU3LTJjNzMtNDNiNy1iMGY1LWQ1OTUyZDkzODU0YiIsInR5cCI6IkJlYXJlciIsImF6cCI6InVzZXJfc2VydmljZSIsInNpZCI6IkgyZkJ2b3NNOFdhLUVTWTU4T1ZxQTlKZSIsImFjciI6IjEiLCJhbGxvd2VkLW9yaWdpbnMiOlsiKiJdLCJyZWFsbV9hY2Nlc3MiOnsicm9sZXMiOlsib2ZmbGluZV9hY2Nlc3MiLCJkZWZhdWx0LXJvbGVzLWFpcmJuYiIsInVtYV9hdXRob3JpemF0aW9uIiwiVVNFUiJdfSwicmVzb3VyY2VfYWNjZXNzIjp7ImFjY291bnQiOnsicm9sZXMiOlsibWFuYWdlLWFjY291bnQiLCJtYW5hZ2UtYWNjb3VudC1saW5rcyIsInZpZXctcHJvZmlsZSJdfX0sInNjb3BlIjoib3BlbmlkIGVtYWlsIHByb2ZpbGUiLCJlbWFpbF92ZXJpZmllZCI6ZmFsc2UsIm5hbWUiOiJKYW1lcyBCb25kIiwicHJlZmVycmVkX3VzZXJuYW1lIjoiaGVsbG8iLCJnaXZlbl9uYW1lIjoiSmFtZXMiLCJmYW1pbHlfbmFtZSI6IkJvbmQiLCJlbWFpbCI6InZvdmFudHVhbjc3MDJAZ21haWwuY29tIn0.VrPPCi5YLEVCoaiQ3A8XHu75SeoC_d-HFS9sRJ4JpulzTBRkp0ZZBdc-aFBk8MJvqSRgxMUxIS-cOqJUcqM_HSUJvAekbJkrMhA6vIUVizd99rx757Z8U5KjPKXIAwVDqonjxINIQqX8zoXACe3eyPr_7MfskW7iaKE0HHKLyDgiceGWvIY5YukMLl4KJAIXC-20fIf57MMA-mASz02HejgK5lDpSC287svjaCgSsgHYqV1iiR0gksBMnSSi80H5hga9i5EXBZA7QhYcJWKr6kmiHiMX5c8f5LmxP5Kaqoh1DmAg_NCiK0rpIbyixAcYFWv-Fq5Y0ijRTUi3kj-6NA`,
      },
      body: JSON.stringify({ message: options.message }),
      credentials: "include",
      signal: options.signal,
    });

    const contentType = response.headers.get("content-type") ?? "";

    if (
      !response.ok ||
      !response.body ||
      !contentType.includes("text/event-stream")
    ) {
      throw new Error("Chatbot stream endpoint is not available.");
    }

    options.onModeChange?.("live");
    await consumeSseStream(response.body, options);

    return "live";
  } catch (error) {
    if (isAbortError(error) || options.signal?.aborted) {
      throw error;
    }

    options.onModeChange?.("mock");
    await streamMockChatbotResponse(options);

    return "mock";
  }
};
