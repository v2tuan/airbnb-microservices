"use client";

import {
  Elements,
  PaymentElement,
  useElements,
  useStripe,
} from "@stripe/react-stripe-js";
import type { StripeElementsOptions } from "@stripe/stripe-js";
import { format, parseISO } from "date-fns";
import { vi } from "date-fns/locale";
import { CalendarDays, CreditCard, ShieldCheck, Users } from "lucide-react";
import Image from "next/image";
import { useState } from "react";
import { useSelector } from "react-redux";
import { checkout } from "@/api/endpoints/booking";
import type { ChatbotBookingConfirmation as ChatbotBookingConfirmationPayload } from "@/api/endpoints/chatbot";
import { Button } from "@/components/ui/button";
import { stripePromise } from "@/lib/stripe";
import type { RootState } from "@/store";
import { extractApiErrorMessage } from "@/types/api.type";

type ChatbotBookingConfirmationProps = {
  booking: ChatbotBookingConfirmationPayload;
};

type ChatbotInlinePaymentFormProps = {
  booking: ChatbotBookingConfirmationPayload;
};

const fallbackImage =
  "https://images.unsplash.com/photo-1566073771259-6a8506099945?q=80&w=1200&auto=format&fit=crop";

function formatMoney(amount: number, currency: string) {
  return new Intl.NumberFormat("vi-VN", {
    style: "currency",
    currency,
    maximumFractionDigits: 0,
  }).format(amount);
}

function formatDateRange(checkInDate: string, checkOutDate: string) {
  return `${format(parseISO(checkInDate), "d MMM", { locale: vi })} - ${format(
    parseISO(checkOutDate),
    "d MMM yyyy",
    { locale: vi },
  )}`;
}

function guestSummary(booking: ChatbotBookingConfirmationPayload) {
  const parts: string[] = [];

  if (booking.numberOfAdults > 0)
    parts.push(`${booking.numberOfAdults} người lớn`);
  if (booking.numberOfChildren > 0)
    parts.push(`${booking.numberOfChildren} trẻ em`);
  if (booking.numberOfInfants > 0)
    parts.push(`${booking.numberOfInfants} em bé`);
  if (booking.numberOfPets > 0) parts.push(`${booking.numberOfPets} thú cưng`);

  return parts.join(", ") || "1 người lớn";
}

