import axios, {
  type AxiosError,
  type AxiosInstance,
  type AxiosResponse,
  type InternalAxiosRequestConfig,
} from "axios";
import { notifyAuthSessionExpired } from "@/lib/auth-session";
import { authStorage } from "@/lib/auth-storage";

const apiClient: AxiosInstance = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_BASE_URL,
  timeout: 20000,
});

const prefix = process.env.NEXT_PUBLIC_PREFIX as string;
const refreshEndpoint = `${prefix}/users/auth/refresh`;

type RetryableRequestConfig = InternalAxiosRequestConfig & {
  // Đánh dấu request đã từng được refresh token một lần.
  // Nếu thiếu guard này, request retry mà vẫn nhận 401 có thể rơi vào vòng lặp:
  // 401 -> refresh -> retry -> 401 -> refresh -> ...
  _retry?: boolean;
  // Cờ thoát cho những request không được kích hoạt refresh token.
  // Dùng cho auth endpoints hoặc các API muốn tự xử lý 401 thay vì để global
  // session manager can thiệp.
  _skipAuthRefresh?: boolean;
};

type AuthRefreshResponse = {
  access_token?: string;
  accessToken?: string;
  data?: {
    access_token?: string;
    accessToken?: string;
  };
};

class AuthRefreshCancelledError extends Error {
  constructor() {
    super("Auth refresh cancelled because the user logged out.");
    this.name = "AuthRefreshCancelledError";
  }
}

/**
 * Khóa single-flight cho refresh token.
 *
 * Runtime diagram:
 * Request A, B, C
 * ->
 * tất cả nhận 401 vì access token đã hết hạn
 * ->
 * A tạo refreshPromise và gọi /refresh
 * B và C thấy refreshPromise đã tồn tại nên chỉ await
 * ->
 * /refresh thành công đúng một lần
 * ->
 * A, B, C retry lại với cùng access token mới
 *
 * Cách này thay thế pattern isRefreshing + failedQueue bằng một Promise dùng
 * chung. Nếu để mỗi request 401 tự gọi /refresh, refresh-token rotation có thể
 * khiến một request thành công, các request còn lại thất bại 401 và logout user
 * dù session thực tế vẫn còn hợp lệ.
 */
let refreshPromise: Promise<string | null> | null = null;

const isAuthEndpoint = (url?: string) => {
  if (!url) return false;

  return (
    url.includes("/users/auth/login") ||
    url.includes("/users/auth/register") ||
    url.includes("/users/auth/refresh")
  );
};

const extractAccessToken = (response: AxiosResponse<AuthRefreshResponse>) => {
  const payload = response.data;

  return (
    payload?.data?.access_token ??
    payload?.data?.accessToken ??
    payload?.access_token ??
    payload?.accessToken ??
    null
  );
};

const refreshAccessToken = async () => {
  const tokenBeforeRefresh = authStorage.getAccessToken();

  // Nếu frontend không có access token thì đây không phải case recover token
  // hết hạn. Ở góc nhìn client, user đang anonymous; gọi /refresh lúc này chỉ
  // tạo thêm một request 401 không cần thiết khi vừa mở app.
  if (!tokenBeforeRefresh) {
    return null;
  }

  // Dùng axios gốc, không dùng apiClient.
  // apiClient đang gắn response interceptor này. Nếu /refresh cũng dùng
  // apiClient và trả 401, chính request refresh có thể tự kích hoạt refresh
  // tiếp, tạo vòng lặp. Refresh endpoint là cơ chế recover, nó không được tự
  // recover lại chính nó.
  const response = await axios.post<AuthRefreshResponse>(
    `${process.env.NEXT_PUBLIC_API_BASE_URL}${refreshEndpoint}`,
    {},
    {
      timeout: 20000,
      // Backend lưu refresh_token trong httpOnly cookie, nên browser chỉ gửi
      // cookie khi bật credentials. Nếu thiếu dòng này, Network tab sẽ thấy
      // /refresh không có Cookie và server sẽ hiểu là user không có refresh
      // token.
      withCredentials: true,
    },
  );
  const token = extractAccessToken(response);

  if (!token) {
    return null;
  }

  // Race condition: user bấm logout trong lúc /refresh vẫn đang chạy.
  //
  // Nếu thiếu check này, response refresh cũ có thể ghi access token mới sau
  // khi logout và âm thầm đăng nhập user trở lại. Ý định mới nhất của user phải
  // thắng mọi network response đã cũ.
  if (!authStorage.getAccessToken()) {
    throw new AuthRefreshCancelledError();
  }

  authStorage.setAccessToken(token);

  return token;
};

