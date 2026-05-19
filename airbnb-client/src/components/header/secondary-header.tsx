"use client"

import Logo from "../logo"
import UserMenu from "./user-menu"
import Link from "next/link"
import {usePathname} from "next/navigation";
import {useSelector} from "react-redux";
import {selectCurrentUser, selectIsAuthenticated} from "@/features/auth/authSelectors";
import {RootState} from "@/store";
import {useEffect, useState} from "react";
import {hasRealmRole} from "@/lib/jwt";
import {GlobeIcon} from "lucide-react";
import Image from "next/image";

function SecondaryHeader() {
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
        <header className="fixed top-0 left-0 right-0 z-50 border-b bg-white">
            <div className="mx-auto flex h-20 items-center justify-between px-6 lg:px-10">
                {/* Left */}
                <Logo />

                {/* Right side */}
                <div className="flex items-center space-x-6 text-black">
                    {token && <Link
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
                    }

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

export default SecondaryHeader