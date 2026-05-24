import type { ReactNode } from "react";

import Footer from "@/components/footer";
import MainHeader from "@/components/header/main-header";
import SecondaryHeader from "@/components/header/secondary-header";
import AppShell from "@/layouts/app-shell";
import { cn } from "@/lib/utils";

type HeaderVariant = "main" | "secondary" | "none";
type ContentOffset = "default" | "large" | "none";

type MainLayoutProps = {
  children: ReactNode;
  header?: ReactNode;
  footer?: ReactNode;
  sidebar?: ReactNode;
  headerVariant?: HeaderVariant;
  contentOffset?: ContentOffset;
  showFooter?: boolean;
  className?: string;
  contentClassName?: string;
  mainClassName?: string;
};

const contentOffsetClasses: Record<ContentOffset, string> = {
  default: "pt-20",
  large: "pt-65",
  none: "",
};

function resolveHeader(variant: HeaderVariant) {
  if (variant === "main") {
    return <MainHeader />;
  }

  if (variant === "secondary") {
    return <SecondaryHeader />;
  }

  return null;
}

export default function MainLayout({
  children,
  header,
  footer,
  sidebar,
  headerVariant = "secondary",
  contentOffset = "default",
  showFooter = true,
  className,
  contentClassName,
  mainClassName,
}: MainLayoutProps) {
  return (
    <AppShell
      className={className}
      contentClassName={cn(
        contentOffsetClasses[contentOffset],
        contentClassName,
      )}
      footer={showFooter ? (footer ?? <Footer />) : null}
      header={header ?? resolveHeader(headerVariant)}
      mainClassName={mainClassName}
      sidebar={sidebar}
    >
      {children}
    </AppShell>
  );
}
