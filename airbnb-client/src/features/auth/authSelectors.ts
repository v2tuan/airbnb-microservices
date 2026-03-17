import { RootState } from "@/store";

export const selectAuth = (state: RootState) => state.auth;

export const selectAuthLoading = (state: RootState) => state.auth.loading;

export const selectAuthError = (state: RootState) => state.auth.error;

export const selectIsAuthenticated = (state: RootState) =>
  state.auth.isAuthenticated;

export const selectCurrentUser = (state: RootState) => state.auth.user;

export const selectRegisterSuccessMessage = (state: RootState) =>
  state.auth.registerSuccessMessage;