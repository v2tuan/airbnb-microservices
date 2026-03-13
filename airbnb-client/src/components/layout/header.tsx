import { Search, Globe, Menu, User, Home, GlobeIcon, MenuIcon } from "lucide-react"

import Link from "next/link"
import SearchBar from "./search-bar"

function Header() {
  return (
    <header className="fixed w-full bg-white z-50 border-b py-4">
      <div className="mx-auto px-4 flex items-center justify-between">
        {/* logo */}
        <Link href="/" className="text-rose-400 font-bold text-2xl">airbnb</Link>

        {/* Navigation */}
        <nav className="hidden md:flex items-center space-x-20 text-gray-600 font-medium">
          <Link href="/" className="hover:text-black transition">Home</Link>
          <Link href="/experiences" className="hover:text-black transition">Experiences</Link>
          <Link href="/services" className="hover:text-black transition">Services</Link>
        </nav>

        <div className="flex justify-between space-x-6">
          <button className="text-sm hidden lg:flex">Become a host</button>
          <GlobeIcon/>
          <div className="">
            <MenuIcon/>
          </div>
        </div>
      </div>
      
        <SearchBar/>
    </header>
  )
}

export default Header