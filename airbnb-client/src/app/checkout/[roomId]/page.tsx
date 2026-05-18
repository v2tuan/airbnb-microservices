// app/checkout/[roomId]/page.tsx
import { Suspense } from "react";
import { notFound } from "next/navigation";
import CheckoutContent from "@/components/checkout/CheckoutContent";
import {listingAPI} from "@/api/endpoints/listing";

interface CheckoutPageProps {
    params: Promise<{ roomId: string }>;
    searchParams: Promise<{
        checkin?: string;
        checkout?: string;
        numberOfAdults?: string;
        numberOfChildren?: string;
        numberOfInfants?: string;
        numberOfPets?: string;
        guestCurrency?: string;
    }>;
}

// ── Fetch room data server-side → không thể fake ─────────
export default async function CheckoutPage({ params, searchParams }: CheckoutPageProps) {
    const { roomId } = await params;

    const query = await searchParams;

    // Validate required params
    if (!query.checkin || !query.checkout) {
        notFound();
    }

    // Gọi API lấy thông tin phòng từ server
    let room;
    // try {
        const response = await listingAPI.getRoomById(roomId);
        room = response.data.result;
    // } catch {
    //     // notFound();
    //     console.log("asdkfljas;lgjals;jdf;lạdf")
    // }

    // Parse booking intent từ URL
    const bookingIntent = {
        checkin: query.checkin,
        checkout: query.checkout,
        numberOfAdults: Number(query.numberOfAdults ?? 1),
        numberOfChildren: Number(query.numberOfChildren ?? 0),
        numberOfInfants: Number(query.numberOfInfants ?? 0),
        numberOfPets: Number(query.numberOfPets ?? 0),
        guestCurrency: query.guestCurrency ?? room.pricing.currency,
    };

    return (
        <Suspense
            fallback={
                <div className="min-h-screen flex items-center justify-center text-zinc-400">
                    Đang tải...
                </div>
            }
        >
            <CheckoutContent room={room} bookingIntent={bookingIntent} />
        </Suspense>
    );
}