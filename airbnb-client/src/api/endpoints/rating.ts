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
  bookingId?: string;
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
  photos?: RatingPhotoDTO[];
  createdAt?: string;
}

export interface RatingPhotoDTO {
  id?: string;
  imageUrl: string;
  publicId?: string;
  sortOrder?: number;
  createdAt?: string;
}

export interface CreateRatingPayload {
  bookingId: string;
  overallRating: number;
  cleanliness: number;
  accuracy: number;
  checkIn: number;
  communication: number;
  location: number;
  value: number;
  review: string;
  photos?: RatingPhotoDTO[];
}

export const ratingAPI = {
  createRating: (
    payload: CreateRatingPayload,
  ): Promise<AxiosResponse<RatingDTO>> => {
    return apiClient.post(`${prefix}/ratings`, payload);
  },
  getRatingByBooking: (
    bookingId: string,
  ): Promise<AxiosResponse<RatingDTO>> => {
    return apiClient.get(`${prefix}/ratings/bookings/${bookingId}`);
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
