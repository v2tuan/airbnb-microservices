import type { AxiosResponse } from "axios";
import type { StoredAuthUser } from "@/lib/auth-storage";
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
  refresh_token?: string;
  refreshToken?: string;
  user?: StoredAuthUser | null;
  message?: string;
  data?: AuthResponse;
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
      // Login set httpOnly refresh_token cookie. Nếu không bật credentials,
      // browser có thể bỏ qua Set-Cookie và /refresh sau đó sẽ fail dù login
      // trước đó trả 200.
      withCredentials: true,
    });
  },

  refresh: (): Promise<AxiosResponse<AuthResponse>> => {
    return apiClient.post(
      `${prefix}/users/auth/refresh`,
      {},
      {
        // Refresh token được gửi bằng cookie, không phải Authorization header.
        // Nếu /refresh trả 401 và Network tab không có Cookie header, đây là
        // chỗ đầu tiên cần kiểm tra.
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
