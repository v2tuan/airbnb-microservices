import { AxiosResponse } from "axios";
import apiClient from "../client";

const prefix = process.env.NEXT_PUBLIC_PREFIX as string;

export interface HomeListingCardResponse {
  listingId: string;
  title: string;
  city: string;
  country: string;
  coverImageUrl: string;
  basePrice: number;
  rating: number;
  currency: string;
  maxGuests: number;
  instantBook?: boolean;
  instantBooks?: boolean;
}

export interface HomeSectionResponse {
  sectionKey: string;
  title: string;
  city: string;
  listings: HomeListingCardResponse[];
}

export interface ApiResponse<T> {
  code?: number;
  message?: string;
  result: T;
}

export const listingAPI = {
  getHomeSections: ( limit?: number): Promise<AxiosResponse<ApiResponse<HomeSectionResponse[]>>> => {
    return apiClient.get(`${prefix}/listings/sections`, {
      params: { limit },
    });
  },
  getListingById: (id: string): Promise<AxiosResponse<ApiResponse<any>>> => {
    return apiClient.get(`${prefix}/listings/${id}`);
  },
}