function ChatbotInlinePaymentForm({ booking }: ChatbotInlinePaymentFormProps) {
  const stripe = useStripe();
  const elements = useElements();
  const token = useSelector((state: RootState) => state.auth.token);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async () => {
    if (!stripe || !elements) {
      setError("Form thanh toán vẫn đang tải. Vui lòng thử lại.");
      return;
    }

    setLoading(true);
    setError(null);

    try {
      // Giữ đúng logic trang checkout hiện tại:
      // chỉ khi user bấm thanh toán mới gọi /payments/checkout để tạo Booking PENDING_PAYMENT
      // và Stripe PaymentIntent.
      const response = await checkout(token, {
        roomId: booking.listingId,
        checkInDate: booking.checkInDate,
        checkOutDate: booking.checkOutDate,
        numberOfAdults: booking.numberOfAdults,
        numberOfChildren: booking.numberOfChildren,
        numberOfInfants: booking.numberOfInfants,
        numberOfPets: booking.numberOfPets,
        guestNotes: booking.guestNotes ?? undefined,
        currency: booking.currency,
      });

      const { error: submitError } = await elements.submit();
      if (submitError) {
        setError(submitError.message ?? "Thông tin thanh toán chưa hợp lệ.");
        return;
      }

      const { error: confirmError } = await stripe.confirmPayment({
        elements,
        clientSecret: response.clientSecret,
        confirmParams: {
          return_url: `${window.location.origin}/trips`,
        },
      });

      if (confirmError) {
        setError(
          confirmError.message ??
            "Thanh toán thất bại. Vui lòng kiểm tra lại thông tin thẻ.",
        );
      }
    } catch (err: unknown) {
      setError(
        extractApiErrorMessage(
          err,
          "Không thể bắt đầu thanh toán. Vui lòng thử lại.",
        ),
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-4 rounded-lg border border-neutral-200 bg-white p-4 shadow-sm">
      <div className="flex items-center gap-2 text-sm font-semibold text-neutral-950">
        <CreditCard className="size-4 text-[#006ce4]" />
        Thanh toán bằng Stripe
      </div>

      <PaymentElement />

      {error ? (
        <div className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
          {error}
        </div>
      ) : null}

      <Button
        className="h-11 w-full bg-[#ff385c] font-semibold text-white hover:bg-[#e61e4d]"
        disabled={loading || !stripe || !elements}
        onClick={handleSubmit}
        type="button"
      >
        {loading
          ? "Đang xử lý..."
          : `Xác nhận và thanh toán ${formatMoney(
              booking.estimatedTotalAmount,
              booking.currency,
            )}`}
      </Button>

      <p className="flex items-center justify-center gap-1 text-center text-xs text-neutral-500">
        <ShieldCheck className="size-3.5" />
        Thanh toán được xử lý bảo mật bởi Stripe.
      </p>
    </div>
  );
}

export default function ChatbotBookingConfirmationCard({
  booking,
}: ChatbotBookingConfirmationProps) {
  const [showPaymentForm, setShowPaymentForm] = useState(false);
  const amount = Math.max(1, Math.round(booking.estimatedTotalAmount));
  const currency = booking.currency.toLowerCase();

  const stripeOptions: StripeElementsOptions = {
    mode: "payment",
    amount,
    currency,
    appearance: {
      theme: "stripe",
    },
  };

  return (
    <div className="mt-3 w-full max-w-[92%] space-y-3">
      <div className="overflow-hidden rounded-lg border border-neutral-200 bg-white shadow-sm">
        <div className="flex gap-3 p-3">
          <div className="relative h-20 w-24 shrink-0 overflow-hidden rounded-md bg-neutral-100">
            <Image
              src={booking.imageUrl || fallbackImage}
              alt={booking.title}
              fill
              className="object-cover"
              sizes="96px"
              unoptimized
            />
          </div>

          <div className="min-w-0 flex-1">
            <p className="line-clamp-2 text-sm font-semibold leading-5 text-neutral-950">
              {booking.title}
            </p>
            <p className="mt-1 line-clamp-1 text-xs text-neutral-500">
              {booking.location}
            </p>
          </div>
        </div>

        <div className="space-y-2 border-t border-neutral-200 px-3 py-3 text-sm text-neutral-700">
          <div className="flex items-center gap-2">
            <CalendarDays className="size-4 text-neutral-500" />
            <span>
              {formatDateRange(booking.checkInDate, booking.checkOutDate)} ·{" "}
              {booking.totalNights} đêm
            </span>
          </div>
          <div className="flex items-center gap-2">
            <Users className="size-4 text-neutral-500" />
            <span>{guestSummary(booking)}</span>
          </div>
          {booking.guestNotes ? (
            <p className="rounded-md bg-neutral-50 px-3 py-2 text-xs text-neutral-600">
              Ghi chú: {booking.guestNotes}
            </p>
          ) : null}
        </div>

        <div className="border-t border-neutral-200 px-3 py-3 text-sm">
          <div className="flex justify-between py-1 text-neutral-600">
            <span>
              {formatMoney(booking.nightlyPrice, booking.currency)} x{" "}
              {booking.totalNights} đêm
            </span>
            <span>
              {formatMoney(booking.accommodationSubtotal, booking.currency)}
            </span>
          </div>
          <div className="flex justify-between py-1 text-neutral-600">
            <span>Phí dọn dẹp</span>
            <span>{formatMoney(booking.cleaningFee, booking.currency)}</span>
          </div>
          <div className="flex justify-between py-1 text-neutral-600">
            <span>Phí dịch vụ</span>
            <span>{formatMoney(booking.serviceFee, booking.currency)}</span>
          </div>
          <div className="mt-2 flex justify-between border-t border-neutral-200 pt-3 font-semibold text-neutral-950">
            <span>Tổng cộng</span>
            <span>
              {formatMoney(booking.estimatedTotalAmount, booking.currency)}
            </span>
          </div>
        </div>

        {!showPaymentForm ? (
          <div className="border-t border-neutral-200 p-3">
            <Button
              className="h-10 w-full bg-[#ff385c] font-semibold text-white hover:bg-[#e61e4d]"
              onClick={() => setShowPaymentForm(true)}
              type="button"
            >
              Xác nhận thông tin đặt phòng
            </Button>
            <p className="mt-2 text-center text-xs text-neutral-500">
              Booking chỉ được tạo khi bạn bấm thanh toán trong form Stripe.
            </p>
          </div>
        ) : null}
      </div>

      {showPaymentForm ? (
        <Elements
          key={`${booking.listingId}-${booking.checkInDate}-${booking.checkOutDate}-${amount}-${currency}`}
          options={stripeOptions}
          stripe={stripePromise}
        >
          <ChatbotInlinePaymentForm booking={booking} />
        </Elements>
      ) : null}
    </div>
  );
}
