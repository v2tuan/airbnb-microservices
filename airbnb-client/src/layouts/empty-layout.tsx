import type { ReactNode } from "react";

type EmptyLayoutProps = {
  children: ReactNode;
};

export default function EmptyLayout({ children }: EmptyLayoutProps) {
  return <>{children}</>;
}
