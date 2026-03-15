import apiClient from "../client";
import { AxiosResponse } from "axios";

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

export const authAPI = {
  login: (
    credentials: LoginCredentials
  ): Promise<AxiosResponse<AuthResponse>> => {
    return apiClient.post(prefix + "/users/auth/login", credentials);
  },

  register: (
    userData: RegisterData
  ): Promise<AxiosResponse<AuthResponse>> => {
    return apiClient.post(prefix + "/users/auth/register", userData);
  },
};

export default authAPI;