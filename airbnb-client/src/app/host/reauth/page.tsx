// app/host/reauth/page.tsx
'use client';

import { useEffect } from 'react';
import {refreshLink} from "@/api/endpoints/host";
import {useSelector} from "react-redux";
import {RootState} from "@/store";

// Stripe gọi refresh_url khi link hết hạn hoặc user back
// → Tự động tạo link mới và redirect lại Stripe
export default function HostReauthPage() {

    const token = useSelector((state: RootState) => state.auth.token);

    useEffect(() => {
        refreshAndRedirect();
    }, []);

    const refreshAndRedirect = async () => {
        try {
            const res = await refreshLink(token);
            const { url } = res.data;
            window.location.href = url; // redirect lại Stripe
        } catch {
            // Nếu thất bại, cho user bấm thủ công
        }
    };

    return (
        <div className="flex items-center justify-center min-h-screen">
            <div className="text-center">
                <p className="text-gray-500 mb-4">Reconnecting to Stripe...</p>
                <div className="animate-spin rounded-full h-8 w-8 border-b-2
                        border-rose-500 mx-auto" />
            </div>
        </div>
    );
}