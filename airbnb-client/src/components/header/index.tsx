import { Search, Globe, Menu, User, Home, GlobeIcon, MenuIcon } from "lucide-react"

import Link from "next/link"
import SearchBar from "./search-bar"
import UserMenu from "./user-menu"
import Logo from "../logo"

function Header() {
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
          <button className="text-sm hidden lg:flex">Become a host</button>
          <GlobeIcon/>
          <UserMenu/>
        </div>
      </div>
      
      <SearchBar/>
    </header>
  )
}

export default Header