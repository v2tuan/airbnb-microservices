"use client"

import Link from "next/link"
import {
    Globe,
    Facebook,
    Instagram,
} from "lucide-react"

export default function Footer() {
    return (
        <footer className="border-t bg-[#f7f7f7] px-10 py-12 text-[#222222]">
            {/* Top */}
            <div className="grid grid-cols-1 gap-10 md:grid-cols-3">
                {/* Support */}
                <div className="space-y-5">
                    <h3 className="text-sm font-semibold">Support</h3>

                    <div className="flex flex-col gap-4 text-sm">
                        <FooterLink href="/">Help Centre</FooterLink>
                        <FooterLink href="/">
                            Get help with a safety issue
                        </FooterLink>
                        <FooterLink href="/">AirCover</FooterLink>
                        <FooterLink href="/">Anti-discrimination</FooterLink>
                        <FooterLink href="/">Disability support</FooterLink>
                        <FooterLink href="/">Cancellation options</FooterLink>
                        <FooterLink href="/">
                            Report neighbourhood concern
                        </FooterLink>
                    </div>
                </div>

                {/* Hosting */}
                <div className="space-y-5">
                    <h3 className="text-sm font-semibold">Hosting</h3>

                    <div className="flex flex-col gap-4 text-sm">
                        <FooterLink href="/">Airbnb your home</FooterLink>
                        <FooterLink href="/">
                            Airbnb your experience
                        </FooterLink>
                        <FooterLink href="/">Airbnb your service</FooterLink>
                        <FooterLink href="/">AirCover for Hosts</FooterLink>
                        <FooterLink href="/">Hosting resources</FooterLink>
                        <FooterLink href="/">Community forum</FooterLink>
                        <FooterLink href="/">Hosting responsibly</FooterLink>
                        <FooterLink href="/">
                            Join a free hosting class
                        </FooterLink>
                        <FooterLink href="/">Find a co-host</FooterLink>
                        <FooterLink href="/">Refer a host</FooterLink>
                    </div>
                </div>

                {/* Airbnb */}
                <div className="space-y-5">
                    <h3 className="text-sm font-semibold">Airbnb</h3>

                    <div className="flex flex-col gap-4 text-sm">
                        <FooterLink href="/">
                            2025 Summer Release
                        </FooterLink>
                        <FooterLink href="/">Newsroom</FooterLink>
                        <FooterLink href="/">Careers</FooterLink>
                        <FooterLink href="/">Investors</FooterLink>
                        <FooterLink href="/">Gift cards</FooterLink>
                        <FooterLink href="/">
                            Airbnb.org emergency stays
                        </FooterLink>
                    </div>
                </div>
            </div>

            {/* Bottom */}
            <div className="mt-14 flex flex-col gap-5 border-t pt-6 lg:flex-row lg:items-center lg:justify-between">
                {/* Left */}
                <div className="flex flex-wrap items-center gap-2 text-sm">
                    <span>© 2026 Airbnb, Inc.</span>

                    <Dot />

                    <FooterLink href="/">Privacy</FooterLink>

                    <Dot />

                    <FooterLink href="/">Terms</FooterLink>

                    <Dot />

                    <FooterLink href="/">
                        UK Modern Slavery Act
                    </FooterLink>

                    <Dot />

                    <FooterLink href="/">
                        Company details
                    </FooterLink>

                    <Dot />

                    <FooterLink href="/">
                        Airbnb UK Limited S.172 Statement
                    </FooterLink>

                    <Dot />

                    <FooterLink href="/">
                        Airbnb Payments UK Limited S.172 Statement
                    </FooterLink>
                </div>

                {/* Right */}
                <div className="flex items-center gap-5 text-sm">
                    <button className="flex items-center gap-2 font-medium hover:underline">
                        <Globe className="h-4 w-4" />
                        English (GB)
                    </button>

                    <button className="font-medium hover:underline">
                        ₫ VND
                    </button>

                    <div className="flex items-center gap-4">
                        <Link href="/" className="hover:opacity-70">
                            <Facebook className="h-5 w-5" />
                        </Link>

                        <Link href="/" className="hover:opacity-70">
                            <svg
                                xmlns="http://www.w3.org/2000/svg"
                                viewBox="0 0 1200 1227"
                                className="h-4 w-4 fill-current"
                            >
                                <path d="M714.163 519.284 1160.89 0h-105.86L667.137 450.887 357.328 0H0l468.492 681.821L0 1226.37h105.866l409.612-476.152 327.194 476.152H1200L714.137 519.284h.026ZM569.165 687.828l-47.468-67.894L144.011 79.694h162.604l304.797 436.066 47.468 67.894 396.2 566.721H892.476L569.165 687.854v-.026Z" />
                            </svg>
                        </Link>

                        <Link href="/" className="hover:opacity-70">
                            <Instagram className="h-5 w-5" />
                        </Link>
                    </div>
                </div>
            </div>
        </footer>
    )
}

function FooterLink({
                        href,
                        children,
                    }: {
    href: string
    children: React.ReactNode
}) {
    return (
        <Link
            href={href}
            className="w-fit transition hover:underline"
        >
            {children}
        </Link>
    )
}

function Dot() {
    return <span className="text-xs">·</span>
}