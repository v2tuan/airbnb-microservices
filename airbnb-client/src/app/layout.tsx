import type { Metadata } from "next";
import { Figtree, Geist, Geist_Mono } from "next/font/google";
import ChatbotWidget from "@/components/chatbot/ChatbotWidget";
import { cn } from "@/lib/utils";
import { ChatbotProvider } from "@/providers/chatbot-provider";
import ModalProvider from "@/providers/ModalProvider";
import Providers from "@/providers/provider";
import "./globals.css";

const figtree = Figtree({ subsets: ["latin"], variable: "--font-sans" });

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

const siteName = "Airstay";
const siteDescription = "Airstay - Find and book stays for your next trip.";

export const metadata: Metadata = {
  title: {
    default: siteName,
    template: `%s | ${siteName}`,
  },
  applicationName: siteName,
  description: siteDescription,
  appleWebApp: {
    title: siteName,
  },
  openGraph: {
    title: siteName,
    description: siteDescription,
    siteName,
    type: "website",
  },
  twitter: {
    card: "summary",
    title: siteName,
    description: siteDescription,
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={cn("font-sans", figtree.variable)}>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        <Providers>
          <ChatbotProvider>
            <ModalProvider />
            {children}
            <ChatbotWidget />
          </ChatbotProvider>
        </Providers>
      </body>
    </html>
  );
}
