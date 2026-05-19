"use client";

import { cn } from "@/lib/utils";
import { usePathname } from "next/navigation";

export default function RouteContentOffset({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const isMessagesRoute = pathname?.startsWith("/guest/messages");

  return (
    <div className={cn(isMessagesRoute ? "pt-30" : "pt-65")}>
      {children}
    </div>
  );
}
