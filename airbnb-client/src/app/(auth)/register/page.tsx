"use client";

import { useRouter } from "next/navigation";

import { AuthCard, AuthPageShell, RegisterForm } from "@/components/auth";

export default function RegisterPage() {
  const router = useRouter();

  return (
    <AuthPageShell>
      <AuthCard
        title="Sign up"
        className="max-w-[540px]"
        contentClassName="sm:p-8"
      >
        <RegisterForm mode="page" onSuccess={() => router.push("/login")} />
      </AuthCard>
    </AuthPageShell>
  );
}
