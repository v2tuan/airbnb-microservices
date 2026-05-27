"use client";

import { X } from "lucide-react";
import { AuthCard, RegisterForm } from "@/components/auth";
import useLoginModal from "@/hooks/userLoginModal";
import useRegisterModal from "@/hooks/userRegisterModal";

function RegisterModal() {
  const registerModal = useRegisterModal();
  const loginModal = useLoginModal();

  const handleSwitchToLogin = () => {
    registerModal.onClose();
    loginModal.onOpen();
  };

  const handleSuccess = () => {
    registerModal.onClose();
    loginModal.onOpen();
  };

  if (!registerModal.isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4">
      <AuthCard
        title="Sign up"
        className="relative z-[60] max-h-[calc(100dvh-2rem)] max-w-[500px]"
        headerAction={
          <button
            type="button"
            onClick={registerModal.onClose}
            className="cursor-pointer rounded-full p-2 transition hover:bg-gray-100"
            aria-label="Close register modal"
          >
            <X size={16} />
          </button>
        }
      >
        <RegisterForm
          onSuccess={handleSuccess}
          onSwitchToLogin={handleSwitchToLogin}
        />
      </AuthCard>
    </div>
  );
}

export default RegisterModal;
