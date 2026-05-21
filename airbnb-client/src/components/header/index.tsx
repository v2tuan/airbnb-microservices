"use client"

import { usePathname } from "next/navigation"
import MainHeader from "./main-header"
import SecondaryHeader from "./secondary-header"

function Header() {
  const pathname = usePathname()

  if (pathname === "/" || pathname?.startsWith("/rooms")) {
    return <MainHeader />
  }

  return <SecondaryHeader />
}

export default Header
