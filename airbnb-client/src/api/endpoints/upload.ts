import type { AxiosProgressEvent, AxiosResponse } from "axios";
import apiClient from "../client";

const prefix = process.env.NEXT_PUBLIC_PREFIX as string;

export interface ImageUploadResponse {
  url: string;
  publicId?: string | null;
}

export interface ApiResponse<T> {
  success?: boolean;
  message?: string;
  data: T;
}

export const uploadAPI = {
  uploadImage: (
    token: string | null,
    file: File,
    folder = "airbnb/listings/photos",
    onUploadProgress?: (progressEvent: AxiosProgressEvent) => void,
  ): Promise<AxiosResponse<ApiResponse<ImageUploadResponse>>> => {
    const formData = new FormData();
    formData.append("file", file);
    formData.append("folder", folder);

    return apiClient.post(`${prefix}/users/uploads/images`, formData, {
      headers: {
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
        "Content-Type": "multipart/form-data",
      },
      onUploadProgress,
    });
  },
};

export default uploadAPI;
