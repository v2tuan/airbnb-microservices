"use client";

import { Elements } from "@stripe/react-stripe-js";
import type { StripeElementsOptions } from "@stripe/stripe-js";
import { differenceInDays, format, parseISO } from "date-fns";
import { vi } from "date-fns/locale";
import { ArrowLeft, ShieldCheck } from "lucide-react";
import Image from "next/image";
import { useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";
import type { DateRange } from "react-day-picker";
import GuestSelector, {
  type GuestCounts,
} from "@/components/booking/GuestSelector";
import CardForm from "@/components/booking/payment-form";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { formatPrice } from "@/contants";
import { stripePromise } from "@/lib/stripe";

// ────────────────────────────────────────────────────────────
// Types — khớp với response của listingAPI.getRoomById
// ────────────────────────────────────────────────────────────
interface Pricing {
  basePrice: number;
  currency: string;
  cleaningFee: number;
  serviceFeePercentage: number;
}

interface Photo {
  photoUrl: string;
  caption?: string;
  isCover?: boolean;
}

export interface RoomDetail {
  listingId: string;
  title: string;
  photos: Photo[];
  pricing: Pricing;
  maxGuests: number;
  city: string;
  country: string;
  numBedrooms: number;
  numBeds: number;
  numBathrooms: number;
  checkInStartTime?: string;
  checkInEndTime?: string;
  checkOutTime?: string;
  houseRules?: {
    petsAllowed?: boolean;
    checkInFrom?: string;
    checkInTo?: string;
    checkOutTime?: string;
  };
}

export interface BookingIntent {
  checkin: string;
  checkout: string;
  numberOfAdults: number;
  numberOfChildren: number;
  numberOfInfants: number;
  numberOfPets: number;
  guestCurrency: string;
}

interface CheckoutContentProps {
  room: RoomDetail;
  bookingIntent: BookingIntent;
}

// ────────────────────────────────────────────────────────────
// Helpers
// ────────────────────────────────────────────────────────────
function formatDateRange(checkin: string, checkout: string) {
  const from = parseISO(checkin);
  const to = parseISO(checkout);
  const fromStr = format(from, "d", { locale: vi });
  const toStr = format(to, "d 'thg' M, yyyy", { locale: vi });
  return `${fromStr} – ${toStr}`;
}

function guestSummary(intent: BookingIntent) {
  const parts: string[] = [];
  if (intent.numberOfAdults) parts.push(`${intent.numberOfAdults} người lớn`);
  if (intent.numberOfChildren) parts.push(`${intent.numberOfChildren} trẻ em`);
  if (intent.numberOfInfants) parts.push(`${intent.numberOfInfants} em bé`);
  if (intent.numberOfPets) parts.push(`${intent.numberOfPets} thú cưng`);
  return parts.join(", ") || "1 người lớn";
}

function toDateRange(intent: BookingIntent): DateRange {
  return {
    from: parseISO(intent.checkin),
    to: parseISO(intent.checkout),
  };
}

function toGuestCounts(intent: BookingIntent): GuestCounts {
  return {
    adults: intent.numberOfAdults,
    children: intent.numberOfChildren,
    infants: intent.numberOfInfants,
    pets: intent.numberOfPets,
  };
}

function formatTimeRange(start?: string, end?: string) {
  if (!start && !end) return "14:00 - 16:00";
  if (start && end) return `${start} - ${end}`;
  return start ?? end ?? "";
}

function buildCheckoutQuery(
  intent: BookingIntent,
  searchParams: URLSearchParams,
) {
  const params = new URLSearchParams(searchParams.toString());
  params.set("checkin", intent.checkin);
  params.set("checkout", intent.checkout);
  params.set("numberOfAdults", String(intent.numberOfAdults));
  params.set("numberOfChildren", String(intent.numberOfChildren));
  params.set("numberOfInfants", String(intent.numberOfInfants));
  params.set("numberOfPets", String(intent.numberOfPets));
  params.set("guestCurrency", intent.guestCurrency);
  return params.toString();
}

// ────────────────────────────────────────────────────────────
// Sub-components
// ────────────────────────────────────────────────────────────
function DateEditDialog({
  open,
  onOpenChange,
  value,
  checkInTime,
  onSave,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  value: BookingIntent;
  checkInTime: string;
  onSave: (range: DateRange) => void;
}) {
  const [draftRange, setDraftRange] = useState<DateRange | undefined>(() =>
    toDateRange(value),
  );

  const canSave =
    !!draftRange?.from && !!draftRange.to && draftRange.to > draftRange.from;

  const handleOpenChange = (nextOpen: boolean) => {
    if (nextOpen) setDraftRange(toDateRange(value));
    onOpenChange(nextOpen);
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="max-h-[calc(100vh-64px)] max-w-[calc(100%-2rem)] gap-0 overflow-hidden rounded-[32px] bg-white p-0 shadow-[0_20px_60px_rgba(0,0,0,0.18)] sm:max-w-[860px]">
        <div className="px-9 pb-5 pt-10 sm:px-12">
          <DialogHeader className="gap-5">
            <DialogTitle className="text-[32px] font-semibold tracking-tight text-zinc-900">
              Thay đổi ngày
            </DialogTitle>
            <DialogDescription className="sr-only">
              Chọn ngày nhận phòng và trả phòng cho lượt đặt này.
            </DialogDescription>
          </DialogHeader>
dev
          <div className="mt-8 flex items-center justify-between border-b border-zinc-200 pb-6">
            <div>
              <p className="text-[15px] font-semibold text-zinc-500">
                Giờ nhận phòng
              </p>
              <p className="mt-1 text-[22px] font-semibold text-zinc-900">
                {checkInTime}
              </p>
            </div>
            <Button
              type="button"
              variant="secondary"
              className="h-12 rounded-xl bg-zinc-100 px-6 text-base font-semibold text-zinc-900 hover:bg-zinc-200"
            >
              Thay đổi
            </Button>
          </div>

          <div className="mt-7 overflow-x-auto">
            <Calendar
              mode="range"
              numberOfMonths={2}
              selected={draftRange}
              onSelect={setDraftRange}
              disabled={{ before: new Date() }}
              locale={vi}
              className="mx-auto p-0 [--cell-size:44px] sm:[--cell-size:48px]"
              // classNames={{
              //   root: "relative w-full",
              //   months:
              //     "flex w-full flex-col gap-8 md:flex-row md:justify-between",
              //   month: "w-[316px] shrink-0 sm:w-[340px]",
              //   month_caption: "mb-3 flex h-10 items-center justify-center",
              //   caption_label: "text-[20px] font-semibold text-zinc-900",
              //   weekdays: "flex w-full",
              //   weekday:
              //     "flex h-10 w-[var(--cell-size)] flex-none items-center justify-center text-[14px] font-semibold text-zinc-500",
              //   week: "mt-2 flex w-full",
              //   day: "h-[var(--cell-size)] w-[var(--cell-size)] flex-none",
              //   button_previous:
              //     "h-9 w-9 rounded-full text-zinc-500 hover:bg-zinc-100",
              //   button_next:
              //     "h-9 w-9 rounded-full text-zinc-900 hover:bg-zinc-100",
              // }}
            />
          </div>
        </div>

        <DialogFooter className="flex-row items-center justify-between border-t border-zinc-200 px-9 py-5 sm:justify-between sm:px-12">
          <button
            type="button"
            onClick={() => setDraftRange(undefined)}
            className="text-base font-semibold text-zinc-900 underline underline-offset-2 hover:text-zinc-600"
          >
            Xóa ngày
          </button>
          <Button
            type="button"
            disabled={!canSave}
            onClick={() => {
              if (!canSave) return;
              onSave(draftRange);
            }}
            className="h-14 min-w-40 rounded-2xl bg-zinc-900 text-base font-semibold text-white hover:bg-zinc-700 disabled:bg-zinc-300 disabled:text-white"
          >
            Lưu
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function GuestEditDialog({
  open,
  onOpenChange,
  value,
  maxGuests,
  petsAllowed,
  onSave,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  value: BookingIntent;
  maxGuests: number;
  petsAllowed: boolean;
  onSave: (guests: GuestCounts) => void;
}) {
  const [draftGuests, setDraftGuests] = useState<GuestCounts>(() =>
    toGuestCounts(value),
  );

  const handleOpenChange = (nextOpen: boolean) => {
    if (nextOpen) setDraftGuests(toGuestCounts(value));
    onOpenChange(nextOpen);
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="max-h-[calc(100vh-64px)] max-w-[calc(100%-2rem)] gap-0 overflow-hidden rounded-[32px] bg-white p-0 shadow-[0_20px_60px_rgba(0,0,0,0.18)] sm:max-w-[640px]">
        <div className="px-9 pb-7 pt-10 sm:px-12">
          <DialogHeader className="gap-5">
            <DialogTitle className="text-[32px] font-semibold tracking-tight text-zinc-900">
              Thay đổi khách
            </DialogTitle>
            <DialogDescription className="max-w-[520px] text-[17px] leading-7 text-zinc-500">
              Chỗ ở này cho phép tối đa {maxGuests} khách, không tính em bé.{" "}
              {!petsAllowed && "Không được phép mang theo thú cưng."}
            </DialogDescription>
          </DialogHeader>

          <div className="mt-7">
            <GuestSelector
              value={draftGuests}
              onChange={setDraftGuests}
              maxGuests={maxGuests}
              petsAllowed={petsAllowed}
              variant="inline"
            />
          </div>
        </div>

        <DialogFooter className="flex-row items-center justify-between border-t border-zinc-200 px-9 py-5 sm:justify-between sm:px-12">
          <button
            type="button"
            onClick={() => onOpenChange(false)}
            className="text-base font-semibold text-zinc-900 hover:underline"
          >
            Hủy
          </button>
          <Button
            type="button"
            onClick={() => onSave(draftGuests)}
            className="h-14 min-w-40 rounded-2xl bg-zinc-900 text-base font-semibold text-white hover:bg-zinc-700"
          >
            Lưu
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ────────────────────────────────────────────────────────────
// Main
// ────────────────────────────────────────────────────────────
export default function CheckoutContent({
  room,
  bookingIntent,
}: CheckoutContentProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [currentIntent, setCurrentIntent] =
    useState<BookingIntent>(bookingIntent);
  const [dateDialogOpen, setDateDialogOpen] = useState(false);
  const [guestDialogOpen, setGuestDialogOpen] = useState(false);

  // ── Tính giá từ data server — không thể fake ─────────────
  const nights = differenceInDays(
    parseISO(currentIntent.checkout),
    parseISO(currentIntent.checkin),
  );
  const { basePrice, cleaningFee, serviceFeePercentage, currency } =
    room.pricing;
  const subtotal = basePrice * nights;
  const serviceFee = (subtotal * serviceFeePercentage) / 100;
  const total = subtotal + cleaningFee + serviceFee;
  const checkInTime = formatTimeRange(
    room.checkInStartTime ?? room.houseRules?.checkInFrom,
    room.checkInEndTime ?? room.houseRules?.checkInTo,
  );
  const petsAllowed = !!room.houseRules?.petsAllowed;

  const updateIntent = (nextIntent: BookingIntent) => {
    setCurrentIntent(nextIntent);
    const query = buildCheckoutQuery(
      nextIntent,
      new URLSearchParams(searchParams.toString()),
    );
    router.replace(`/checkout/${room.listingId}?${query}`, { scroll: false });
  };

  const handleSaveDates = (range: DateRange) => {
    if (!range.from || !range.to || range.to <= range.from) return;

    updateIntent({
      ...currentIntent,
      checkin: format(range.from, "yyyy-MM-dd"),
      checkout: format(range.to, "yyyy-MM-dd"),
    });
    setDateDialogOpen(false);
  };

  const handleSaveGuests = (guests: GuestCounts) => {
    updateIntent({
      ...currentIntent,
      numberOfAdults: guests.adults,
      numberOfChildren: guests.children,
      numberOfInfants: guests.infants,
      numberOfPets: petsAllowed ? guests.pets : 0,
    });
    setGuestDialogOpen(false);
  };

  console.log("total", total);

  const options: StripeElementsOptions = {
    mode: "payment",
    amount: Math.round(total),
    currency: "vnd",
    // Fully customizable with appearance API.
    appearance: {
      /*...*/
    },
  };

  const coverPhoto = room.photos.find((p) => p.isCover) ?? room.photos[0];

  const [submitted] = useState(false);

  // ── Success screen ────────────────────────────────────────
  if (submitted) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-4 bg-white">
        <div className="w-16 h-16 rounded-full bg-green-100 flex items-center justify-center">
          <ShieldCheck className="w-8 h-8 text-green-600" />
        </div>
        <h1 className="text-2xl font-bold text-zinc-900">
          Đặt phòng thành công!
        </h1>
        <p className="text-zinc-500 text-sm">
          Chúng tôi sẽ xác nhận qua email của bạn.
        </p>
        <button
          type="button"
          onClick={() => router.push("/")}
          className="mt-4 px-6 py-3 bg-zinc-900 text-white rounded-full text-sm font-semibold hover:bg-zinc-700 transition-colors"
        >
          Về trang chủ
        </button>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white">
      {/* Top bar */}
      <div className="mx-auto flex h-20 max-w-6xl items-center gap-4 border-b border-zinc-200 px-6">
        <button
          type="button"
          onClick={() => router.back()}
          className="flex h-10 w-10 items-center justify-center rounded-full hover:bg-zinc-100 transition-colors"
        >
          <ArrowLeft className="h-5 w-5" />
        </button>
        <h1 className="text-[32px] font-semibold tracking-tight text-zinc-900">
          Xác nhận và thanh toán
        </h1>
      </div>

      {/* Body */}
      <div className="mx-auto grid max-w-6xl grid-cols-1 gap-20 px-6 py-10 lg:grid-cols-[minmax(0,1fr)_420px] lg:items-start">
        {/* ── LEFT ─────────────────────────────────────────── */}
        <div className="space-y-5">
          {/* Step 1: Payment */}
          <div className="rounded-3xl border border-zinc-200 p-6 sm:p-8">
            <h2 className="mb-6 text-[22px] font-semibold tracking-tight text-zinc-900">
              1. Thêm phương thức thanh toán
            </h2>

            <div className="space-y-3">
              {/* MoMo */}
              {/*        <label className={cn(*/}
              {/*            "flex items-center justify-between p-4 border rounded-xl cursor-pointer transition-all",*/}
              {/*            paymentMethod === "momo"*/}
              {/*                ? "border-zinc-800 bg-zinc-50"*/}
              {/*                : "border-zinc-200 hover:border-zinc-400"*/}
              {/*        )}>*/}
              {/*            <div className="flex items-center gap-3">*/}
              {/*                <div className="w-10 h-10 rounded-lg bg-[#AE2070] flex items-center justify-center">*/}
              {/*<span className="text-white text-[10px] font-bold leading-none text-center">*/}
              {/*  mo<br />mo*/}
              {/*</span>*/}
              {/*                </div>*/}
              {/*                <span className="text-sm font-medium text-zinc-900">MoMo</span>*/}
              {/*            </div>*/}
              {/*            <input*/}
              {/*                type="radio"*/}
              {/*                name="payment"*/}
              {/*                value="momo"*/}
              {/*                checked={paymentMethod === "momo"}*/}
              {/*                onChange={() => setPaymentMethod("momo")}*/}
              {/*                className="accent-zinc-800 w-4 h-4"*/}
              {/*            />*/}
              {/*        </label>*/}

              {/* Card */}
              {/*<div className={cn(*/}
              {/*    "border rounded-xl overflow-hidden transition-all",*/}
              {/*    paymentMethod === "card" ? "border-zinc-800" : "border-zinc-200"*/}
              {/*)}>*/}
              {/*<label className={cn(*/}
              {/*    "flex items-center justify-between p-4 cursor-pointer",*/}
              {/*    paymentMethod === "card" ? "bg-zinc-50" : "hover:bg-zinc-50"*/}
              {/*)}>*/}
              {/*    <div className="flex items-center gap-3">*/}
              {/*        <div className="w-10 h-10 rounded-lg bg-zinc-100 flex items-center justify-center">*/}
              {/*            <svg className="w-5 h-5 text-zinc-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">*/}
              {/*                <rect x="2" y="5" width="20" height="14" rx="2" strokeWidth="1.5" />*/}
              {/*                <path d="M2 10h20" strokeWidth="1.5" />*/}
              {/*            </svg>*/}
              {/*        </div>*/}
              {/*        <div>*/}
              {/*            <p className="text-sm font-medium text-zinc-900">*/}
              {/*                Thẻ tín dụng hoặc thẻ ghi nợ*/}
              {/*            </p>*/}
              {/*            <div className="flex gap-1 mt-0.5">*/}
              {/*                <span className="text-[10px] font-bold text-blue-700 border border-blue-200 rounded px-1">VISA</span>*/}
              {/*                <span className="text-[10px] font-bold text-red-600 border border-red-200 rounded px-1">MC</span>*/}
              {/*            </div>*/}
              {/*        </div>*/}
              {/*    </div>*/}
              {/*    <input*/}
              {/*        type="radio"*/}
              {/*        name="payment"*/}
              {/*        value="card"*/}
              {/*        checked={paymentMethod === "card"}*/}
              {/*        onChange={() => setPaymentMethod("card")}*/}
              {/*        className="accent-zinc-800 w-4 h-4"*/}
              {/*    />*/}
              {/*</label>*/}

              {/*{paymentMethod === "card" && (*/}
              {/*    <div className="px-4 pb-4 space-y-3 border-t border-zinc-100">*/}
              {/*        <div className="pt-3">*/}
              {/*            <InputField label="Số thẻ" placeholder="1234 5678 9012 3456" />*/}
              {/*        </div>*/}
              {/*        <div className="grid grid-cols-2 gap-3">*/}
              {/*            <InputField label="Ngày hết hạn" placeholder="MM / YY" />*/}
              {/*            <InputField label="CVV" placeholder="•••" />*/}
              {/*        </div>*/}
              {/*        <InputField label="Mã bưu chính" placeholder="70000" />*/}
              {/*        <div className="relative border border-zinc-300 rounded-xl px-4 pt-5 pb-2 focus-within:border-zinc-800 transition-all">*/}
              {/*            <label className="absolute top-2 left-4 text-[10px] text-zinc-500 font-medium">*/}
              {/*                Quốc gia/khu vực*/}
              {/*            </label>*/}
              {/*            <select className="w-full bg-transparent text-sm text-zinc-900 focus:outline-none pt-0.5 appearance-none">*/}
              {/*                <option>Việt Nam</option>*/}
              {/*                <option>Hoa Kỳ</option>*/}
              {/*                <option>Singapore</option>*/}
              {/*                <option>Nhật Bản</option>*/}
              {/*            </select>*/}
              {/*            <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none">*/}
              {/*                <svg className="w-4 h-4 text-zinc-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">*/}
              {/*                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" />*/}
              {/*                </svg>*/}
              {/*            </div>*/}
              {/*        </div>*/}
              {/*    </div>*/}
              {/*)}*/}

              <Elements
                key={`${currentIntent.checkin}-${currentIntent.checkout}-${currentIntent.numberOfAdults}-${currentIntent.numberOfChildren}-${currentIntent.numberOfInfants}-${currentIntent.numberOfPets}`}
                stripe={stripePromise}
                // options={{
                //     clientSecret,
                // }}
                options={options}
              >
                <CardForm
                  roomId={room.listingId}
                  bookingIntent={currentIntent}
                />
              </Elements>
              {/*</div>*/}
            </div>

            {/*<button*/}
            {/*    onClick={handleSubmit}*/}
            {/*    disabled={isSubmitting}*/}
            {/*    className={cn(*/}
            {/*        "mt-6 w-full py-4 rounded-xl text-white font-bold text-base transition-all",*/}
            {/*        isSubmitting*/}
            {/*            ? "bg-zinc-300 cursor-not-allowed"*/}
            {/*            : "bg-zinc-900 hover:bg-zinc-700 active:scale-[0.99]"*/}
            {/*    )}*/}
            {/*>*/}
            {/*    {isSubmitting ? "Đang xử lý..." : "Tiếp theo"}*/}
            {/*</button>*/}
          </div>

          {/* Step 2: collapsed */}
          {/*<div className="border border-zinc-200 rounded-2xl p-6 opacity-50">*/}
          {/*    <h2 className="text-lg font-semibold text-zinc-900">*/}
          {/*        2. Xem lại lượt đặt của bạn*/}
          {/*    </h2>*/}
          {/*</div>*/}
        </div>

        {/* ── RIGHT: Summary ────────────────────────────────── */}
        <div className="lg:pt-1">
          <div className="sticky top-8 overflow-hidden rounded-3xl border border-zinc-200 bg-white shadow-[0_6px_18px_rgba(0,0,0,0.08)]">
            {/* Room info — từ API, không thể fake */}
            <div className="flex gap-4 p-6">
              <div className="relative h-24 w-28 shrink-0 overflow-hidden rounded-xl bg-zinc-100">
                {coverPhoto ? (
                  <Image
                    src={coverPhoto.photoUrl}
                    alt={room.title}
                    fill
                    className="object-cover"
                    unoptimized
                  />
                ) : (
                  <div className="w-full h-full bg-zinc-200" />
                )}
              </div>
              <div className="flex flex-col justify-center min-w-0">
                <p className="line-clamp-3 text-[15px] font-semibold leading-snug text-zinc-900">
                  {room.title}
                </p>
                <p className="mt-1 text-sm text-zinc-500">
                  {room.city}, {room.country}
                </p>
              </div>
            </div>

            {/* Non-refundable notice */}
            <div className="mx-6 rounded-xl border border-zinc-200 bg-zinc-50 px-4 py-3 text-sm leading-relaxed text-zinc-700">
              Đặt phòng/đặt chỗ này không được hoàn tiền.{" "}
              <a
                href="/help/cancellation-policy"
                className="underline font-medium hover:text-zinc-900"
              >
                Toàn bộ chính sách
              </a>
            </div>

            <div className="mx-6 border-t border-zinc-200">
              {/* Dates — từ URL params (intent), an toàn vì giá tính ở server */}
              <div className="flex items-center justify-between gap-5 py-5">
                <div>
                  <p className="text-sm font-semibold text-zinc-900">Ngày</p>
                  <p className="mt-1 text-sm text-zinc-600">
                    {formatDateRange(
                      currentIntent.checkin,
                      currentIntent.checkout,
                    )}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setDateDialogOpen(true)}
                  className="h-11 rounded-xl bg-zinc-100 px-5 text-[15px] font-semibold text-zinc-900 transition-colors hover:bg-zinc-200"
                >
                  Thay đổi
                </button>
              </div>

              {/* Guests */}
              <div className="flex items-center justify-between gap-5 border-t border-zinc-200 py-5">
                <div>
                  <p className="text-sm font-semibold text-zinc-900">Khách</p>
                  <p className="mt-1 text-sm text-zinc-600">
                    {guestSummary(currentIntent)}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setGuestDialogOpen(true)}
                  className="h-11 rounded-xl bg-zinc-100 px-5 text-[15px] font-semibold text-zinc-900 transition-colors hover:bg-zinc-200"
                >
                  Thay đổi
                </button>
              </div>
            </div>

            {/* Price breakdown — tính từ data server */}
            <div
              id="price-details"
              className="mx-6 border-t border-zinc-200 py-5"
            >
              <p className="mb-4 text-[17px] font-semibold text-zinc-900">
                Chi tiết giá
              </p>

              <div className="flex justify-between gap-5 py-1.5 text-[15px] text-zinc-600">
                <span className="underline">
                  {formatPrice(basePrice, currency)} × {nights} đêm
                </span>
                <span>{formatPrice(subtotal, currency)}</span>
              </div>

              <div className="flex justify-between gap-5 py-1.5 text-[15px] text-zinc-600">
                <span className="underline">Phí dọn dẹp</span>
                <span>{formatPrice(cleaningFee, currency)}</span>
              </div>

              <div className="flex justify-between gap-5 py-1.5 text-[15px] text-zinc-600">
                <span className="underline">
                  Phí dịch vụ ({serviceFeePercentage}%)
                </span>
                <span>{formatPrice(serviceFee, currency)}</span>
              </div>

              <div className="mt-4 flex justify-between gap-5 border-t border-zinc-200 pt-5 text-base font-semibold text-zinc-900">
                <span>Tổng {currency}</span>
                <span>{formatPrice(total, currency)}</span>
              </div>

              <a
                href="#price-details"
                className="mt-3 block text-sm font-semibold underline text-zinc-700 hover:text-zinc-900"
              >
                Chi tiết giá
              </a>
            </div>
          </div>
        </div>
      </div>

      <DateEditDialog
        open={dateDialogOpen}
        onOpenChange={setDateDialogOpen}
        value={currentIntent}
        checkInTime={checkInTime}
        onSave={handleSaveDates}
      />

      <GuestEditDialog
        open={guestDialogOpen}
        onOpenChange={setGuestDialogOpen}
        value={currentIntent}
        maxGuests={room.maxGuests}
        petsAllowed={petsAllowed}
        onSave={handleSaveGuests}
      />
    </div>
  );
}
