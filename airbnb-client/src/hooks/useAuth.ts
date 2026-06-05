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
      // `keycloakUserId` dùng cho chat (senderId/participants) nên không
      // fallback nhầm sang `user.id` (pin UUID).
      keycloakUserId: auth.user.keycloakUserId ?? auth.user._id,
      _id: auth.user._id ?? auth.user.id,
    };
  }, [auth.user]);

  return {
    ...auth,
    user,
  };
};