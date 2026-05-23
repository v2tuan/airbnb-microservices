import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatDate(date: string): string {
  return new Date(date).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

export function formatDateRange(checkIn: string, checkOut: string): string {
  const inDate = new Date(checkIn);
  const outDate = new Date(checkOut);
  const inMonth = inDate.toLocaleDateString("en-US", { month: "short", day: "numeric" });
  const outMonth = outDate.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
  return `${inMonth} – ${outMonth}`;
}

export function getNights(checkIn: string, checkOut: string): number {
  const diff = new Date(checkOut).getTime() - new Date(checkIn).getTime();
  return Math.round(diff / (1000 * 60 * 60 * 24));
}

export function formatCurrency(amount: number, currency = "USD"): string {
  return new Intl.NumberFormat("en-US", { style: "currency", currency }).format(amount);
}

export function getDaysUntilCheckIn(checkIn: string): number {
  const diff = new Date(checkIn).getTime() - Date.now();
  return Math.ceil(diff / (1000 * 60 * 60 * 24));
}
