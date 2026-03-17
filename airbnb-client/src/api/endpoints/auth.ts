import apiClient from "../client";
import type { AxiosResponse } from "axios";

const prefix = process.env.NEXT_PUBLIC_PREFIX as string;

export interface LoginCredentials {
  username: string;
  password: string;
}

export interface RegisterData {
  email: string;
  password: string;
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
  avatarUrl?: string;
  email?: string;
  isHost?: boolean;
}

export const authAPI = {
  login: (
    credentials: LoginCredentials
  ): Promise<AxiosResponse<AuthResponse>> => {
    return apiClient.post(`${prefix}/users/auth/login`, credentials);
  },

  register: (
    userData: RegisterData
  ): Promise<AxiosResponse<AuthResponse>> => {
    return apiClient.post(`${prefix}/users/auth/register`, userData);
  },

  getMe: (token: string): Promise<AxiosResponse<{ data: MeResponse }>> => {
    return apiClient.get(`${prefix}/users/auth/me`, {
      headers: { Authorization: `Bearer ${token}` },
    });
  },
};

export default authAPI;