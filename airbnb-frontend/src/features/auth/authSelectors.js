export const selectAuth = (state) => state.auth;
export const selectAuthLoading = (state) => state.auth.loading;
export const selectAuthError = (state) => state.auth.error;
export const selectIsAuthenticated = (state) => state.auth.isAuthenticated;
export const selectCurrentUser = (state) => state.auth.user;
export const selectRegisterSuccessMessage = (state) =>
    state.auth.registerSuccessMessage;