import { createAsyncThunk, createSlice } from "@reduxjs/toolkit";
import authAPI from "@/api/endpoints/auth";
import { authStorage, type StoredAuthUser } from "@/lib/auth-storage";
import { parseJwt } from "@/lib/jwt";
import type { RootState } from "@/store";

interface User extends StoredAuthUser {
  id?: string;
  keycloakUserId?: string;
  email?: string;
  name?: string;
}

interface AuthState {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
  loading: boolean;
  error: string | null;
  registerSuccessMessage: string | null;
}

interface LoginCredentials {
  username: string;
  password: string;
}

interface RegisterData {
  email: string;
  password: string;
  username?: string;
  firstName?: string;
  lastName?: string;
  dateOfBirth?: string;
  name?: string;
}

type UnknownRecord = Record<string, unknown>;

const isRecord = (value: unknown): value is UnknownRecord => {
  return typeof value === "object" && value !== null;
};

const decodeKeycloakUserIdFromToken = (token?: string | null): string | null => {
  if (!token) return null;
  return parseJwt(token)?.sub ?? null;
};

const getRecordValue = (source: UnknownRecord | null, key: string) => {
  const value = source?.[key];
  return isRecord(value) ? value : null;
};

const getStringValue = (source: UnknownRecord | null, key: string) => {
  const value = source?.[key];
  return typeof value === "string" ? value : null;
};

const getBooleanValue = (source: UnknownRecord | null, key: string) => {
  const value = source?.[key];
  return typeof value === "boolean" ? value : undefined;
};

const getUserValue = (source: UnknownRecord | null) => {
  const user = source?.user;
  return isRecord(user) ? (user as User) : null;
};

/**
 * Chỉ persist những giá trị thật sự có trong response.
 *
 * Có endpoint chỉ trả token, có endpoint chỉ trả profile, có endpoint lại bọc
 * trong { data }. Nếu helper này ghi null/undefined một cách mù quáng, response
 * refresh không có user data có thể xóa mất cached user profile.
 */
const saveAuthToStorage = ({
  token,
  user,
}: {
  token?: string | null;
  user?: User | null;
}) => {
  if (token) {
    authStorage.setAccessToken(token);
  }

  if (user) {
    authStorage.setUser(user);
  }
};

const getErrorMessage = (error: unknown, fallbackMessage: string): string => {
  if (!isRecord(error)) return fallbackMessage;

  const response = getRecordValue(error, "response");
  const data = getRecordValue(response, "data");

  return (
    getStringValue(data, "message") ||
    getStringValue(data, "error_description") ||
    getStringValue(data, "error") ||
    getStringValue(error, "message") ||
    fallbackMessage
  );
};

/**
 * Response backend chưa hoàn toàn thống nhất giữa các auth endpoint:
 * - login/refresh có thể là { data: { access_token } }
 * - một số caller có thể truyền thẳng payload bên trong
 *
 * Normalize ở đây giúp reducer/thunk tập trung vào auth behavior, thay vì lặp
 * lại logic kiểm tra response shape ở nhiều nơi.
 */
const normalizeAuthResponse = (payload: unknown) => {
  let body = isRecord(payload) ? payload : {};

  const firstData = getRecordValue(body, "data");

  if (
    firstData &&
    (getStringValue(firstData, "access_token") ||
      getStringValue(firstData, "accessToken"))
  ) {
    body = firstData;
  } else if (firstData) {
    body = getRecordValue(firstData, "data") ?? firstData;
  }

  return {
    token:
      getStringValue(body, "access_token") ??
      getStringValue(body, "accessToken"),
    user: getUserValue(body),
    message:
      getStringValue(body, "message") ??
      (isRecord(payload) ? getStringValue(payload, "message") : null),
  };
};

// Khai báo fetchMeThunk trước để loginThunk/refreshThunk có thể dùng chung một
// đường hydrate profile sau khi lấy được token.
export const fetchMeThunk = createAsyncThunk<
  unknown,
  string,
  { rejectValue: string }
>("auth/fetchMe", async (token, { rejectWithValue }) => {
  try {
    const response = await authAPI.getMe(token);
    return response.data;
  } catch (error: unknown) {
    return rejectWithValue(
      getErrorMessage(error, "Không thể lấy thông tin người dùng"),
    );
  }
});
export const loginThunk = createAsyncThunk<
  unknown,
  LoginCredentials,
  { rejectValue: string }
