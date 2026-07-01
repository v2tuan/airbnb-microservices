"use client"

import {GlobeIcon, Search} from "lucide-react"
import Link from "next/link"
import { useSelector } from "react-redux"
import Logo from "../logo"
import SearchBar from "./search-bar"
import NotificationBell from "./notification-bell"
import UserMenu from "./user-menu"
import { selectCurrentUser, selectIsAuthenticated } from "@/features/auth/authSelectors"
import Image from "next/image"
import { RootState } from "@/store"
import { useEffect, useMemo, useState, useRef } from "react"
import { hasRealmRole } from "@/lib/jwt"
import { usePathname } from "next/navigation"
import { cn } from "@/lib/utils"

function useIsDetailPage() {
    const pathname = usePathname()

    return pathname.startsWith("/rooms")
}

function CompactSearchBar({ onClick }: { onClick: () => void }) {
    return (
        <button
            onClick={onClick}
            className="flex h-12 items-center overflow-hidden rounded-full border border-gray-300 bg-white shadow-sm transition hover:shadow-md"
        >
            {/* Anywhere */}
            <div className="relative flex h-full items-center gap-2 px-4">
                <Image
                    src="/header/home.png"
                    alt="home indicator"
                    width={80}
                    height={20}
                    className="h-auto w-12 object-contain"
                />

                <span className="text-sm font-semibold whitespace-nowrap">
          Anywhere
        </span>

                <div className="absolute right-0 top-1/2 h-6 w-px -translate-y-1/2 bg-gray-300" />
            </div>

            {/* Anytime */}
            <div className="relative flex h-full items-center px-4">
        <span className="text-sm font-semibold whitespace-nowrap">
          Anytime
        </span>

                <div className="absolute right-0 top-1/2 h-6 w-px -translate-y-1/2 bg-gray-300" />
            </div>

            {/* Guests */}
            <div className="flex h-full items-center gap-2 pl-4 pr-2">
        <span className="text-sm font-semibold whitespace-nowrap">
          Add guests
        </span>

                <div className="rounded-full bg-[#e51d54] p-1.5 text-white">
                    <Search className="h-4 w-4" strokeWidth={2} />
                </div>
            </div>
        </button>
    )
}

