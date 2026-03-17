import { createSlice, createAsyncThunk, PayloadAction } from "@reduxjs/toolkit";
import authAPI from "@/api/endpoints/auth";
import { RootState } from "@/store";

const TOKEN_KEY = "access_token";
const USER_KEY = "auth_user";

<<<<<<< HEAD
const isBrowser = typeof window !== "undefined";

=======
>>>>>>> 3e6c73e5eca1eeec4c4fc3f4770924716d82caac
interface User {
  id?: string;
  email?: string;
  name?: string;
  [key: string]: any;
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
  name?: string;
}

const loadUserFromStorage = (): User | null => {
<<<<<<< HEAD
  if (!isBrowser) return null;
=======
>>>>>>> 3e6c73e5eca1eeec4c4fc3f4770924716d82caac
  try {
    const raw = localStorage.getItem(USER_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
};

const saveAuthToStorage = ({
  token,
  user,
}: {
  token?: string | null;
  user?: User | null;
}) => {
<<<<<<< HEAD
  if (!isBrowser) return

=======
>>>>>>> 3e6c73e5eca1eeec4c4fc3f4770924716d82caac
  if (token) {
    localStorage.setItem(TOKEN_KEY, token);
  }

  if (user) {
    localStorage.setItem(USER_KEY, JSON.stringify(user));
  }
};

const clearAuthStorage = () => {
<<<<<<< HEAD
  if (!isBrowser) return;
=======
>>>>>>> 3e6c73e5eca1eeec4c4fc3f4770924716d82caac
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(USER_KEY);
};

const getErrorMessage = (error: any, fallbackMessage: string): string => {
  return (
    error?.response?.data?.message ||
<<<<<<< HEAD
    error?.response?.data?.error_description ||
=======
>>>>>>> 3e6c73e5eca1eeec4c4fc3f4770924716d82caac
    error?.response?.data?.error ||
    error?.message ||
    fallbackMessage
  );
};

const normalizeAuthResponse = (payload: any) => {
  const body = payload?.data ?? payload ?? {};

  return {
    token: body.access_token ?? body.accessToken ?? null,
    user: body.user ?? null,
    message: body.message ?? payload?.message ?? null,
  };
};

<<<<<<< HEAD
// fetchMeThunk declared first so loginThunk can reference it
export const fetchMeThunk = createAsyncThunk<
  any,
  string,
  { rejectValue: string }
>("auth/fetchMe", async (token, { rejectWithValue }) => {
  try {
    const response = await authAPI.getMe(token);
    return response.data;
  } catch (error: any) {
    return rejectWithValue(getErrorMessage(error, "Không thể lấy thông tin người dùng"));
  }
});

=======
>>>>>>> 3e6c73e5eca1eeec4c4fc3f4770924716d82caac
export const loginThunk = createAsyncThunk<
  any,
  LoginCredentials,
  { rejectValue: string }
<<<<<<< HEAD
>("auth/login", async (credentials, { rejectWithValue, dispatch }) => {
=======
>("auth/login", async (credentials, { rejectWithValue }) => {
>>>>>>> 3e6c73e5eca1eeec4c4fc3f4770924716d82caac
  try {
    const response = await authAPI.login(credentials);
    const normalized = normalizeAuthResponse(response.data);

    if (normalized.token || normalized.user) {
      saveAuthToStorage(normalized);
    }

<<<<<<< HEAD
    if (normalized.token) {
      dispatch(fetchMeThunk(normalized.token));
    }

=======
>>>>>>> 3e6c73e5eca1eeec4c4fc3f4770924716d82caac
    return response.data;
  } catch (error: any) {
    return rejectWithValue(getErrorMessage(error, "Đăng nhập thất bại"));
  }
});

export const registerThunk = createAsyncThunk<
  any,
  RegisterData,
  { rejectValue: string }
>("auth/register", async (userData, { rejectWithValue }) => {
  try {
    const response = await authAPI.register(userData);
<<<<<<< HEAD
=======
    const normalized = normalizeAuthResponse(response.data);

>>>>>>> 3e6c73e5eca1eeec4c4fc3f4770924716d82caac
    return response.data;
  } catch (error: any) {
    return rejectWithValue(getErrorMessage(error, "Đăng ký thất bại"));
  }
});

const initialState: AuthState = {
  user: loadUserFromStorage(),
<<<<<<< HEAD
  token: isBrowser ? localStorage.getItem(TOKEN_KEY) : null,
  isAuthenticated: isBrowser ? !!localStorage.getItem(TOKEN_KEY) : false ,
=======
  token: localStorage.getItem(TOKEN_KEY),
  isAuthenticated: !!localStorage.getItem(TOKEN_KEY),
>>>>>>> 3e6c73e5eca1eeec4c4fc3f4770924716d82caac
  loading: false,
  error: null,
  registerSuccessMessage: null,
};

const authSlice = createSlice({
  name: "auth",
  initialState,
  reducers: {
    clearAuthMessages: (state) => {
      state.error = null;
      state.registerSuccessMessage = null;
    },

    logout: (state) => {
      clearAuthStorage();
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
      .addCase(loginThunk.fulfilled, (state, action: PayloadAction<any>) => {
        const normalized = normalizeAuthResponse(action.payload);

        state.loading = false;
        state.error = null;
        state.user = normalized.user;
        state.token = normalized.token;
        state.isAuthenticated = !!normalized.token;
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
      .addCase(registerThunk.fulfilled, (state, action: PayloadAction<any>) => {
        const normalized = normalizeAuthResponse(action.payload);

        state.loading = false;
        state.error = null;
        state.registerSuccessMessage =
          normalized.message || "Đăng ký thành công";

        if (normalized.token) {
          state.user = normalized.user;
          state.token = normalized.token;
          state.isAuthenticated = true;
        }
      })
      .addCase(registerThunk.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload || "Đăng ký thất bại";
<<<<<<< HEAD
      })

      // FETCH ME
      .addCase(fetchMeThunk.fulfilled, (state, action: PayloadAction<any>) => {
        const profile = action.payload?.data ?? action.payload ?? null;
        if (profile) {
          const avatar = profile.avatarUrl ?? null;
          state.user = {
            ...state.user,
            id: profile.userId ?? state.user?.id,
            email: profile.email ?? state.user?.email,
            name: (profile.fullName ?? `${profile.firstName ?? ""} ${profile.lastName ?? ""}`.trim()) || state.user?.name,
            avatarUrl: avatar,
            firstName: profile.firstName,
            lastName: profile.lastName,
            isHost: profile.isHost,
          };
          saveAuthToStorage({ user: state.user });
        }
=======
>>>>>>> 3e6c73e5eca1eeec4c4fc3f4770924716d82caac
      });
  },
});

export const { clearAuthMessages, logout } = authSlice.actions;

export const selectAuthState = (state: RootState) => state.auth;

export default authSlice.reducer;