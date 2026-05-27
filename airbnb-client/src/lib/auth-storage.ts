export const ACCESS_TOKEN_KEY = "access_token";
export const REFRESH_TOKEN_KEY = "refresh_token";
export const AUTH_USER_KEY = "auth_user";

const isBrowser = () => typeof window !== "undefined";

type StoredAuthValue = string | number | boolean | null | undefined;

export type StoredAuthUser = {
  id?: string;
  email?: string;
  name?: string;
  avatarUrl?: string | null;
  fullName?: string;
  firstName?: string;
  lastName?: string;
  dateOfBirth?: string;
  gender?: string;
  bio?: string;
  isHost?: boolean;
  [key: string]: StoredAuthValue;
};

/**
 * Boundary nhỏ bao quanh browser storage.
 *
 * Auth state đang tồn tại ở hai nơi:
 * - localStorage giúp session còn dùng được sau khi refresh trang
 * - Redux giúp UI phản ứng ngay trong render tree hiện tại
 *
 * Gom storage access vào đây để token key và JSON parsing không bị rải khắp
 * component/interceptor. Nếu sau này đổi security policy và không lưu access
 * token trong localStorage nữa, đây là file chính cần sửa.
 */
export const authStorage = {
  getAccessToken: () => {
    if (!isBrowser()) return null;

    return localStorage.getItem(ACCESS_TOKEN_KEY);
  },

  setAccessToken: (token: string | null | undefined) => {
    if (!isBrowser()) return;

    if (token) {
      localStorage.setItem(ACCESS_TOKEN_KEY, token);
      // Runtime flow:
      // interceptor refresh token -> storage ghi token mới -> provider hydrate
      // Redux -> UI và các request sau nhìn thấy session mới.
      //
      // Nếu thiếu event này, localStorage đã đúng nhưng Redux có thể vẫn giữ
      // auth state cũ cho tới khi reload toàn bộ trang.
      window.dispatchEvent(new CustomEvent("auth-token-refreshed"));
      return;
    }

    localStorage.removeItem(ACCESS_TOKEN_KEY);
  },

  getRefreshToken: () => {
    if (!isBrowser()) return null;

    // Backend hiện dùng httpOnly cookie refresh_token, nên JavaScript phía
    // frontend thường không đọc được refresh token thật. Helper này chỉ hỗ trợ
    // trường hợp legacy/non-httpOnly storage nếu sau này có. Không thấy token ở
    // đây không chứng minh cookie bị thiếu; kết quả /refresh mới là nguồn đúng.
    return localStorage.getItem(REFRESH_TOKEN_KEY);
  },

  setRefreshToken: (token: string | null | undefined) => {
    if (!isBrowser()) return;

    if (token) {
      localStorage.setItem(REFRESH_TOKEN_KEY, token);
      return;
    }

    localStorage.removeItem(REFRESH_TOKEN_KEY);
  },

  getUser: <TUser extends StoredAuthUser = StoredAuthUser>() => {
    if (!isBrowser()) return null;

    try {
      const raw = localStorage.getItem(AUTH_USER_KEY);
      return raw ? (JSON.parse(raw) as TUser) : null;
    } catch {
      return null;
    }
  },

  setUser: (user: StoredAuthUser | null | undefined) => {
    if (!isBrowser()) return;

    if (user) {
      localStorage.setItem(AUTH_USER_KEY, JSON.stringify(user));
      return;
    }

    localStorage.removeItem(AUTH_USER_KEY);
  },

  saveAuth: ({
    token,
    user,
  }: {
    token?: string | null;
    user?: StoredAuthUser | null;
  }) => {
    if (token !== undefined) {
      authStorage.setAccessToken(token);
    }

    if (user !== undefined) {
      authStorage.setUser(user);
    }
  },

  clearAuth: () => {
    if (!isBrowser()) return;

    // Hàm này chỉ clear auth state do frontend sở hữu. Nó không thể xóa
    // httpOnly refresh cookie; muốn làm vậy cần backend logout endpoint để
    // expire cookie. Nếu logout cần invalidate refresh token phía server, hãy
    // gọi API đó trước khi clear UI state local.
    localStorage.removeItem(ACCESS_TOKEN_KEY);
    localStorage.removeItem(REFRESH_TOKEN_KEY);
    localStorage.removeItem(AUTH_USER_KEY);
  },
};
