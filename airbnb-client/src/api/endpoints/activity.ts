import type { AxiosResponse } from "axios";
import apiClient from "../client";

const prefix = process.env.NEXT_PUBLIC_PREFIX as string;

export type ActivityEventType = "VIEW" | "CLICK" | "WISHLIST" | "BOOKING";

export interface ActivityRequest {
  eventType: ActivityEventType;
}

export interface ActivityResponse {
  id?: string;
  message?: string;
}

const getCurrentToken = (token: string | null) => {
  if (typeof window === "undefined") return token;

  return localStorage.getItem("access_token") ?? token;
};

const withAuth = (token: string | null) => {
  const currentToken = getCurrentToken(token);

  return {
    headers: currentToken
      ? { Authorization: `Bearer ${currentToken}` }
      : undefined,
  };
};

export const activityAPI = {
  recordActivity: (
    token: string | null,
    listingId: string,
    payload: ActivityRequest,
  ): Promise<AxiosResponse<ActivityResponse>> => {
    return apiClient.post(
      `${prefix}/listings/${listingId}/activity`,
      payload,
      withAuth(token),
    );
  },
};

export default activityAPI;
