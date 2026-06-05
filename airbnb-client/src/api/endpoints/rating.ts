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

export interface RatingDTO {
  id: string;
  listingId: string;
  userId: string;
  hostId: string;
  overallRating: number;
  cleanliness: number;
  accuracy: number;
  checkIn: number;
  communication: number;
  location: number;
  value: number;
  review: string;
  reviewerFullName?: string;
  reviewerAvatarUrl?: string;
  createdAt?: string;
}

export interface CreateRatingPayload {
  listingId: string;
  userId: string;
  hostId?: string;
  reviewerFullName?: string;
  reviewerAvatarUrl?: string;
  overallRating: number;
  cleanliness: number;
  accuracy: number;
  checkIn: number;
  communication: number;
  location: number;
  value: number;
  review: string;
}

export const ratingAPI = {
  createRating: (
    payload: CreateRatingPayload,
  ): Promise<AxiosResponse<RatingDTO>> => {
    return apiClient.post(`${prefix}/ratings`, payload);
  },
  getRatingsByListing: (
    listingId: string,
  ): Promise<AxiosResponse<RatingDTO[]>> => {
    return apiClient.get(
      `${prefix}/ratings/listing/${listingId}`,
      publicRequest,
    );
  },
  getAverageRating: (listingId: string): Promise<AxiosResponse<number>> => {
    return apiClient.get(
      `${prefix}/ratings/listing/${listingId}/average`,
      publicRequest,
    );
  },
};
