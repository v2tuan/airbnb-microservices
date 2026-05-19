"use client"

import Link from "next/link"
import Logo from "../logo"
import UserMenu from "./user-menu"
import { cn } from "@/lib/utils"
import { usePathname } from "next/navigation"
import Image from "next/image";
import {GlobeIcon} from "lucide-react";
import {useSelector} from "react-redux";
import {selectCurrentUser, selectIsAuthenticated} from "@/features/auth/authSelectors";
import {RootState} from "@/store";
import {useEffect, useState} from "react";
import {hasRealmRole} from "@/lib/jwt";

const navItems = [
    {
        label: "Today",
        href: "/host",
    },
    {
        label: "Calendar",
        href: "/host/calendar",
    },
    {
        label: "Listings",
        href: "/host/listings",
    },
    {
        label: "Messages",
        href: "/host/messages",
    },
]

function HostHeader() {
    const pathname = usePathname()
    const user = useSelector(selectCurrentUser)
    const isAuthenticated = useSelector(selectIsAuthenticated)
    const token = useSelector((state: RootState) => state.auth.token)

    const [isHost, setIsHost] = useState(false)

    useEffect(() => {
        if (!token) return

        setIsHost(hasRealmRole(token, "HOST"))
    }, [token])

    return (
        <header className="fixed top-0 left-0 right-0 z-50 border-b bg-gray-50">
            <div className="flex h-20 items-center justify-between px-6 lg:px-10">
                {/* Left */}
                <div className="shrink-0">
                    <Logo />
                </div>

                {/* Center nav */}
                <nav className="hidden md:flex items-center gap-10">
                    {navItems.map((item) => {
                        const isActive = pathname === item.href

                        return (
                            <Link
                                key={item.href}
                                href={item.href}
                                className={cn(
                                    "relative pb-2 text-[15px] font-medium transition",
                                    isActive
                                        ? "text-black"
                                        : "text-neutral-500 hover:text-black"
                                )}
                            >
                                {item.label}

                                {isActive && (
                                    <div className="absolute bottom-0 left-0 h-[2px] w-full bg-black rounded-full" />
                                )}
                            </Link>
                        )
                    })}
                </nav>

                {/* Right side */}
                <div className="flex items-center space-x-6 text-black">
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
                        Switch to travelling
                    </Link>

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
        </header>
    )
}

export default HostHeader