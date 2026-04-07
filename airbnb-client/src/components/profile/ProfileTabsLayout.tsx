"use client";

import { selectIsAuthenticated } from "@/features/auth/authSelectors";
import useLoginModal from "@/hooks/userLoginModal";
import { cn } from "@/lib/utils";
import type { RootState } from "@/store";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { useSelector } from "react-redux";

const tabs = [
	{ label: "About me", href: "/users/profile/about" },
	{ label: "Past trips", href: "/users/profile/past-trips" },
	{ label: "Connections", href: "/users/profile/connections" },
];

export default function ProfileTabsLayout({
	children,
}: {
	children: React.ReactNode;
}) {
	const pathname = usePathname();
	const router = useRouter();
	const loginModal = useLoginModal();
	const isAuthenticated = useSelector(selectIsAuthenticated);
	const token = useSelector((state: RootState) => state.auth.token);
	const [checkedAuth, setCheckedAuth] = useState(false);

	useEffect(() => {
		const storedToken =
			typeof window !== "undefined" ? localStorage.getItem("access_token") : null;

		if (isAuthenticated || token || storedToken) {
			setCheckedAuth(true);
			return;
		}

		setCheckedAuth(true);
		router.replace("/");
		loginModal.onOpen();
	}, [isAuthenticated, token, router, loginModal]);

	if (!checkedAuth || (!isAuthenticated && !token)) {
		return null;
	}

	return (
		<div className="mx-auto grid w-full max-w-6xl grid-cols-1 gap-8 px-4 pb-14 pt-8 md:px-8 lg:grid-cols-12 lg:px-10">
			<aside className="lg:col-span-3">
				<div className="sticky top-36 rounded-2xl border bg-white p-4">
					<h2 className="px-3 pb-3 text-xl font-semibold">Profile</h2>
					<div className="space-y-1">
						{tabs.map((tab) => {
							const isActive = pathname.startsWith(tab.href);
							return (
								<Link
									key={tab.href}
									href={tab.href}
									className={cn(
										"block rounded-xl px-3 py-2 text-sm transition",
										isActive
											? "bg-neutral-100 font-medium text-black"
											: "text-neutral-600 hover:bg-neutral-50 hover:text-black"
									)}
								>
									{tab.label}
								</Link>
							);
						})}
					</div>
				</div>
			</aside>

			<section className="lg:col-span-9">{children}</section>
		</div>
	);
}