>("auth/login", async (credentials, { rejectWithValue, dispatch }) => {
  try {
    const response = await authAPI.login(credentials);
    const normalized = normalizeAuthResponse(response.data);

    // Login là thời điểm session frontend mới bắt đầu. Persist token trước khi
    // gọi /me giúp provider/interceptor khác nhìn thấy token ngay lập tức.
    if (normalized.token || normalized.user) {
      saveAuthToStorage(normalized);
    }

    if (normalized.token) {
      dispatch(fetchMeThunk(normalized.token));
    }

    return response.data;
  } catch (error: unknown) {
    return rejectWithValue(getErrorMessage(error, "Đăng nhập thất bại"));
  }
});

export const registerThunk = createAsyncThunk<
  unknown,
  RegisterData,
  { rejectValue: string }
>("auth/register", async (userData, { rejectWithValue }) => {
  try {
    const response = await authAPI.register(userData);
    return response.data;
  } catch (error: unknown) {
    return rejectWithValue(getErrorMessage(error, "Đăng ký thất bại"));
  }
});

export const refreshThunk = createAsyncThunk<
  unknown,
  void,
  { rejectValue: string }
>("auth/refresh", async (_, { rejectWithValue, dispatch }) => {
  try {
    const response = await authAPI.refresh();
    const normalized = normalizeAuthResponse(response.data);

    // refreshThunk thủ công dùng cho các flow rõ ràng bên ngoài interceptor
    // (ví dụ sau khi đổi role). Interceptor xử lý recover request transparent;
    // thunk này dùng khi app chủ động muốn refresh auth state trong Redux/storage.
    if (normalized.token || normalized.user) {
      saveAuthToStorage(normalized);
    }

    if (normalized.token) {
      // Đây là lý do Network tab có thể thấy /refresh xong gọi /me khi dùng
      // refreshThunk. Việc này hữu ích sau các flow có thể đổi profile/role,
      // nhưng không bắt buộc cho cơ chế retry của interceptor.
      dispatch(fetchMeThunk(normalized.token));
    }

    return response.data;
  } catch (error: unknown) {
    return rejectWithValue(getErrorMessage(error, "Refresh token thất bại"));
  }
});

const initialState: AuthState = {
  user: null,
  token: null,
  isAuthenticated: false,
  loading: false,
  error: null,
  registerSuccessMessage: null,
};

