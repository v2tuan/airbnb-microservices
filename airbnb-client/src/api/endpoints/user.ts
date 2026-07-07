import type { AxiosRequestConfig, AxiosResponse } from "axios";
import apiClient from "../client";

const prefix = process.env.NEXT_PUBLIC_PREFIX as string;
type PublicRequestConfig = AxiosRequestConfig & {
  _skipAuth?: boolean;
  _skipAuthRefresh?: boolean;
};
const publicRequest: PublicRequestConfig = {
  _skipAuth: true,
  _skipAuthRefresh: true,
};

export interface HostInfoDTO {
  id?: string;
  keycloakUserId?: string;
  fullName?: string;
  avatarUrl?: string;
  isSuperhost?: boolean;
  identityVerified?: boolean;
  location?: string;
  hostSince?: string;
  responseRate?: string;
  responseTime?: string;
}

export interface PublicHostResponseDTO {
  userId?: string;
  keycloakUserId?: string;
  fullName?: string;
  avatarUrl?: string;
  superHost?: boolean;
  joinedAt?: string;
}

export interface HostStatsDTO {
  reviewsCount?: number;
  overallRating?: number;
  hostingMonths?: number;
  activeListingsCount?: number;
}

export interface HostReviewItemDTO {
  id?: string;
  listingId?: string;
  listingTitle?: string;
  reviewerName?: string;
  reviewerAvatarUrl?: string;
  reviewerLocation?: string;
  createdAt?: string;
  comment?: string;
  rating?: number;
}

export interface HostListingItemDTO {
  id?: string;
  title?: string;
  thumbnailUrl?: string;
  city?: string;
  shortFeatures?: string;
  avgRating?: number;
  reviewCount?: number;
}

export interface HostPageDTO<T> {
  items?: T[];
  page?: number;
  size?: number;
  totalElements?: number;
}

export interface HostProfileResponseDTO {
  host?: HostInfoDTO;
  stats?: HostStatsDTO;
  reviews?: HostPageDTO<HostReviewItemDTO>;
  listings?: HostPageDTO<HostListingItemDTO>;
}

export interface PublicUserProfile {
  userId?: string;
  keycloakUserId?: string;
  fullName?: string;
  avatarUrl?: string;
  superHost?: boolean;
  joinedAt?: string;
}

export interface PublicProfilePageData {
  host?: HostInfoDTO;
  stats?: HostStatsDTO;
  reviews?: HostPageDTO<HostReviewItemDTO>;
  listings?: HostPageDTO<HostListingItemDTO>;
}

export interface PublicProfileResponse {
  data?: PublicProfilePageData;
}

export const userAPI = {
  getPublicHostByKeycloakUserId: (
    keycloakUserId: string,
  ): Promise<AxiosResponse<PublicHostResponseDTO>> => {
    return apiClient.get<PublicHostResponseDTO>(
      `${prefix}/users/public/${keycloakUserId}`,
      publicRequest,
    );
  },

  getPublicProfileById: (
    id: string,
    params?: { reviewPage?: number; listingPage?: number },
  ): Promise<AxiosResponse<PublicUserProfile>> => {
    return apiClient
      .get<HostProfileResponseDTO>(`${prefix}/profile/${id}`, {
        params,
        ...publicRequest,
      })
      .then((response) => {
        const host = response.data?.host;

        const normalized: PublicUserProfile = {
          userId: host?.id,
          keycloakUserId: host?.keycloakUserId ?? host?.id,
          fullName: host?.fullName,
          avatarUrl: host?.avatarUrl,
          superHost: host?.isSuperhost,
          joinedAt: host?.hostSince,
        };

        return {
          ...response,
          data: normalized,
        } as AxiosResponse<PublicUserProfile>;
      });
  },

  getPublicProfilePageData: (
    id: string,
    params?: { reviewPage?: number; listingPage?: number },
  ): Promise<AxiosResponse<PublicProfilePageData>> => {
    return apiClient.get<PublicProfilePageData>(`${prefix}/profile/${id}`, {
      params,
      ...publicRequest,
    });
  },
};
