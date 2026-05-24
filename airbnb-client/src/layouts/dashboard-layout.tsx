import type { ReactNode } from "react";

import Footer from "@/components/footer";
import HostHeader from "@/components/header/host-header";
import AppShell from "@/layouts/app-shell";
import { cn } from "@/lib/utils";

type DashboardLayoutProps = {
  children: ReactNode;
  header?: ReactNode;
  footer?: ReactNode;
  sidebar?: ReactNode;
  showFooter?: boolean;
  className?: string;
  contentClassName?: string;
  mainClassName?: string;
};

export default function DashboardLayout({
  children,
  header,
  footer,
  sidebar,
  showFooter = true,
  className,
  contentClassName,
  mainClassName,
}: DashboardLayoutProps) {
  return (
    <AppShell
      className={className}
      contentClassName={cn("pt-20", contentClassName)}
      footer={showFooter ? (footer ?? <Footer />) : null}
      header={header ?? <HostHeader />}
      mainClassName={mainClassName}
      sidebar={sidebar}
    >
      {children}
    </AppShell>
  );
}