function MainHeader() {
    const user = useSelector(selectCurrentUser)
    const isAuthenticated = useSelector(selectIsAuthenticated)
    const token = useSelector((state: RootState) => state.auth.token)

    const isHost = useMemo(() => !!token && hasRealmRole(token, "HOST"), [token])

    const isDetailPage = useIsDetailPage()

    const [searchExpanded, setSearchExpanded] = useState(false)

    const pathname = usePathname()

    const navItems = [
        {
            label: "Homes",
            href: "/",
            icon: "/header/home.png",
        },
        {
            label: "Experiences",
            href: "/experiences",
            icon: "/header/experience.png",
        },
        {
            label: "Services",
            href: "/services",
            icon: "/header/services.png",
        },
    ]

    /**
     * NEW
     * Detect scroll state
     */
    const [isScrolled, setIsScrolled] = useState(false)

    const headerRef = useRef<HTMLDivElement>(null)

    /**
     * NEW
     * Khi scroll xuống -> compact mode
     * Khi quay về top -> full mode
     */
    useEffect(() => {
        const handleScroll = () => {
            const scrollTop = window.scrollY

            setIsScrolled(scrollTop > 40)

            /**
             * Nếu kéo lên top thì tự đóng expanded state
             * để quay lại layout ban đầu
             */
            if (scrollTop <= 10) {
                setSearchExpanded(false)
            }
        }

        handleScroll()

        window.addEventListener("scroll", handleScroll)

        return () => {
            window.removeEventListener("scroll", handleScroll)
        }
    }, [])

    /**
     * Close when click outside
     */
    useEffect(() => {
        if (!searchExpanded) return

        function handleClick(e: MouseEvent) {
            if (
                headerRef.current &&
                !headerRef.current.contains(e.target as Node)
            ) {
                setSearchExpanded(false)
            }
        }

        document.addEventListener("mousedown", handleClick)

        return () => {
            document.removeEventListener("mousedown", handleClick)
        }
    }, [searchExpanded])

    /**
     * LOGIC
     *
     * DETAIL PAGE:
     * - default compact
     * - click compact => expand
     *
     * HOME PAGE:
     * - top => full
     * - scroll => compact
     * - click compact => expand
     * - scroll back top => full again
     */
    const shouldCompact =
        (isDetailPage && !searchExpanded) ||
        (!isDetailPage && isScrolled && !searchExpanded)

    const showFullSearch = !shouldCompact

    return (
        <>
            {/* Overlay */}
            <div
                className={cn(
                    "fixed inset-0 z-30 bg-black transition-opacity duration-300",
                    searchExpanded
                        ? "opacity-40 pointer-events-auto"
                        : "opacity-0 pointer-events-none"
                )}
                onClick={() => setSearchExpanded(false)}
            />

            <header
                ref={headerRef}
                className={cn(
                    "fixed top-0 left-0 right-0 w-full bg-gray-50 z-40 border-b md:px-3 lg:px-10 transition-all duration-300 py-7",
                    // showFullSearch ? "pt-5 pb-4" : "pb-4"
                )}
            >
                {/* Top row */}
                <div className="relative mx-auto px-4 flex items-center justify-between">

                    {/* Logo */}
                    <div className="shrink-0">
                        <Logo />
                    </div>

                    {/* Center nav */}
                    <nav
                        className={cn(
                            "hidden md:flex items-center gap-3 font-medium transition-all duration-300 absolute left-1/2 -translate-x-1/2",
                            showFullSearch
                                ? "opacity-100 scale-100 translate-y-0 pointer-events-auto"
                                : "opacity-0 scale-95 -translate-y-2 pointer-events-none"
                        )}
                    >
                        {navItems.map((item) => {
                            const isActive = pathname === item.href

                            return (
                                <Link
                                    key={item.href}
                                    href={item.href}
                                    className="group relative flex flex-col items-center justify-center"
                                >
                                    <div className="flex items-center gap-1">
                                        <Image
                                            src={item.icon}
                                            alt={item.label}
                                            width={70}
                                            height={12}
                                            className="object-contain"
                                        />

                                        <span
                                            className={cn(
                                                "transition-colors duration-300",
                                                isActive
                                                    ? "text-black"
                                                    : "text-gray-500 group-hover:text-black"
                                            )}
                                        >
            {item.label}
          </span>
                                    </div>

                                    {/* Animated underline */}
                                    <div
                                        className={cn(
                                            "absolute bottom-0 h-[3px] rounded-full bg-black transition-all duration-300 ease-out",
                                            isActive
                                                ? "w-full opacity-100 scale-100"
                                                : "w-0 opacity-0 scale-0"
                                        )}
                                    />
                                </Link>
                            )
                        })}
                    </nav>

                    {/* Compact Search */}
                    {!showFullSearch && (
                        <div className="absolute left-1/2 -translate-x-1/2">
                            <CompactSearchBar
                                onClick={() => setSearchExpanded(true)}
                            />
                        </div>
                    )}

                    {/* Right side */}
                    <div className="flex items-center space-x-6">
                        <Link
                            href={
                                !token
                                    ? "/login"
                                    : isHost
                                        ? "/host"
                                        : "/host/become"
                            }
                            className="text-sm hidden lg:flex whitespace-nowrap"
                        >
                            {isHost ? "Welcoming guests" : "Become a host"}
                        </Link>

                        <NotificationBell />

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

                        <UserMenu />
                    </div>
                </div>

                {/* Search Bar */}
                <div
                    className={cn(
                        "transition-all duration-300 overflow-visible",
                        showFullSearch
                            ? "opacity-100 pointer-events-auto mt-8"
                            : "opacity-0 pointer-events-none h-0 mt-0"
                    )}
                >
                    <SearchBar className="mt-0" />
                </div>
            </header>
        </>
    )
}

export default MainHeader
