"use client";

import { useEffect, useState } from "react";
import LoginModal from "@/components/modals/login";
import RegisterModal from "@/components/modals/register";
import { Toaster } from "@/components/ui/sonner";

function ModalProvider() {
  // dam bao render modal khi da mounted
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  if (!isMounted) return null;

  return (
    <>
      <LoginModal />
      <RegisterModal />
      <Toaster richColors position="top-right" />
    </>
  );
}

export default ModalProvider;
