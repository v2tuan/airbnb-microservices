import type { AxiosResponse } from "axios";
import apiClient from "../client";

const prefix = process.env.NEXT_PUBLIC_PREFIX as string;

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
    return apiClient.get<NotificationListResponse>(`${prefix}/notifications/me`, {
      params: { unreadOnly, limit },
    });
  },

  getUnreadCount: (): Promise<AxiosResponse<UnreadCountResponse>> => {
    return apiClient.get<UnreadCountResponse>(`${prefix}/notifications/me/unread-count`);
  },

  markAllRead: (): Promise<AxiosResponse<{ ok: boolean }>> => {
    return apiClient.patch<{ ok: boolean }>(`${prefix}/notifications/me/read-all`);
  },

  markRead: (id: string): Promise<AxiosResponse<{ ok: boolean }>> => {
    return apiClient.patch<{ ok: boolean }>(`${prefix}/notifications/${id}/read`);
  },
};
