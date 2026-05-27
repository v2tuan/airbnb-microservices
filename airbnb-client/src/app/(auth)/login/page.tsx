"use client";

import { useRouter } from "next/navigation";

import { AuthCard, AuthPageShell, LoginForm } from "@/components/auth";

export default function LoginPage() {
  const router = useRouter();

  return (
    <AuthPageShell>
      <AuthCard
        title="Log in"
        className="max-w-[420px]"
        contentClassName="sm:p-8"
      >
        <LoginForm mode="page" onSuccess={() => router.push("/")} />
      </AuthCard>
    </AuthPageShell>
  );
}
