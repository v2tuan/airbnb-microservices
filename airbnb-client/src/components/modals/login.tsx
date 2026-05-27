"use client";

import { X } from "lucide-react";
import { AuthCard, LoginForm } from "@/components/auth";
import useLoginModal from "@/hooks/userLoginModal";
import useRegisterModal from "@/hooks/userRegisterModal";

function LoginModal() {
  const loginModal = useLoginModal();
  const registerModal = useRegisterModal();

  const handleSwitchToRegister = () => {
    loginModal.onClose();
    registerModal.onOpen();
  };

  if (!loginModal.isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4">
      <AuthCard
        title="Log in"
        className="relative z-[60] max-w-[400px]"
        headerAction={
          <button
            type="button"
            onClick={loginModal.onClose}
            className="cursor-pointer rounded-full p-2 transition hover:bg-gray-100"
            aria-label="Close login modal"
          >
            <X size={16} />
          </button>
        }
      >
        <LoginForm
          onSuccess={loginModal.onClose}
          onSwitchToRegister={handleSwitchToRegister}
        />
      </AuthCard>
    </div>
  );
}

export default LoginModal;
