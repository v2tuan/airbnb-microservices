import { authStorage } from "@/lib/auth-storage";

export const AUTH_SESSION_EXPIRED_EVENT = "auth-session-expired";
export const SESSION_EXPIRED_MESSAGE =
  "Phiên đăng nhập đã hết hạn, vui lòng đăng nhập lại";

// Nhiều request có thể fail cùng lúc sau khi refresh thất bại. Flag này debounce
// event "session expired" toàn cục để user chỉ thấy một toast và một lần
// redirect, thay vì nhiều handler cạnh tranh nhau cùng chạy.
let hasSessionExpiredEventPending = false;

/**
 * Cầu nối từ code ngoài React sang React UI.
 *
 * Axios interceptor nằm ngoài React tree, nên không thể gọi useRouter(),
 * useDispatch() hoặc render toast trực tiếp một cách an toàn. Thay vào đó nó
 * phát browser event; AuthSessionHandler sẽ xử lý Redux/cache/UI.
 */
export const notifyAuthSessionExpired = () => {
  if (typeof window === "undefined" || hasSessionExpiredEventPending) return;

  hasSessionExpiredEventPending = true;
  authStorage.clearAuth();

  window.dispatchEvent(new CustomEvent(AUTH_SESSION_EXPIRED_EVENT));

  window.setTimeout(() => {
    hasSessionExpiredEventPending = false;
  }, 1000);
};
