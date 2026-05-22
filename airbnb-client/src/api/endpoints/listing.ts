import type { AxiosResponse } from "axios";
import apiClient from "../client";

const prefix = process.env.NEXT_PUBLIC_PREFIX as string;

export type PropertyType =
  | "APARTMENT"
  | "HOUSE"
  | "VILLA"
  | "CONDO"
  | "TOWNHOUSE"
  | "COTTAGE"
  | "BUNGALOW";

export type RoomType = "ENTIRE_PLACE" | "PRIVATE_ROOM" | "SHARED_ROOM";

export type ListingStatus =
  | "DRAFT"
  | "ACTIVE"
  | "INACTIVE"
  | "PENDING_APPROVAL";

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
  data?: T;
  result?: T;
}

export interface ListingPhotoResponse {
  photoId: string;
  listingId: string;
  photoUrl: string;
  caption?: string;
  displayOrder?: number;
  isCover?: boolean;
  uploadedAt?: string;
}

export interface ListingPricingResponse {
  pricingId?: string;
  listingId?: string;
  basePrice: number;
  currency: string;
  cleaningFee: number;
  serviceFeePercentage: number;
  weekendPrice?: number;
  weeklyDiscount?: number;
  monthlyDiscount?: number;
}

export interface HouseRulesResponse {
  ruleId?: string;
  listingId?: string;
  checkInFrom?: string;
  checkInTo?: string;
  checkOutTime?: string;
  smokingAllowed?: boolean;
  petsAllowed?: boolean;
  partiesAllowed?: boolean;
  childrenAllowed?: boolean;
  additionalRules?: string;
}

export interface AmenityResponse {
  amenityId: string;
  name: string;
  category: string;
  iconUrl?: string;
}

export interface AvailabilityResponse {
  availabilityId: string;
  listingId: string;
  date: string;
  isAvailable: boolean;
  minNights?: number;
  maxNights?: number;
}

export interface ListingResponse {
  listingId: string;
  hostId: string;
  title: string;
  description: string;
  propertyType: PropertyType;
  roomType: RoomType;
  numBedrooms: number;
  numBeds: number;
  numBathrooms: number;
  maxGuests: number;
  address: string;
  city: string;
  state?: string;
  country: string;
  postalCode?: string;
  latitude: number;
  longitude: number;
  status: ListingStatus;
  instantBook?: boolean;
  checkInStartTime?: string;
  checkInEndTime?: string;
  checkOutTime?: string;
  photos?: ListingPhotoResponse[];
  amenities?: AmenityResponse[];
  pricing?: ListingPricingResponse;
  houseRules?: HouseRulesResponse;
  createdAt?: string;
  updatedAt?: string;
}

export interface ListingItemResponse {
  id: string;
  title: string;
  thumbnailUrl?: string;
  city?: string;
  shortFeatures?: string;
  avgRating?: number;
  reviewCount?: number;
}

export interface PageResponse<T> {
  content?: T[];
  items?: T[];
  page?: number;
  size?: number;
  totalElements?: number;
  totalPages?: number;
}

export interface ListingMutationPayload {
  title: string;
  description: string;
  propertyType: PropertyType;
  roomType: RoomType;
  numBedrooms: number;
  numBeds: number;
  numBathrooms: number;
  maxGuests: number;
  address: string;
  city: string;
  state?: string;
  country: string;
  postalCode?: string;
  latitude: number;
  longitude: number;
  instantBook?: boolean;
  checkInStartTime: string;
  checkInEndTime?: string;
  checkOutTime: string;
}

export interface ListingPricingPayload {
  basePrice: number;
  currency: string;
  cleaningFee?: number;
  serviceFeePercentage?: number;
  weekendPrice?: number;
  weeklyDiscount?: number;
  monthlyDiscount?: number;
}

export interface ListingPhotoPayload {
  photoUrl: string;
  caption?: string;
}

export interface HouseRulesPayload {
  checkInFrom: string;
  checkInTo?: string;
  checkOutTime: string;
  smokingAllowed?: boolean;
  petsAllowed?: boolean;
  partiesAllowed?: boolean;
  childrenAllowed?: boolean;
  additionalRules?: string;
}