const authSlice = createSlice({
  name: "auth",
  initialState,
  reducers: {
    hydrateAuthFromStorage: (state) => {
      // Redux state chỉ nằm trong memory. Sau hard reload, localStorage có thể
      // vẫn còn access token hợp lệ, nhưng component chưa thể phản ứng cho tới
      // khi token được copy lại vào Redux.
      const token = authStorage.getAccessToken();
      const user = authStorage.getUser<User>();

      state.token = token;
      state.user = user;
      state.isAuthenticated = !!token;

      // `/me` của user-service hiện không trả `keycloakUserId`, nên fallback quan
      // trọng là lấy từ JWT `sub` (Keycloak subject) để khớp `senderId` trong chat.
      const keycloakUserId = decodeKeycloakUserIdFromToken(token);
      if (state.user && keycloakUserId) {
        state.user.keycloakUserId = keycloakUserId;
      }
    },

    clearAuthMessages: (state) => {
      state.error = null;
      state.registerSuccessMessage = null;
    },

    logout: (state) => {
      // Logout phải clear cả durable storage lẫn reactive UI state. Nếu chỉ
      // clear Redux, reload sau đó sẽ restore token cũ; nếu chỉ clear
      // localStorage, UI hiện tại vẫn render như đang authenticated.
      authStorage.clearAuth();
      state.user = null;
      state.token = null;
      state.isAuthenticated = false;
      state.loading = false;
      state.error = null;
      state.registerSuccessMessage = null;
    },
  },

  extraReducers: (builder) => {
    builder
      // LOGIN
      .addCase(loginThunk.pending, (state) => {
        state.loading = true;
        state.error = null;
        state.registerSuccessMessage = null;
      })
      .addCase(loginThunk.fulfilled, (state, action) => {
        const normalized = normalizeAuthResponse(action.payload);

        // Giữ Redux và localStorage đồng bộ: storage sống qua reload, Redux điều
        // khiển UI. Lệch state ở đây thường gây lỗi "Network đã có token nhưng
        // header/menu vẫn hiện logged out".
        state.loading = false;
        state.error = null;
        state.user = normalized.user;
        state.token = normalized.token;
        state.isAuthenticated = !!normalized.token;

        if (state.user && normalized.token) {
          const keycloakUserId = decodeKeycloakUserIdFromToken(normalized.token);
          if (keycloakUserId) {
            state.user.keycloakUserId = keycloakUserId;
          }
        }
      })
      .addCase(loginThunk.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload || "Đăng nhập thất bại";
      })

      // REGISTER
      .addCase(registerThunk.pending, (state) => {
        state.loading = true;
        state.error = null;
        state.registerSuccessMessage = null;
      })
      .addCase(registerThunk.fulfilled, (state, action) => {
        const normalized = normalizeAuthResponse(action.payload);

        state.loading = false;
        state.error = null;
        state.registerSuccessMessage =
          normalized.message || "Đăng ký thành công";

        if (normalized.token) {
          state.user = normalized.user;
          state.token = normalized.token;
          state.isAuthenticated = true;

          if (state.user) {
            const keycloakUserId = decodeKeycloakUserIdFromToken(normalized.token);
            if (keycloakUserId) {
              state.user.keycloakUserId = keycloakUserId;
            }
          }
        }
      })
      .addCase(registerThunk.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload || "Đăng ký thất bại";
      })

      // REFRESH
      .addCase(refreshThunk.pending, (state) => {
        state.loading = true;
        state.error = null;
        state.registerSuccessMessage = null;
      })
      .addCase(refreshThunk.fulfilled, (state, action) => {
        const normalized = normalizeAuthResponse(action.payload);

        state.loading = false;
        state.error = null;
        // Response refresh thường chỉ có access token mới. Giữ user object cũ
        // trừ khi backend trả user payload mới. Nếu không, silent refresh có thể
        // làm header/profile tạm mất thông tin user.
        if (normalized.user) {
          state.user = normalized.user;
        }
        if (normalized.token) {
          state.token = normalized.token;
        }

        // Token refresh có thể đổi access token mới => decode lại `sub`.
        const keycloakUserId = decodeKeycloakUserIdFromToken(state.token);
        if (state.user && keycloakUserId) {
          state.user.keycloakUserId = keycloakUserId;
        }
        state.isAuthenticated = !!state.token;
      })
      .addCase(refreshThunk.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload || "Refresh token thất bại";
      })

      // FETCH ME
      .addCase(fetchMeThunk.fulfilled, (state, action) => {
        const payload = isRecord(action.payload) ? action.payload : null;
        const profile = getRecordValue(payload, "data") ?? payload;
        if (profile) {
          const tokenArg = action.meta.arg as string | undefined;
          const decodedKeycloakUserId = decodeKeycloakUserIdFromToken(tokenArg);

          // /me là nguồn profile detail không phải lúc nào cũng có trong token
          // response. Persist merged user giúp behavior sau reload nhất quán với
          // UI hiện tại trong memory.
          const firstName = getStringValue(profile, "firstName") ?? "";
          const lastName = getStringValue(profile, "lastName") ?? "";
          const fullName = getStringValue(profile, "fullName");
          const avatar = getStringValue(profile, "avatarUrl");
          state.user = {
            ...state.user,
            id: getStringValue(profile, "userId") ?? state.user?.id,
            keycloakUserId:
              getStringValue(profile, "keycloakUserId") ??
              decodedKeycloakUserId ??
              state.user?.keycloakUserId ??
              // fallback cuối chỉ dùng nếu decode JWT thất bại (tránh làm sai khi
              // message-service dùng keycloak UUID thật).
              getStringValue(profile, "userId") ??
              state.user?.id,
            email: getStringValue(profile, "email") ?? state.user?.email,
            name:
              (fullName ?? `${firstName} ${lastName}`.trim()) ||
              state.user?.name,
            fullName: fullName ?? undefined,
            avatarUrl: avatar,
            firstName,
            lastName,
            dateOfBirth: getStringValue(profile, "dateOfBirth") ?? undefined,
            gender: getStringValue(profile, "gender") ?? undefined,
            bio: getStringValue(profile, "bio") ?? undefined,
            isHost: getBooleanValue(profile, "isHost"),
          };
          saveAuthToStorage({ user: state.user });
        }
      });
  },
});

export const { hydrateAuthFromStorage, clearAuthMessages, logout } =
  authSlice.actions;

export const selectAuthState = (state: RootState) => state.auth;

export default authSlice.reducer;
