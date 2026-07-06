"use client";

import { useMemo } from "react";
import { useSelector } from "react-redux";
import { selectAuthState } from "@/features/auth/authSlice";

export const useAuth = () => {
  const auth = useSelector(selectAuthState);
  const user = useMemo(() => {
    if (!auth.user) return null;

    return {
      ...auth.user,
      // Chat và notification dùng Keycloak subject làm định danh duy nhất.
      // Không fallback sang `user.id` vì đó là Mongo user-service id.
      keycloakUserId: auth.user.keycloakUserId ?? null,
      _id: auth.user.id,
    };
  }, [auth.user]);

  return {
    ...auth,
    user,
  };
};
