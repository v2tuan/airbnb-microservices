import type { ReactNode } from "react";
import AppShell from "@/layouts/app-shell";
import { cn } from "@/lib/utils";

type AuthLayoutProps = {
  children: ReactNode;
  header?: ReactNode;
  footer?: ReactNode;
  className?: string;
  contentClassName?: string;
};

export default function AuthLayout({
  children,
  header,
  footer,
  className,
  contentClassName,
}: AuthLayoutProps) {
  return (
    <AppShell
      className={className}
      contentClassName={cn(
        "flex min-h-screen items-center justify-center px-4 py-10",
        contentClassName,
      )}
      footer={footer}
      header={header}
    >
      {children}
    </AppShell>
  );
}
