"use client";

import { usePathname, useRouter } from "next/navigation";
import { useEffect } from "react";
import { useDispatch } from "react-redux";
import { toast } from "sonner";
import { logout } from "@/features/auth/authSlice";
import { useWishlistStore } from "@/hooks/useWishlistStore";
import {
  AUTH_SESSION_EXPIRED_EVENT,
  SESSION_EXPIRED_MESSAGE,
} from "@/lib/auth-session";
import type { AppDispatch } from "@/store";

export function AuthSessionHandler() {
  const dispatch = useDispatch<AppDispatch>();
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    const handleSessionExpired = () => {
      /*
       * Runtime flow:
       * refresh fail trong Axios interceptor
       * ->
       * interceptor clear storage và phát auth-session-expired
       * ->
       * React-side handler này clear Redux/cache, show một toast, và điều hướng
       * user về /login
       *
       * Đặt logic này trong client component là cần thiết vì router, Redux hook,
       * và toast rendering đều là concern của React. Nếu interceptor tự làm các
       * UI side effect này, network infrastructure sẽ bị coupling chặt với
       * Next.js navigation và khó test/debug hơn.
       */
      dispatch(logout());
      useWishlistStore.getState().reset();

      toast.warning(SESSION_EXPIRED_MESSAGE, {
        id: AUTH_SESSION_EXPIRED_EVENT,
      });

      if (pathname !== "/login") {
        router.replace("/login");
      }
    };

    window.addEventListener(AUTH_SESSION_EXPIRED_EVENT, handleSessionExpired);

    return () => {
      window.removeEventListener(
        AUTH_SESSION_EXPIRED_EVENT,
        handleSessionExpired,
      );
    };
  }, [dispatch, pathname, router]);

  return null;
}
