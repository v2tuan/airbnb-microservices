"use client";

import type React from "react";
import { useEffect } from "react";
import { Provider, useDispatch, useSelector } from "react-redux";
import { AuthSessionHandler } from "@/components/auth/auth-session-handler";
import { selectIsAuthenticated } from "@/features/auth/authSelectors";
import {
  fetchMeThunk,
  hydrateAuthFromStorage,
} from "@/features/auth/authSlice";
import type { AppDispatch, RootState } from "@/store";
import { store } from "@/store";
import SocketProvider from "./SocketProvider";

function AuthInitializer() {
  const dispatch = useDispatch<AppDispatch>();
  const isAuthenticated = useSelector(selectIsAuthenticated);
  const token = useSelector((state: RootState) => state.auth.token);

  useEffect(() => {
    // Lần render client đầu tiên: dựng lại Redux auth state từ localStorage.
    // Nếu thiếu hydrate này, sau khi reload trang localStorage vẫn có access
    // token hợp lệ nhưng UI sẽ tạm nghĩ user đang anonymous.
    dispatch(hydrateAuthFromStorage());
  }, [dispatch]);

  useEffect(() => {
    const handleTokenRefreshed = () => {
      // Axios refresh cập nhật localStorage bên ngoài Redux. Event này là cầu
      // nối để Redux sync lại sau một lần silent refresh token.
      dispatch(hydrateAuthFromStorage());
    };

    window.addEventListener("auth-token-refreshed", handleTokenRefreshed);
    return () =>
      window.removeEventListener("auth-token-refreshed", handleTokenRefreshed);
  }, [dispatch]);

  useEffect(() => {
    if (isAuthenticated && token) {
      // Đồng bộ user profile theo token hiện tại. Cố ý tách khỏi interceptor:
      // refresh token là concern recover network request, còn /me là concern
      // hydrate UI state.
      //
      // Debug tip: nếu Network tab hiển thị /refresh xong gọi /me, effect này
      // thường là lý do. Nếu thấy quá nhiều request, chỉ fetch /me sau
      // login/reload hoặc sau flow đổi role/profile.
      dispatch(fetchMeThunk(token));
    }
  }, [dispatch, isAuthenticated, token]);

  return null;
}

function Providers({ children }: { children: React.ReactNode }) {
  return (
    <Provider store={store}>
      <AuthInitializer />
      <AuthSessionHandler />
      <SocketProvider>{children}</SocketProvider>
    </Provider>
  );
}

export default Providers;
