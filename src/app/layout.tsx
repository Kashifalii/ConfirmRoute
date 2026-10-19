import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { Toaster } from "@/components/ui/sonner";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  applicationName: "ConfirmRoute",
  title: {
    default: "ConfirmRoute | Travel Agency Booking Operations",
    template: "%s · ConfirmRoute",
  },
  description:
    "Travel agency booking management for supplier confirmations, booking review, exception tracking, and human approvals.",
  keywords: [
    "travel agency booking management",
    "travel booking operations software",
    "booking confirmation processing",
    "travel booking workflow",
    "booking exception management",
    "travel agency operations platform",
  ],
  openGraph: {
    type: "website",
    siteName: "ConfirmRoute",
    title: "ConfirmRoute | Travel Agency Booking Operations",
    description:
      "Manage supplier confirmations, review travel bookings, resolve exceptions, and keep approval decisions traceable.",
  },
  twitter: {
    card: "summary",
    title: "ConfirmRoute | Travel Agency Booking Operations",
    description:
      "Manage supplier confirmations, review travel bookings, resolve exceptions, and keep approval decisions traceable.",
  },
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">
        {children}
        <Toaster position="bottom-right" richColors closeButton />
      </body>
    </html>
  );
}