export interface AvailabilityPayload {
  date: string;
  isAvailable: boolean;
  minNights?: number;
  maxNights?: number;
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

export const unwrapApiData = <T>(payload: ApiResponse<T> | T): T => {
  if (payload && typeof payload === "object") {
    const response = payload as ApiResponse<T>;
    return (response.data ?? response.result ?? payload) as T;
  }

  return payload as T;
};

export const listingAPI = {
  getHomeSections: (
    limit?: number,
  ): Promise<AxiosResponse<ApiResponse<HomeSectionResponse[]>>> => {
    return apiClient.get(`${prefix}/listings/sections`, {
      params: { limit },
    });
  },

  getRoomById: (
    id: string,
  ): Promise<AxiosResponse<ApiResponse<ListingResponse>>> => {
    return apiClient.get(`${prefix}/listings/${id}`);
  },

  getAllListings: (): Promise<
    AxiosResponse<ApiResponse<ListingResponse[]>>
  > => {
    return apiClient.get(`${prefix}/listings`);
  },

  getAmenities: (): Promise<AxiosResponse<ApiResponse<AmenityResponse[]>>> => {
    return apiClient.get(`${prefix}/amenities`);
  },

  searchListings: (params: {
    city?: string;
    country?: string;
    maxGuests?: number;
  }): Promise<AxiosResponse<ApiResponse<ListingResponse[]>>> => {
    return apiClient.get(`${prefix}/listings/search`, { params });
  },

  searchByPriceRange: (params: {
    minPrice: number;
    maxPrice: number;
  }): Promise<AxiosResponse<ApiResponse<ListingResponse[]>>> => {
    return apiClient.get(`${prefix}/listings/search/price`, { params });
  },

  searchByLocation: (params: {
    latitude: number;
    longitude: number;
    radius: number;
  }): Promise<AxiosResponse<ApiResponse<ListingResponse[]>>> => {
    return apiClient.get(`${prefix}/listings/search/location`, { params });
  },

  getListingDetail: (
    id: string,
    params: {
      checkIn: string;
      checkOut: string;
      adults?: number;
      children?: number;
      infants?: number;
      pets?: number;
    },
  ): Promise<AxiosResponse<any>> => {
    return apiClient.get(`${prefix}/listings/${id}/detail`, { params });
  },

  getListingsByHost: (
    hostId: string,
    params?: { status?: ListingStatus; page?: number; size?: number },
  ): Promise<
    AxiosResponse<
      PageResponse<ListingItemResponse> | ApiResponse<ListingResponse[]>
    >
  > => {
    return apiClient.get(`${prefix}/listings/host/${hostId}/paginated`, {
      params,
    });
  },

  createListing: (
    token: string | null,
    payload: ListingMutationPayload,
  ): Promise<AxiosResponse<ApiResponse<ListingResponse>>> => {
    return apiClient.post(`${prefix}/listings`, payload, withAuth(token));
  },

  updateListing: (
    token: string | null,
    listingId: string,
    payload: Partial<ListingMutationPayload>,
  ): Promise<AxiosResponse<ApiResponse<ListingResponse>>> => {
    return apiClient.put(
      `${prefix}/listings/${listingId}`,
      payload,
      withAuth(token),
    );
  },

  deleteListing: (
    token: string | null,
    listingId: string,
  ): Promise<AxiosResponse<ApiResponse<null>>> => {
    return apiClient.delete(`${prefix}/listings/${listingId}`, withAuth(token));
  },

  activateListing: (
    token: string | null,
    listingId: string,
  ): Promise<AxiosResponse<ApiResponse<null>>> => {
    return apiClient.patch(
      `${prefix}/listings/${listingId}/activate`,
      {},
      withAuth(token),
    );
  },

  deactivateListing: (
    token: string | null,
    listingId: string,
  ): Promise<AxiosResponse<ApiResponse<null>>> => {
    return apiClient.patch(
      `${prefix}/listings/${listingId}/deactivate`,
      {},
      withAuth(token),
    );
  },

  savePricing: (
    token: string | null,
    listingId: string,
    payload: ListingPricingPayload,
  ): Promise<AxiosResponse<ApiResponse<ListingPricingResponse>>> => {
    return apiClient.post(
      `${prefix}/listings/${listingId}/pricing`,
      payload,
      withAuth(token),
    );
  },

  addPhoto: (
    token: string | null,
    listingId: string,
    payload: ListingPhotoPayload,
  ): Promise<AxiosResponse<ApiResponse<ListingPhotoResponse>>> => {
    return apiClient.post(
      `${prefix}/listings/${listingId}/photos`,
      payload,
      withAuth(token),
    );
  },

  deletePhoto: (
    token: string | null,
    listingId: string,
    photoId: string,
  ): Promise<AxiosResponse<ApiResponse<null>>> => {
    return apiClient.delete(
      `${prefix}/listings/${listingId}/photos/${photoId}`,
      withAuth(token),
    );
  },

  setCoverPhoto: (
    token: string | null,
    listingId: string,
    photoId: string,
  ): Promise<AxiosResponse<ApiResponse<ListingPhotoResponse>>> => {
    return apiClient.patch(
      `${prefix}/listings/${listingId}/photos/${photoId}/set-cover`,
      {},
      withAuth(token),
    );
  },

  saveHouseRules: (
    token: string | null,
    listingId: string,
    payload: HouseRulesPayload,
  ): Promise<AxiosResponse<ApiResponse<HouseRulesResponse>>> => {
    return apiClient.post(
      `${prefix}/listings/${listingId}/house-rules`,
      payload,
      withAuth(token),
    );
  },

  updateListingAmenities: (
    token: string | null,
    listingId: string,
    amenityIds: string[],
  ): Promise<AxiosResponse<ApiResponse<null>>> => {
    return apiClient.put(
      `${prefix}/listings/${listingId}/amenities`,
      amenityIds,
      withAuth(token),
    );
  },

  updateListingAmenityNames: (
    token: string | null,
    listingId: string,
    amenityNames: string[],
  ): Promise<AxiosResponse<ApiResponse<null>>> => {
    return apiClient.put(
      `${prefix}/listings/${listingId}/amenities/names`,
      amenityNames,
      withAuth(token),
    );
  },

  saveAvailability: (
    token: string | null,
    listingId: string,
    payload: AvailabilityPayload,
  ): Promise<AxiosResponse<ApiResponse<AvailabilityResponse>>> => {
    return apiClient.post(
      `${prefix}/listings/${listingId}/availability`,
      payload,
      withAuth(token),
    );
  },
};

export default listingAPI;