apiClient.interceptors.request.use((config) => {
  // Luôn đọc token ngay tại thời điểm request chạy, không capture token từ lúc
  // app khởi động. Sau refresh, localStorage đã có token mới; nếu dùng token cũ
  // từ closure thì request vẫn gửi token hết hạn và tiếp tục nhận 401.
  const token = authStorage.getAccessToken();

  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }

  return config;
});

apiClient.interceptors.response.use(
  (response) => response,
  async (error: AxiosError<unknown>) => {
    const originalRequest = error.config as RetryableRequestConfig | undefined;
    const status = error.response?.status;

    /*
     * Chỉ lỗi access token hết hạn mới được đi vào refresh pipeline.
     *
     * Các case phải loại trừ:
     * - không phải 401: refresh không sửa được lỗi 403/500/network
     * - thiếu originalRequest: Axios không có request gốc để retry an toàn
     * - _retry: chặn vòng lặp refresh vô hạn
     * - _skipAuthRefresh/auth endpoints: lỗi login/register/refresh phải trả về
     *   cho caller xử lý, không được kích hoạt session recovery toàn cục
     */
    if (
      status !== 401 ||
      !originalRequest ||
      originalRequest._retry ||
      originalRequest._skipAuthRefresh ||
      isAuthEndpoint(originalRequest.url)
    ) {
      return Promise.reject(error);
    }

    // Mỗi original request chỉ có đúng một lần recover. Nếu retry xong vẫn 401,
    // user thật sự không còn quyền hoặc backend từ chối token mới; refresh tiếp
    // chỉ che mất lỗi thật.
    originalRequest._retry = true;

    try {
      // Request 401 đầu tiên sẽ bắt đầu refresh. Các request 401 đến sau chỉ
      // await cùng Promise này; đây chính là queue mechanism của implementation.
      if (!refreshPromise) {
        refreshPromise = refreshAccessToken().finally(() => {
          // Dọn lock sau cả success lẫn failure để session tương lai vẫn có thể
          // thử refresh lại. Nếu giữ một rejected Promise ở đây, mọi request 401
          // sau đó sẽ fail ngay mà không gọi /refresh.
          refreshPromise = null;
        });
      }

      const token = await refreshPromise;

      if (!token) {
        // Không có token nghĩa là refresh fail, cookie refresh bị thiếu/hết hạn,
        // hoặc backend trả response shape không đúng kỳ vọng. Retry request gốc
        // lúc này chỉ lặp lại 401, nên chuyển sang flow logout/toast/redirect.
        notifyAuthSessionExpired();
        return Promise.reject(error);
      }

      // Nếu có auth transition khác xảy ra trong lúc request đang chờ, không
      // retry bằng token đã không còn là token hiện tại. Điều này tránh revive
      // request cũ sau các race condition logout/login.
      if (authStorage.getAccessToken() !== token) {
        return Promise.reject(error);
      }

      // Retry đúng request vừa fail, nhưng thay Authorization header bằng token
      // mới. Nhờ vậy refresh token trở nên transparent với feature code:
      // page/component không cần biết request đầu tiên đã gặp access token hết
      // hạn.
      originalRequest.headers.Authorization = `Bearer ${token}`;

      return apiClient(originalRequest);
    } catch (refreshError) {
      if (refreshError instanceof AuthRefreshCancelledError) {
        return Promise.reject(error);
      }

      // Bất kỳ lỗi refresh nào cũng nghĩa là browser không còn chứng minh được
      // user có session hợp lệ. Bao gồm refresh 401, thiếu cookie, sai
      // CORS/credentials, network error, hoặc response shape không hợp lệ.
      notifyAuthSessionExpired();

      if ((refreshError as AxiosError)?.response?.status === 401) {
        return Promise.reject(refreshError);
      }

      return Promise.reject(error);
    }
  },
);

export default apiClient;
