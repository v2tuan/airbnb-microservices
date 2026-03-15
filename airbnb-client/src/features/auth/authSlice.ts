import { createSlice, createAsyncThunk, PayloadAction } from "@reduxjs/toolkit";
import authAPI from "@/api/endpoints/auth";
import { RootState } from "@/store";

const TOKEN_KEY = "access_token";
const USER_KEY = "auth_user";

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
  if (token) {
    localStorage.setItem(TOKEN_KEY, token);
  }

  if (user) {
    localStorage.setItem(USER_KEY, JSON.stringify(user));
  }
};

const clearAuthStorage = () => {
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(USER_KEY);
};

const getErrorMessage = (error: any, fallbackMessage: string): string => {
  return (
    error?.response?.data?.message ||
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

export const loginThunk = createAsyncThunk<
  any,
  LoginCredentials,
  { rejectValue: string }
>("auth/login", async (credentials, { rejectWithValue }) => {
  try {
    const response = await authAPI.login(credentials);
    const normalized = normalizeAuthResponse(response.data);

    if (normalized.token || normalized.user) {
      saveAuthToStorage(normalized);
    }

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
    const normalized = normalizeAuthResponse(response.data);

    return response.data;
  } catch (error: any) {
    return rejectWithValue(getErrorMessage(error, "Đăng ký thất bại"));
  }
});

const initialState: AuthState = {
  user: loadUserFromStorage(),
  token: localStorage.getItem(TOKEN_KEY),
  isAuthenticated: !!localStorage.getItem(TOKEN_KEY),
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
      });
  },
});

export const { clearAuthMessages, logout } = authSlice.actions;

export const selectAuthState = (state: RootState) => state.auth;

export default authSlice.reducer;