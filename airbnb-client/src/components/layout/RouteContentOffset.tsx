"use client";

import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";

export default function RouteContentOffset({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const isHomeRoute = pathname === "/";
  const isRoomRoute = pathname?.startsWith("/rooms");
  const offsetClass = isHomeRoute || isRoomRoute ? "pt-65" : "pt-20";

  return <div className={cn(offsetClass)}>{children}</div>;
}
