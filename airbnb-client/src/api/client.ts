import axios, { AxiosInstance } from "axios";

const apiClient: AxiosInstance = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_BASE_URL,
  timeout: 20000,
});

// apiClient.interceptors.request.use(
//     (config) => {
//       const token = localStorage.getItem("access_token");
//
//       if(token) {
//         config.headers.Authorization = `Bearer ${token}`;
//       }
//
//       return config;
//     },
//     (error) => Promise.reject(error)
// )

export default apiClient;