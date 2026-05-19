/**
 * index.tsx — Trang đặt phòng chính.
 *
 * FLOW (Shopee-style):
 *  1. User điền ngày, bấm "Đặt phòng ngay"
 *  2. 1 API call → POST /api/payments/checkout
 *     Backend tạo Booking (PENDING_PAYMENT) + Stripe PaymentIntent
 *  3. Frontend nhận clientSecret → hiện form Stripe
 *  4. User nhập thẻ → stripe.confirmPayment() → redirect sang /payment-result
 *  5. Stripe webhook → Payment Service → Booking Service → status = PAID
 *
 *  Nếu user đóng tab ở bước 3/4:
 *   → Booking vẫn tồn tại với status PENDING_PAYMENT
 *   → Hiển thị ở trang "Đơn của tôi" (/bookings)
 *   → Scheduler tự EXPIRED sau 15 phút
 */
'use client'

import { useState } from 'react';
import Head from 'next/head';
import Link from 'next/link';
import { loadStripe } from '@stripe/stripe-js';
import { Elements } from '@stripe/react-stripe-js';
import { checkout, CheckoutResponse } from '@/api/endpoints/booking';
import PaymentForm from '@/components/booking/PaymentForm';
import CountdownTimer from '@/components/booking/CountdownTimer';
import {useSelector} from "react-redux";
import type {RootState} from "@/store";

// loadStripe phải gọi ngoài component (tránh re-instantiate mỗi render)
// publishableKey sẽ được override bởi key trả về từ backend (checkoutResponse.publishableKey)
let stripePromise = loadStripe(process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY || '');

const MOCK_ROOM = {
    id: '550e8400-e29b-41d4-a716-446655440001',
    name: 'Oceanview Suite – Đà Nẵng',
    location: 'Mỹ Khê, Đà Nẵng',
    pricePerNight: 120, // USD
    rating: 4.92,
    reviewCount: 214,
    emoji: '🌊',
    amenities: ['WiFi tốc độ cao', 'Hồ bơi vô cực', 'Bếp đầy đủ', 'Bãi biển riêng', 'Điều hòa'],
};

const MOCK_USER_ID = '1001';

type Step = 'FORM' | 'PROCESSING' | 'PAYMENT' | 'DONE';

