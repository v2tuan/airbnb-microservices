"use client"

import { GlobeIcon } from "lucide-react"
import Link from "next/link"
import { useSelector } from "react-redux"
import Logo from "../logo"
import SearchBar from "./search-bar"
import UserMenu from "./user-menu"
import { selectCurrentUser, selectIsAuthenticated } from "@/features/auth/authSelectors"
import Image from "next/image"

function Header() {
  const user = useSelector(selectCurrentUser)
  const isAuthenticated =  useSelector(selectIsAuthenticated)
  return (
    <header className="fixed w-full bg-white z-40 border-b py-4 md:px-3 lg:px-20 lg:pt-5">
      <div className="mx-auto px-4 flex items-center justify-between">
        {/* logo */}
        <Logo/>

        {/* Navigation */}
        <nav className="hidden md:flex items-center space-x-20 text-gray-600 font-medium">
          <Link href="/" className="text-black transition flex flex-row items-center">
            <Image 
              src="/header/home.png" 
              alt="home indicator"
              width={80} // Tương đương size={12} bạn muốn
              height={12}
              className="object-contain"
            />
            Homes
          </Link>            
          <Link href="/experiences" className="text-black transition flex flex-row items-center">
            <Image 
              src="/header/experience.png" 
              alt="home indicator"
              width={80} // Tương đương size={12} bạn muốn
              height={12}
              className="object-contain"
            />
            Experiences
          </Link>   
          <Link href="/services" className="text-black transition flex flex-row items-center">
            <Image 
              src="/header/services.png" 
              alt="home indicator"
              width={80} // Tương đương size={12} bạn muốn
              height={12}
              className="object-contain"
            />
            Services
          </Link>   
        </nav>

        <div className="flex justify-between space-x-6">
          <button type="button" className="text-sm hidden lg:flex">Become a host</button>
          {isAuthenticated && user?.avatarUrl ? (
          <Image
            src={user.avatarUrl}
            alt="avatar"
            width={32}
            height={32}
            className="w-8 h-8 rounded-full object-cover cursor-pointer"
          />
        ) : (
          <GlobeIcon />
        )}
          <UserMenu/>
        </div>
      </div>
      
      <SearchBar/>
    </header>
  )
}

export default Header