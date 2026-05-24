 // app/host/become/page.tsx
'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import {startOnboarding} from "@/api/endpoints/host";
import {useSelector} from "react-redux";
import type {RootState} from "@/store";

export default function BecomeHostPage() {
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const router = useRouter();
    const token = useSelector((state: RootState) => state.auth.token);

    const handleBecomeHost = async () => {
        setLoading(true);
        setError(null);

        try {
            const res = await startOnboarding(token);

            if (!res.success) throw new Error('Failed to start onboarding');

            const { url } = res.data;

            // console.log(url)

            // Redirect sang Stripe — rời khỏi app
            window.location.href = url;

        } catch (err: any) {
            setError(err.message || 'Something went wrong');
            setLoading(false);
        }
    };

    return (
        <div className="max-w-xl mx-auto py-20 px-4 text-center">
            <h1 className="text-3xl font-bold mb-4">Become a Host</h1>
            <p className="text-gray-600 mb-8">
                List your property and start earning. We use Stripe to handle
                payouts securely.
            </p>

            {error && (
                <div className="bg-red-50 text-red-600 p-3 rounded mb-4">{error}</div>
            )}

            <button
                onClick={handleBecomeHost}
                disabled={loading}
                className="bg-rose-500 text-white px-8 py-3 rounded-full font-semibold
                   hover:bg-rose-600 disabled:opacity-60 transition"
            >
                {loading ? 'Redirecting to Stripe...' : 'Get Started with Stripe'}
            </button>

            <p className="text-xs text-gray-400 mt-4">
                You'll be redirected to Stripe to complete identity verification.
            </p>
        </div>
    );
}