export default function HomePage() {
    // ── Form state ──────────────────────────────────────────────────────────────
    const [checkIn, setCheckIn]   = useState('');
    const [checkOut, setCheckOut] = useState('');
    const [guests, setGuests]     = useState(1);
    const [notes, setNotes]       = useState('');

    const token = useSelector((state: RootState) => state.auth.token);

    // ── Flow state ──────────────────────────────────────────────────────────────
    const [step, setStep]                           = useState<Step>('FORM');
    const [checkoutResp, setCheckoutResp]           = useState<CheckoutResponse | null>(null);
    const [stripeKey, setStripeKey]                 = useState<string | null>(null);
    const [error, setError]                         = useState<string | null>(null);

    // ── Computed ────────────────────────────────────────────────────────────────
    const today      = new Date().toISOString().split('T')[0];
    const nights     = checkIn && checkOut
        ? Math.max(0, Math.floor((+new Date(checkOut) - +new Date(checkIn)) / 86400000))
        : 0;
    const totalUSD   = nights * MOCK_ROOM.pricePerNight;

    // ── Handlers ────────────────────────────────────────────────────────────────

    /**
     * User bấm "Đặt phòng ngay".
     * Gọi 1 API duy nhất → nhận clientSecret → hiện form thanh toán.
     */
    const handleBook = async () => {
        setError(null);

        if (!checkIn || !checkOut || nights <= 0) {
            setError('Vui lòng chọn ngày hợp lệ.');
            return;
        }

        setStep('PROCESSING');
        try {
            const resp = await checkout(token, {
                roomId:       MOCK_ROOM.id,
                roomName:     MOCK_ROOM.name,
                userId:       MOCK_USER_ID,
                checkInDate:  checkIn,
                checkOutDate: checkOut,
                totalAmount:  totalUSD,
                currency:     'USD',
                guestCount:   guests,
                guestNotes:   notes || undefined,
            });

            setCheckoutResp(resp);

            // Dùng publishableKey từ backend (tránh hardcode ở frontend)
            stripePromise = loadStripe(resp.publishableKey);
            setStripeKey(resp.publishableKey);

            setStep('PAYMENT');
        } catch (e: any) {
            setError(e?.response?.data?.message || e.message || 'Đã có lỗi, vui lòng thử lại.');
            setStep('FORM');
        }
    };

    const secondsLeft = checkoutResp
        ? Math.max(0, Math.floor((+new Date(checkoutResp.expiresAt) - Date.now()) / 1000))
        : 0;

    // ── Render ───────────────────────────────────────────────────────────────────
    return (
        <>
            <Head>
                <title>StayEasy – Đặt phòng</title>
            </Head>

            <div className="min-h-screen bg-[#f7f7f7]">
                {/* ── Header ── */}
                <header className="bg-white border-b border-gray-200 sticky top-0 z-50 shadow-sm">
                    <div className="max-w-5xl mx-auto px-4 h-16 flex items-center justify-between">
                        <Link href="/" className="flex items-center gap-2 font-bold text-xl text-[#FF385C]">
                            🏠 StayEasy
                        </Link>
                        <Link
                            href="/bookings"
                            className="text-sm font-medium text-gray-600 hover:text-[#FF385C] transition border border-gray-200 rounded-full px-4 py-1.5"
                        >
                            📋 Đơn của tôi
                        </Link>
                    </div>
                </header>

                <main className="max-w-5xl mx-auto px-4 py-10">

                    {/* ══════════════════════════════════════════════════════ */}
                    {/* FORM / PROCESSING STATE                               */}
                    {/* ══════════════════════════════════════════════════════ */}
                    {(step === 'FORM' || step === 'PROCESSING') && (
                        <div className="grid grid-cols-1 lg:grid-cols-5 gap-8">

                            {/* ── Room card ── */}
                            <div className="lg:col-span-3 space-y-6">
                                <div className="bg-gradient-to-br from-sky-100 to-blue-200 rounded-3xl h-72 flex items-center justify-center text-[120px] shadow-inner">
                                    {MOCK_ROOM.emoji}
                                </div>

                                <div>
                                    <div className="flex items-start justify-between">
                                        <div>
                                            <h1 className="text-2xl font-bold text-gray-900">{MOCK_ROOM.name}</h1>
                                            <p className="text-gray-500 text-sm mt-1">📍 {MOCK_ROOM.location}</p>
                                        </div>
                                        <div className="text-right shrink-0 ml-4">
                                            <span className="text-yellow-400 font-bold">★ {MOCK_ROOM.rating}</span>
                                            <p className="text-gray-400 text-xs">{MOCK_ROOM.reviewCount} đánh giá</p>
                                        </div>
                                    </div>

                                    <div className="mt-4 flex flex-wrap gap-2">
                                        {MOCK_ROOM.amenities.map(a => (
                                            <span key={a} className="bg-gray-100 text-gray-600 text-xs px-3 py-1 rounded-full">{a}</span>
                                        ))}
                                    </div>
                                </div>

                                {/* Flow explanation */}
                                <div className="bg-amber-50 border border-amber-200 rounded-2xl p-5 text-sm">
                                    <p className="font-semibold text-amber-800 mb-2">⚡ Flow Shopee-style</p>
                                    <ol className="space-y-1 text-amber-700 list-decimal list-inside">
                                        <li>Bấm "Đặt phòng ngay" → <strong>1 API call duy nhất</strong></li>
                                        <li>Backend tạo <code className="bg-amber-100 px-1 rounded">Booking (PENDING_PAYMENT)</code> + <code className="bg-amber-100 px-1 rounded">PaymentIntent</code> cùng lúc</li>
                                        <li>Đóng tab lúc nào cũng được → booking vẫn hiện ở <Link href="/bookings" className="underline">Đơn của tôi</Link></li>
                                        <li>Webhook Stripe → tự update <code className="bg-amber-100 px-1 rounded">PAID</code> khi thanh toán xong</li>
                                        <li>Nếu quá 15 phút không thanh toán → scheduler tự <code className="bg-amber-100 px-1 rounded">EXPIRED</code></li>
                                    </ol>
                                </div>
                            </div>

                            {/* ── Booking widget ── */}
                            <div className="lg:col-span-2">
                                <div className="bg-white border border-gray-200 rounded-3xl shadow-lg p-6 sticky top-24">
                                    <p className="text-2xl font-bold mb-1">
                                        ${MOCK_ROOM.pricePerNight}
                                        <span className="text-base font-normal text-gray-400"> / đêm</span>
                                    </p>
                                    <div className="flex items-center gap-1 text-sm text-gray-500 mb-5">
                                        <span className="text-yellow-400">★</span> {MOCK_ROOM.rating} · {MOCK_ROOM.reviewCount} đánh giá
                                    </div>

                                    {/* Dates */}
                                    <div className="border border-gray-300 rounded-2xl overflow-hidden mb-3">
                                        <div className="grid grid-cols-2 divide-x divide-gray-300">
                                            <div className="p-3">
                                                <p className="text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-1">Nhận phòng</p>
                                                <input
                                                    type="date" value={checkIn} min={today}
                                                    onChange={e => { setCheckIn(e.target.value); setError(null); }}
                                                    className="w-full text-sm focus:outline-none"
                                                />
                                            </div>
                                            <div className="p-3">
                                                <p className="text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-1">Trả phòng</p>
                                                <input
                                                    type="date" value={checkOut} min={checkIn || today}
                                                    onChange={e => { setCheckOut(e.target.value); setError(null); }}
                                                    className="w-full text-sm focus:outline-none"
                                                />
                                            </div>
                                        </div>
                                        <div className="border-t border-gray-300 p-3">
                                            <p className="text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-1">Khách</p>
                                            <select value={guests} onChange={e => setGuests(+e.target.value)}
                                                    className="w-full text-sm bg-transparent focus:outline-none">
                                                {[1,2,3,4].map(n => <option key={n} value={n}>{n} khách</option>)}
                                            </select>
                                        </div>
                                    </div>

                                    <textarea
                                        placeholder="Ghi chú (tùy chọn)…"
                                        value={notes} onChange={e => setNotes(e.target.value)}
                                        rows={2}
                                        className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm mb-4 resize-none focus:outline-none focus:ring-2 focus:ring-[#FF385C]/30"
                                    />

                                    {error && (
                                        <p className="text-red-500 text-sm mb-3 text-center">{error}</p>
                                    )}

                                    {/* Price breakdown */}
                                    {nights > 0 && (
                                        <div className="text-sm mb-4 space-y-1">
                                            <div className="flex justify-between text-gray-500">
                                                <span>${MOCK_ROOM.pricePerNight} × {nights} đêm</span>
                                                <span>${totalUSD}</span>
                                            </div>
                                            <div className="flex justify-between font-bold border-t pt-2 text-base">
                                                <span>Tổng cộng</span>
                                                <span>${totalUSD} USD</span>
                                            </div>
                                        </div>
                                    )}

                                    {/* CTA */}
                                    <button
                                        onClick={handleBook}
                                        disabled={step === 'PROCESSING' || nights <= 0}
                                        className="w-full py-4 rounded-2xl font-semibold text-white text-base
                      bg-gradient-to-r from-[#FF385C] to-[#E61E4D]
                      disabled:opacity-50 disabled:cursor-not-allowed
                      hover:shadow-xl hover:scale-[1.01] active:scale-[0.99]
                      transition-all duration-200"
                                    >
                                        {step === 'PROCESSING' ? (
                                            <span className="flex items-center justify-center gap-2">
                        <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24" fill="none">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/>
                        </svg>
                        Đang tạo đơn…
                      </span>
                                        ) : nights > 0
                                            ? `Đặt phòng ngay · $${totalUSD}`
                                            : 'Chọn ngày để đặt phòng'
                                        }
                                    </button>

                                    <p className="text-center text-xs text-gray-400 mt-3">
                                        Booking được tạo ngay · Thanh toán trong 15 phút
                                    </p>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* ══════════════════════════════════════════════════════ */}
                    {/* PAYMENT STATE — Booking đã tạo, đang chờ thanh toán  */}
                    {/* ══════════════════════════════════════════════════════ */}
                    {step === 'PAYMENT' && checkoutResp && (
                        <div className="max-w-md mx-auto space-y-5">

                            {/* Booking info banner */}
                            <div className="bg-white border border-gray-200 rounded-2xl p-5 shadow-sm">
                                <div className="flex items-center justify-between mb-3">
                                    <div>
                                        <p className="text-xs text-gray-400 uppercase tracking-wider">Mã đặt phòng</p>
                                        <p className="font-mono font-bold text-[#FF385C] text-lg">#{checkoutResp.bookingId}</p>
                                    </div>
                                    {/* Badge trạng thái */}
                                    <span className="px-3 py-1 bg-yellow-100 text-yellow-700 text-xs font-semibold rounded-full">
                    ⏳ Chờ thanh toán
                  </span>
                                </div>

                                <div className="grid grid-cols-2 gap-3 text-sm text-gray-600 mb-3">
                                    <div><p className="text-gray-400 text-xs">Phòng</p><p className="font-medium">{MOCK_ROOM.name}</p></div>
                                    <div><p className="text-gray-400 text-xs">Số đêm</p><p className="font-medium">{nights} đêm</p></div>
                                    <div><p className="text-gray-400 text-xs">Nhận phòng</p><p>{checkIn}</p></div>
                                    <div><p className="text-gray-400 text-xs">Trả phòng</p><p>{checkOut}</p></div>
                                </div>

                                <div className="flex justify-between items-center border-t pt-3">
                                    <span className="font-bold">Tổng thanh toán</span>
                                    <span className="text-xl font-bold text-[#FF385C]">${totalUSD} USD</span>
                                </div>

                                {/* Countdown — booking hết hạn sau 15 phút */}
                                <div className="mt-3 pt-3 border-t">
                                    <CountdownTimer
                                        secondsRemaining={secondsLeft}
                                        onExpire={() => {
                                            alert('Booking đã hết hạn. Vui lòng đặt lại.');
                                            setStep('FORM');
                                            setCheckoutResp(null);
                                        }}
                                    />
                                </div>

                                {/* Gợi ý: user biết booking đã tồn tại dù chưa thanh toán */}
                                <div className="mt-3 p-3 bg-blue-50 rounded-xl text-xs text-blue-600">
                                    💡 Đóng tab cũng được — booking <strong>#{checkoutResp.bookingId}</strong> đã lưu.
                                    Xem lại ở <Link href="/bookings" className="underline font-semibold">Đơn của tôi</Link>.
                                </div>
                            </div>

                            {/* Stripe Payment Form */}
                            <div className="bg-white border border-gray-200 rounded-2xl p-6 shadow-sm">
                                <h2 className="font-bold text-lg mb-5">💳 Hoàn thành thanh toán</h2>

                                <Elements
                                    stripe={stripePromise}
                                    options={{
                                        clientSecret: checkoutResp.clientSecret,
                                        appearance: {
                                            theme: 'stripe',
                                            variables: { colorPrimary: '#FF385C', borderRadius: '12px' },
                                        },
                                    }}
                                >
                                    <PaymentForm
                                        bookingId={checkoutResp.bookingId}
                                        amount={totalUSD}
                                        currency="USD"
                                        onSuccess={() => setStep('DONE')}
                                        onError={msg => setError(msg)}
                                    />
                                </Elements>
                            </div>

                            <button onClick={() => { setStep('FORM'); setCheckoutResp(null); }}
                                    className="w-full text-gray-400 text-sm py-2 hover:text-gray-600">
                                ← Quay lại trang chủ
                            </button>
                        </div>
                    )}

                    {/* ══════════════════════════════════════════════════════ */}
                    {/* DONE STATE                                            */}
                    {/* ══════════════════════════════════════════════════════ */}
                    {step === 'DONE' && (
                        <div className="max-w-sm mx-auto text-center py-20 space-y-4">
                            <div className="text-8xl">🎉</div>
                            <h2 className="text-2xl font-bold">Đặt phòng thành công!</h2>
                            <p className="text-gray-500">Booking #{checkoutResp?.bookingId} · Stripe đang xử lý webhook…</p>
                            <div className="flex gap-3 justify-center pt-4">
                                <Link href="/bookings"
                                      className="bg-[#FF385C] text-white px-6 py-3 rounded-xl font-semibold hover:bg-[#E61E4D]">
                                    Xem đơn của tôi
                                </Link>
                                <button onClick={() => { setStep('FORM'); setCheckoutResp(null); }}
                                        className="border border-gray-300 px-6 py-3 rounded-xl text-gray-600 hover:bg-gray-50">
                                    Đặt thêm
                                </button>
                            </div>
                        </div>
                    )}

                </main>
            </div>
        </>
    );
}
