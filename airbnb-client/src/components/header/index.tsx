"use client"

import { GlobeIcon } from "lucide-react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { useSelector } from "react-redux"
import Logo from "../logo"
import SearchBar from "./search-bar"
import UserMenu from "./user-menu"
import { selectCurrentUser, selectIsAuthenticated } from "@/features/auth/authSelectors"
import Image from "next/image"

function Header() {
  const user = useSelector(selectCurrentUser)
  const isAuthenticated =  useSelector(selectIsAuthenticated)
  const pathname = usePathname()
  const isMessagesRoute = pathname?.startsWith("/guest/messages")

  const fallbackInitial = (user?.name?.trim()?.charAt(0) || "D").toUpperCase()

  if (isMessagesRoute) {
    return (
      <header className="fixed w-full border-b border-zinc-200 bg-zinc-100 py-5 md:px-3 lg:px-6 z-40">
        <div className="mx-auto flex items-center justify-between px-4">
          <Logo/>

          <div className="flex items-center gap-4">
            <Link href="/users/profile/about?editMode=true" className="hidden text-sm font-semibold text-zinc-800 transition hover:text-black lg:flex">
              Become a host
            </Link>

            {isAuthenticated && user?.avatarUrl ? (
              <Image
                src={user.avatarUrl}
                alt="avatar"
                width={44}
                height={44}
                className="h-11 w-11 rounded-full object-cover"
              />
            ) : (
              <div className="flex h-11 w-11 items-center justify-center rounded-full bg-zinc-900 text-sm font-semibold text-white">
                {fallbackInitial}
              </div>
            )}

            <UserMenu buttonClassName="flex h-11 w-11 items-center justify-center rounded-full bg-zinc-200 transition hover:bg-zinc-300" />
          </div>
        </div>
      </header>
    )
  }

  return (
    <header className="fixed w-full bg-white z-40 border-b py-4 md:px-3 lg:px-20 lg:pt-5">
      <div className="mx-auto px-4 flex items-center justify-between">
        {/* logo */}
        <Logo/>

  // HOME + ROOM DETAIL
  if (isHomePage || isRoomPage) {
    return <MainHeader />
  }

  // DEFAULT USER PAGES
  return <SecondaryHeader />
}

export default Header