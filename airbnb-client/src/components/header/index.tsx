"use client"

import { usePathname } from "next/navigation"

import MainHeader from "./main-header"
import SecondaryHeader from "./secondary-header"
import HostHeader from "./host-header"

function Header() {
  const pathname = usePathname()

  const isHomePage = pathname === "/"

  const isRoomPage = pathname.startsWith("/rooms")

  const isHostPage = pathname.startsWith("/host")

  // HOST
  if (isHostPage) {
    return <HostHeader />
  }

  // HOME + ROOM DETAIL
  if (isHomePage || isRoomPage) {
    return <MainHeader />
  }

  // DEFAULT USER PAGES
  return <SecondaryHeader />
}

export default Header