<<<<<<< HEAD
"use client"

import { GlobeIcon } from "lucide-react"
import Link from "next/link"
import { useSelector } from "react-redux"
import Logo from "../logo"
import SearchBar from "./search-bar"
import UserMenu from "./user-menu"
import { selectCurrentUser, selectIsAuthenticated } from "@/features/auth/authSelectors"

function Header() {
  const user = useSelector(selectCurrentUser)
  const isAuthenticated =  useSelector(selectIsAuthenticated)
=======
import { Search, Globe, Menu, User, Home, GlobeIcon, MenuIcon } from "lucide-react"

import Link from "next/link"
import SearchBar from "./search-bar"
import UserMenu from "./user-menu"
import Logo from "../logo"

function Header() {
>>>>>>> 3e6c73e5eca1eeec4c4fc3f4770924716d82caac
  return (
    <header className="fixed w-full bg-white z-40 border-b py-4 md:px-10 lg:px-20 lg:pt-5">
      <div className="mx-auto px-4 flex items-center justify-between">
        {/* logo */}
        <Logo/>

        {/* Navigation */}
        <nav className="hidden md:flex items-center space-x-20 text-gray-600 font-medium">
          <Link href="/" className="hover:text-black transition">Home</Link>
          <Link href="/experiences" className="hover:text-black transition">Experiences</Link>
          <Link href="/services" className="hover:text-black transition">Services</Link>
        </nav>

        <div className="flex justify-between space-x-6">
<<<<<<< HEAD
          <button type="button" className="text-sm hidden lg:flex">Become a host</button>
          {isAuthenticated && user?.avatarUrl  ? (
            <img
              src={user.avatarUrl}
              alt="avatar"
              className="w-8 h-8 rounded-full object-cover cursor-pointer"
            />
          ) : (
            <GlobeIcon/>
          )}
=======
          <button className="text-sm hidden lg:flex">Become a host</button>
          <GlobeIcon/>
>>>>>>> 3e6c73e5eca1eeec4c4fc3f4770924716d82caac
          <UserMenu/>
        </div>
      </div>
      
      <SearchBar/>
    </header>
  )
}

export default Header