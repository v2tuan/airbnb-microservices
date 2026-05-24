import type { ReactNode } from "react";

import { cn } from "@/lib/utils";

type AppShellProps = {
  children: ReactNode;
  header?: ReactNode;
  footer?: ReactNode;
  sidebar?: ReactNode;
  className?: string;
  contentClassName?: string;
  mainClassName?: string;
};

export default function AppShell({
  children,
  header,
  footer,
  sidebar,
  className,
  contentClassName,
  mainClassName,
}: AppShellProps) {
  return (
    <div
      className={cn("min-h-screen bg-background text-foreground", className)}
    >
      {header}

      {sidebar ? (
        <div className={cn("flex min-h-screen", contentClassName)}>
          {sidebar}
          <main className={cn("min-w-0 flex-1", mainClassName)}>
            {children}
          </main>
        </div>
      ) : (
        <main className={cn("min-h-screen", contentClassName, mainClassName)}>
          {children}
        </main>
      )}

      {footer}
    </div>
  );
}
