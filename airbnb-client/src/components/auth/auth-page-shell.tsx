import Link from "next/link";
import type { ReactNode } from "react";

import Logo from "@/components/logo";
import AuthLayout from "@/layouts/auth-layout";

type AuthPageShellProps = {
  children: ReactNode;
};

export function AuthPageShell({ children }: AuthPageShellProps) {
  return (
    <AuthLayout
      className="bg-[#f7f7f7]"
      contentClassName="h-dvh overflow-hidden px-4 py-0 sm:px-6"
      header={
        <header className="fixed left-0 right-0 top-0 z-20 border-b border-[#ebebeb] bg-white/95 px-5 py-4 backdrop-blur">
          <div className="mx-auto flex max-w-6xl items-center justify-between">
            <Logo />
            <Link
              href="/"
              className="rounded-full px-4 py-2 text-sm font-semibold text-[#222222] transition hover:bg-[#f7f7f7]"
            >
              Back to stays
            </Link>
          </div>
        </header>
      }
    >
      <div className="mx-auto flex h-full w-full max-w-6xl items-center justify-center pb-6 pt-20">
        {children}
      </div>
    </AuthLayout>
  );
}
