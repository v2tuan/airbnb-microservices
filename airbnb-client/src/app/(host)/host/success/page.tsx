// app/host/success/page.tsx
'use client';

import {useEffect, useRef, useState} from 'react';
import { useRouter } from 'next/navigation';
import {checkStatus} from "@/api/endpoints/host";
import {useDispatch, useSelector} from "react-redux";
import {AppDispatch, RootState} from "@/store";
import {selectAuthError, selectAuthLoading} from "@/features/auth/authSelectors";
import {loginThunk, refreshThunk} from "@/features/auth/authSlice";

type Status = 'loading' | 'success' | 'incomplete';

export default function HostSuccessPage() {
    const [status, setStatus] = useState<Status>('loading');
    const router = useRouter();
    const token = useSelector((state: RootState) => state.auth.token);

    const dispatch = useDispatch<AppDispatch>()

    const loading = useSelector(selectAuthLoading)
    const error = useSelector(selectAuthError)

    const hasFetched = useRef(false);

    useEffect(() => {

        if (!token) return;

        if (hasFetched.current) return;

        hasFetched.current = true;

        const fetchStatus = async () => {

            try {

                const res =
                    await checkStatus(token);

                const data = res.data;

                if (data.success) {

                    const result =
                        await dispatch(
                            refreshThunk()
                        );

                    if (
                        refreshThunk.fulfilled.match(
                            result
                        )
                    ) {

                        setStatus("success");
                    }

                } else {

                    setStatus("incomplete");
                }

            } catch {

                setStatus("incomplete");
            }
        };

        fetchStatus();

    }, [token, dispatch]);

    if (status === 'loading') {
        return (
            <div className="flex items-center justify-center min-h-screen">
                <p className="text-gray-500">Verifying your account...</p>
            </div>
        );
    }

    if (status === 'success') {
        return (
            <div className="max-w-xl mx-auto py-20 px-4 text-center">
                <div className="text-5xl mb-4">🎉</div>
                <h1 className="text-3xl font-bold mb-2">You're a Host!</h1>
                <p className="text-gray-600 mb-8">
                    Your Stripe account is verified. You can now list properties
                    and receive payouts.
                </p>
                <button
                    onClick={() => router.push('/host/listings/new')}
                    className="bg-rose-500 text-white px-8 py-3 rounded-full font-semibold"
                >
                    Create Your First Listing
                </button>
            </div>
        );
    }

    // incomplete — user quay lại nhưng chưa xong
    return (
        <div className="max-w-xl mx-auto py-20 px-4 text-center">
            <div className="text-5xl mb-4">⏳</div>
            <h1 className="text-3xl font-bold mb-2">Almost There</h1>
            <p className="text-gray-600 mb-8">
                Your Stripe setup isn't complete yet. Please finish the
                verification to start hosting.
            </p>
            <button
                onClick={() => router.push('/host/reauth')}
                className="bg-gray-800 text-white px-8 py-3 rounded-full font-semibold"
            >
                Continue Setup
            </button>
        </div>
    );
}