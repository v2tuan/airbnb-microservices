import type { AxiosResponse } from "axios";
import apiClient from "../client";

const prefix = process.env.NEXT_PUBLIC_PREFIX as string;

export interface LoginCredentials {
  username: string;
  password: string;
}

export interface RegisterData {
  email: string;
  password: string;
  username?: string;
  firstName?: string;
  lastName?: string;
  dateOfBirth?: string;
  name?: string;
}

export interface AuthResponse {
  access_token?: string;
  accessToken?: string;
  user?: any;
  message?: string;
}

export interface MeResponse {
  userId?: string;
  fullName?: string;
  firstName?: string;
  lastName?: string;
  dateOfBirth?: string;
  gender?: string;
  bio?: string;
  avatarUrl?: string;
  email?: string;
  isHost?: boolean;
}

export interface UpdateProfilePayload {
  firstName?: string;
  lastName?: string;
  dateOfBirth?: string;
  gender?: string;
  bio?: string;
}

export const authAPI = {
  login: (
    credentials: LoginCredentials,
  ): Promise<AxiosResponse<AuthResponse>> => {
    return apiClient.post(`${prefix}/users/auth/login`, credentials, {
      withCredentials: true,
    });
  },

  refresh: (): Promise<AxiosResponse<AuthResponse>> => {
    return apiClient.post(
      `${prefix}/users/auth/refresh`,
      {},
      {
        withCredentials: true,
      },
    );
  },

  register: (userData: RegisterData): Promise<AxiosResponse<AuthResponse>> => {
    return apiClient.post(`${prefix}/users/auth/register`, userData);
  },

  getMe: (token: string): Promise<AxiosResponse<{ data: MeResponse }>> => {
    return apiClient.get(`${prefix}/users/auth/me`, {
      headers: { Authorization: `Bearer ${token}` },
    });
  },

  updateMe: (
    token: string,
    payload: UpdateProfilePayload,
  ): Promise<AxiosResponse<{ data: MeResponse }>> => {
    return apiClient.put(`${prefix}/users/auth/me`, payload, {
      headers: { Authorization: `Bearer ${token}` },
    });
  },

  uploadAvatar: (
    token: string,
    file: File,
  ): Promise<AxiosResponse<{ data: MeResponse }>> => {
    const formData = new FormData();
    formData.append("file", file);

    return apiClient.post(`${prefix}/users/auth/me/avatar`, formData, {
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "multipart/form-data",
      },
    });
  },
};

export default authAPI;
