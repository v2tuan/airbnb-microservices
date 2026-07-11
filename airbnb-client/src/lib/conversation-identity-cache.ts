export type ConversationIdentity = {
  fullName?: string;
  avatarUrl?: string;
};

const CACHE_PREFIX = "airbnb:messages:identity:";

const memoryCache = new Map<string, ConversationIdentity>();

const normalizeKey = (value: string) => value.trim();

const readStorage = (key: string) => {
  if (typeof window === "undefined") return null;

  try {
    const raw = window.sessionStorage.getItem(`${CACHE_PREFIX}${key}`);
    if (!raw) return null;

    const parsed = JSON.parse(raw) as ConversationIdentity;
    if (!parsed || typeof parsed !== "object") return null;

    return {
      fullName:
        typeof parsed.fullName === "string" ? parsed.fullName.trim() : undefined,
      avatarUrl:
        typeof parsed.avatarUrl === "string" ? parsed.avatarUrl.trim() : undefined,
    } satisfies ConversationIdentity;
  } catch {
    return null;
  }
};

export const isLikelyIdentifier = (value: string) => {
  const compact = value.trim();
  if (!compact) return false;
  if (compact.length >= 16 && /^[a-f0-9-]+$/i.test(compact)) return true;
  return /^[A-Za-z0-9_-]{18,}$/.test(compact);
};

export const getCachedConversationIdentity = (key: string) => {
  const normalizedKey = normalizeKey(key);
  if (!normalizedKey) return null;

  const memoryValue = memoryCache.get(normalizedKey);
  if (memoryValue) return memoryValue;

  const storedValue = readStorage(normalizedKey);
  if (storedValue) {
    memoryCache.set(normalizedKey, storedValue);
    return storedValue;
  }

  return null;
};

export const setCachedConversationIdentity = (
  key: string,
  identity: ConversationIdentity,
) => {
  const normalizedKey = normalizeKey(key);
  if (!normalizedKey) return;

  const nextIdentity: ConversationIdentity = {
    fullName:
      typeof identity.fullName === "string" && identity.fullName.trim()
        ? identity.fullName.trim()
        : undefined,
    avatarUrl:
      typeof identity.avatarUrl === "string" && identity.avatarUrl.trim()
        ? identity.avatarUrl.trim()
        : undefined,
  };

  memoryCache.set(normalizedKey, nextIdentity);

  if (typeof window === "undefined") return;

  try {
    window.sessionStorage.setItem(
      `${CACHE_PREFIX}${normalizedKey}`,
      JSON.stringify(nextIdentity),
    );
  } catch {
    // Ignore storage quota and serialization issues.
  }
};

