import apiClient from "../client";
<<<<<<< HEAD
import type { AxiosResponse } from "axios";
=======
import { AxiosResponse } from "axios";
>>>>>>> 3e6c73e5eca1eeec4c4fc3f4770924716d82caac

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

<<<<<<< HEAD
export interface MeResponse {
  userId?: string;
  fullName?: string;
  firstName?: string;
  lastName?: string;
  avatarUrl?: string;
  email?: string;
  isHost?: boolean;
}

=======
>>>>>>> 3e6c73e5eca1eeec4c4fc3f4770924716d82caac
export const authAPI = {
  login: (
    credentials: LoginCredentials
  ): Promise<AxiosResponse<AuthResponse>> => {
<<<<<<< HEAD
    return apiClient.post(`${prefix}/users/auth/login`, credentials);
=======
    return apiClient.post(prefix + "/users/auth/login", credentials);
>>>>>>> 3e6c73e5eca1eeec4c4fc3f4770924716d82caac
  },

  register: (
    userData: RegisterData
  ): Promise<AxiosResponse<AuthResponse>> => {
<<<<<<< HEAD
    return apiClient.post(`${prefix}/users/auth/register`, userData);
  },

  getMe: (token: string): Promise<AxiosResponse<{ data: MeResponse }>> => {
    return apiClient.get(`${prefix}/users/auth/me`, {
      headers: { Authorization: `Bearer ${token}` },
    });
=======
    return apiClient.post(prefix + "/users/auth/register", userData);
>>>>>>> 3e6c73e5eca1eeec4c4fc3f4770924716d82caac
  },
};

export default authAPI;