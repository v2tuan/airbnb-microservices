import axios, { type AxiosResponse } from "axios";
import { authStorage } from "@/lib/auth-storage";

const notificationBaseURL =
  process.env.NEXT_PUBLIC_NOTIFICATION_SERVICE_URL ||
  "http://localhost:8084/notification";

const notificationClient = axios.create({
  baseURL: notificationBaseURL,
  timeout: 15000,
});

notificationClient.interceptors.request.use((config) => {
  const token = authStorage.getAccessToken();
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

export interface NotificationItem {
  id: string;
  type: string;
  title: string;
  message: string;
  meta?: Record<string, unknown>;
  read: boolean;
  createdAt?: string;
}

type NotificationListResponse = {
  items?: NotificationItem[];
  totalUnread?: number;
};

type UnreadCountResponse = {
  count?: number;
};

export const notificationAPI = {
  getMyNotifications: (
    unreadOnly = false,
    limit = 20,
  ): Promise<AxiosResponse<NotificationListResponse>> => {
    return notificationClient.get<NotificationListResponse>("/notifications/me", {
      params: { unreadOnly, limit },
    });
  },

  getUnreadCount: (): Promise<AxiosResponse<UnreadCountResponse>> => {
    return notificationClient.get<UnreadCountResponse>("/notifications/me/unread-count");
  },

  markAllRead: (): Promise<AxiosResponse<{ ok: boolean }>> => {
    return notificationClient.patch<{ ok: boolean }>("/notifications/me/read-all");
  },

  markRead: (id: string): Promise<AxiosResponse<{ ok: boolean }>> => {
    return notificationClient.patch<{ ok: boolean }>(`/notifications/${id}/read`);
  },
};
