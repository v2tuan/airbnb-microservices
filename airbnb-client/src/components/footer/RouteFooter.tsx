"use client";

import { usePathname } from "next/navigation";
import Footer from "@/components/footer";

export default function RouteFooter() {
  const pathname = usePathname();
  const shouldHideFooter =
    pathname === "/host/listings/new" ||
    (pathname?.startsWith("/host/listings/") ?? false) ||
    (pathname?.startsWith("/rooms/") ?? false);

  if (shouldHideFooter) {
    return null;
  }

  return <Footer />;
}
