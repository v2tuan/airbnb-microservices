import axios, {
  type AxiosError,
  type AxiosInstance,
  type InternalAxiosRequestConfig,
} from "axios";

const apiClient: AxiosInstance = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_BASE_URL,
  timeout: 20000,
});

const prefix = process.env.NEXT_PUBLIC_PREFIX as string;

type RetryableRequestConfig = InternalAxiosRequestConfig & {
  _retry?: boolean;
};

function getStoredToken() {
  if (typeof window === "undefined") return null;

  return localStorage.getItem("access_token");
}

function saveToken(token?: string | null) {
  if (typeof window === "undefined" || !token) return;

  localStorage.setItem("access_token", token);
  window.dispatchEvent(new CustomEvent("auth-token-refreshed"));
}

apiClient.interceptors.request.use((config) => {
  const token = getStoredToken();

  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }

  return config;
});

apiClient.interceptors.response.use(
  (response) => response,
  async (error: AxiosError<any>) => {
    const originalRequest = error.config as RetryableRequestConfig | undefined;

    if (
      error.response?.status !== 401 ||
      !originalRequest ||
      originalRequest._retry ||
      originalRequest.url?.includes("/users/auth/refresh")
    ) {
      return Promise.reject(error);
    }

    originalRequest._retry = true;

    try {
      const response = await axios.post(
        `${process.env.NEXT_PUBLIC_API_BASE_URL}${prefix}/users/auth/refresh`,
        {},
        { withCredentials: true },
      );
      const token =
        response.data?.access_token ?? response.data?.accessToken ?? null;

      if (!token) {
        return Promise.reject(error);
      }

      saveToken(token);
      originalRequest.headers.Authorization = `Bearer ${token}`;

      return apiClient(originalRequest);
    } catch {
      return Promise.reject(error);
    }
  },
);

export default apiClient;
