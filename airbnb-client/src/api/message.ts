import apiClient from "./client";

const prefix = process.env.NEXT_PUBLIC_PREFIX ?? "";

export const sendMessage = (payload: FormData | Record<string, any>) =>
  apiClient.post(`${prefix}/messages`, payload);

// Backend lấy userId từ JWT token, không cần pass userId
export const fetchConversations = () =>
  apiClient.get(`${prefix}/conversations`);

export const fetchMessages = (conversationId: string) =>
  apiClient.get(`${prefix}/messages/${conversationId}`);

export const fetchConversationMedia = (
  conversationId: string,
  params?: { type?: string; page?: number; limit?: number },
) =>
  apiClient.get(`${prefix}/messages/${conversationId}/media`, {
    params,
  });

export const createOrGetConversation = (otherUserId: string) =>
  apiClient.post(`${prefix}/conversations`, { otherUserId });

export const fetchConversationById = (conversationId: string) =>
  apiClient.get(`${prefix}/conversations/${conversationId}`);
